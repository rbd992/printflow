'use strict';
/**
 * PrintFlow Auto-Updater
 *
 * Uses electron-updater to pull new app versions from the NAS server.
 * The update feed URL is: http://NAS_IP:3001/updates/
 *
 * The NAS server serves the electron-builder update artifacts
 * (latest.yml + .exe / .dmg) from a static /updates folder.
 *
 * Update flow:
 *   1. App starts → checks for update in background (silent)
 *   2. Update found → notification shown in titlebar
 *   3. User clicks "Update" → downloads in background
 *   4. Download complete → prompts to restart
 *   5. Restart → new version installed
 */

const { autoUpdater } = require('electron-updater');
const { BrowserWindow, ipcMain } = require('electron');
const Store  = require('electron-store');
const logger = require('./logger');

const store = new Store();

// Silence auto-updater's own logger and use ours
autoUpdater.logger = {
  info:  (m) => logger.info(`[Updater] ${m}`),
  warn:  (m) => logger.warn(`[Updater] ${m}`),
  error: (m) => logger.error(`[Updater] ${m}`),
  debug: (m) => logger.debug(`[Updater] ${m}`),
};

autoUpdater.autoDownload    = false;   // ask user first
autoUpdater.autoInstallOnAppQuit = true;

function getMainWindow() {
  const wins = BrowserWindow.getAllWindows();
  return wins.length ? wins[0] : null;
}

function send(channel, data) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

/**
 * Initialise the updater.
 * Call after the main window is ready.
 * @param {string} serverUrl  The NAS server URL (e.g. http://192.168.1.100:3001)
 */
function initUpdater(serverUrl) {
  if (!serverUrl) {
    logger.info('[Updater] No server URL — skipping update check');
    return;
  }

  // Point electron-updater at the NAS
  autoUpdater.setFeedURL({
    provider: 'generic',
    url:      `${serverUrl.replace(/\/$/, '')}/updates/`,
  });

  // ── Event handlers ───────────────────────────────────────────

  autoUpdater.on('checking-for-update', () => {
    logger.info('[Updater] Checking for update…');
    send('updater:checking', {});
  });

  autoUpdater.on('update-available', (info) => {
    logger.info(`[Updater] Update available: ${info.version}`);
    send('updater:available', { version: info.version, releaseNotes: info.releaseNotes });
  });

  autoUpdater.on('update-not-available', () => {
    logger.info('[Updater] App is up to date');
    send('updater:not-available', {});
  });

  autoUpdater.on('download-progress', (progress) => {
    send('updater:progress', {
      percent:      Math.round(progress.percent),
      transferred:  progress.transferred,
      total:        progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info(`[Updater] Update downloaded: ${info.version}`);
    send('updater:downloaded', { version: info.version });
  });

  autoUpdater.on('error', (err) => {
    logger.error('[Updater] Error:', err.message);
    send('updater:error', { message: err.message });
  });

  // ── IPC from renderer ────────────────────────────────────────

  ipcMain.handle('updater:check', async () => {
    try { await autoUpdater.checkForUpdates(); }
    catch (err) { logger.warn('[Updater] Check failed:', err.message); }
  });

  ipcMain.handle('updater:download', async () => {
    try { await autoUpdater.downloadUpdate(); }
    catch (err) { logger.error('[Updater] Download failed:', err.message); }
  });

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // Check on startup after a short delay (don't slow down first paint)
  setTimeout(async () => {
    try { await autoUpdater.checkForUpdates(); }
    catch { /* network might not be ready */ }
  }, 15000);

  // Check every 4 hours while app is running
  setInterval(async () => {
    try { await autoUpdater.checkForUpdates(); }
    catch { }
  }, 4 * 60 * 60 * 1000);
}

module.exports = { initUpdater };
