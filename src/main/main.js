const { app, BrowserWindow, ipcMain, shell, nativeTheme, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const https = require('https');
const http  = require('http');

// Persistent local config
const store = new Store({
  schema: {
    serverUrl:    { type: 'string', default: '' },
    theme:        { type: 'string', default: 'dark', enum: ['dark', 'light', 'system'] },
    windowBounds: { type: 'object', default: { width: 1280, height: 800 } },
    lastUpdateCheck: { type: 'number', default: 0 },
  },
});

const isDev     = process.env.ELECTRON_START_URL || !app.isPackaged;
const START_URL = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../../build/index.html')}`;

const LAN_URL       = 'http://10.0.0.219:3001';
const TAILSCALE_URL = 'http://100.68.105.76:3001';

let mainWindow;

function createWindow() {
  const { width, height } = store.get('windowBounds');
  mainWindow = new BrowserWindow({
    width, height, minWidth: 1024, minHeight: 680,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    frame: false, backgroundColor: '#0A1628', show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
      sandbox: false, webSecurity: true, webviewTag: true,
    },
  });
  const theme = store.get('theme');
  if (theme !== 'system') nativeTheme.themeSource = theme;
  mainWindow.loadURL(START_URL);
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });
  mainWindow.on('resize', () => {
    const [w, h] = mainWindow.getSize();
    store.set('windowBounds', { width: w, height: h });
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── HTTP GET with timeout ──────────────────────────────────────────
function httpGet(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

// ── Race all server candidates simultaneously ──────────────────────
// ENETUNREACH (Tailscale off) fails instantly and doesn't block other candidates
// Returns { url, data } for the first server that responds with status 200
function findReachableServer(urlPath, timeoutMs = 5000) {
  const savedUrl = store.get('serverUrl');
  const candidates = [...new Set([savedUrl, LAN_URL, TAILSCALE_URL].filter(Boolean))];

  return new Promise((resolve) => {
    let settled = false;
    let failures = 0;

    candidates.forEach(baseUrl => {
      httpGet(`${baseUrl}${urlPath}`, timeoutMs)
        .then(res => {
          if (!settled && res.status === 200 && res.data) {
            settled = true;
            resolve({ url: baseUrl, data: res.data });
          } else {
            if (++failures === candidates.length && !settled) resolve(null);
          }
        })
        .catch(() => {
          if (++failures === candidates.length && !settled) resolve(null);
        });
    });

    // Hard safety timeout
    setTimeout(() => { if (!settled) { settled = true; resolve(null); } }, timeoutMs + 1000);
  });
}

// ── Auto-detect best server — races LAN + Tailscale simultaneously ─
ipcMain.handle('server:autoDetect', async () => {
  const result = await findReachableServer('/health', 4000);
  if (!result || result.data?.status !== 'ok') return { url: null, mode: 'none' };
  const mode = result.url.includes('100.68.105.76') ? 'tailscale' : 'lan';
  return { url: result.url, mode };
});

// ── Check for updates — races all candidates simultaneously ─────────
ipcMain.handle('updates:check', async () => {
  const currentVersion = app.getVersion();
  store.set('lastUpdateCheck', Date.now());

  const result = await findReachableServer('/updates/latest.json', 6000);

  if (!result) {
    return { error: 'Could not reach server — check your connection', currentVersion, updateAvailable: false };
  }

  const manifest = result.data;
  if (!manifest.version) {
    return { error: 'Invalid update manifest', currentVersion, updateAvailable: false };
  }

  const onTailscale = result.url.includes('100.68.105.76');
  return {
    currentVersion,
    latestVersion:   manifest.version,
    updateAvailable: compareVersions(manifest.version, currentVersion) > 0,
    releaseNotes:    manifest.releaseNotes || '',
    macUrl:   onTailscale ? (manifest.macUrlRemote || manifest.macUrl) : manifest.macUrl,
    winUrl:   onTailscale ? (manifest.winUrlRemote || manifest.winUrl) : manifest.winUrl,
    macUrlRemote: manifest.macUrlRemote || manifest.macUrl,
    winUrlRemote: manifest.winUrlRemote || manifest.winUrl,
    publishedAt:  manifest.publishedAt  || null,
    serverUsed:   result.url,
  };
});

// ── Download update ────────────────────────────────────────────────
ipcMain.handle('updates:download', async (_, downloadUrl) => {
  shell.openExternal(downloadUrl);
  return { ok: true };
});

// Get current app version
ipcMain.handle('app:getVersion', () => app.getVersion());

// Simple semver comparison
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

// ── IPC Handlers ───────────────────────────────────────────────────
ipcMain.handle('config:getServerUrl', () => store.get('serverUrl'));
ipcMain.handle('config:setServerUrl', (_, url) => { store.set('serverUrl', url); return true; });

ipcMain.handle('config:getTheme', () => store.get('theme'));
ipcMain.handle('config:setTheme', (_, theme) => {
  store.set('theme', theme);
  nativeTheme.themeSource = theme === 'system' ? 'system' : theme;
  return true;
});

ipcMain.handle('token:get', () => {
  const enc = store.get('authToken', null);
  if (!enc) return null;
  try {
    return require('electron').safeStorage.isEncryptionAvailable()
      ? require('electron').safeStorage.decryptString(Buffer.from(enc, 'base64'))
      : enc;
  } catch { return null; }
});
ipcMain.handle('token:set', (_, token) => {
  if (!token) { store.delete('authToken'); return; }
  const val = require('electron').safeStorage.isEncryptionAvailable()
    ? require('electron').safeStorage.encryptString(token).toString('base64')
    : token;
  store.set('authToken', val);
});
ipcMain.handle('token:clear', () => { store.delete('authToken'); });

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);
ipcMain.on('shell:openExternal', (_, url) => shell.openExternal(url));

// ── App lifecycle ──────────────────────────────────────────────────
app.whenReady().then(() => {
  if (!isDev) Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith(START_URL) && !url.startsWith('http://localhost')) {
      event.preventDefault();
    }
  });
});
