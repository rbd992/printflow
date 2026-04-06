# PrintFlow Session Notes — April 6, 2026

## Current App Version: 1.0.24 (building)
## Current Server: running on NAS at 10.0.0.219:3001

---

## RESOLVED THIS SESSION

### H2C Camera — WORKING ✅
- Root cause: MJPEG parser was scanning for JPEG markers across chunks (unreliable)
- Fix: Content-Length header parsing — reads exact frame size
- Fix: `createImageBitmap()` instead of blob URL for canvas drawing
- Frame counter shows next to LIVE badge

### Camera Popout — FIXED in 1.0.24 ✅
- Was using `window.open` → Windows Store prompt
- Was using `data:` URL → blank screen in Electron
- Fix: IPC `camera:popout` handler in main.js writes HTML to temp file, loads via `loadFile()`
- Temp file cleaned up on popup close

### Simultaneous Streams — FIXED in 1.0.24 ✅
- Server was killing existing stream when second connection opened for same serial
- Fix: Removed the "kill existing stream" block from camera.js route
- Both card view and popout can stream simultaneously

### Version String Sync — FIXED ✅
- deploy.bat now auto-updates AppShell.js and LoginPage.js on release
- (regex still imperfect — manual fix still occasionally needed)

### GitHub Actions — FIXED ✅
- Updated to Node.js 24 compatible versions:
  - checkout@v5, setup-node@v5, upload-artifact@v6

---

## IN PROGRESS

### Bambu Cloud Login
- Login step works: Bambu sends verification code
- Verify step: Bambu returns EMPTY body on success (not JSON with token)
- Fix baked into NAS disk: handle empty response → `needsRelogin: true` → re-login with password to get token
- Fix in server 1.0.24 deploy (currently building)
- BLOCKED: Bambu rate-limiting after many failed attempts today
- Try again in a few hours with private relay email + password
- Robert_B_Dunn@icloud.com is a SEPARATE Bambu account (different printers)

### P1S Camera — KNOWN LIMITATION
- P1S requires LAN Mode Liveview enabled on touchscreen for camera
- User wants P1S in cloud mode for printing — camera unavailable in cloud mode
- This is a Bambu hardware limitation, not a code issue
- No fix planned — document as known limitation in UI

---

## KEY FILE LOCATIONS
- Windows repo: `C:\Printflow\printflow\`
- NAS server source: `\\Synology\printflow1\server\src\`
- Deploy script: `C:\Printflow\printflow\deploy.bat`
- Camera route: `\\Synology\printflow1\server\src\routes\camera.js`
- BambuCloud service: `\\Synology\printflow1\server\src\services\bambu\BambuCloud.js`
- BambuCloud route: `\\Synology\printflow1\server\src\routes\bambuCloud.js`
- Main Electron: `C:\Printflow\printflow\src\main\main.js`
- Preload: `C:\Printflow\printflow\src\main\preload.js`
- PrintersPage: `C:\Printflow\printflow\src\renderer\pages\PrintersPage.js`

## PRINTER DB
- H2C: serial=31B8AP5C2600447, ip=10.0.0.131, access_code=02cf29d8
- P1S: serial=01P00C591102103, ip=10.0.0.43

## BAMBU ACCOUNTS
- gb5jmkhqgq@privaterelay.appleid.com — MAIN account (H2C + P1S registered here)
- Robert_B_Dunn@icloud.com — separate account, different printers

## ARCHITECTURE REMINDER
- Container bakes code at BUILD time from NAS disk
- NAS disk edits only take effect after `--no-cache` rebuild via Task Scheduler
- Hot patches (node terminal) survive until next container restart only
- GitHub Actions server workflow copies files to NAS disk but does NOT rebuild
- Task Scheduler must run after server deploy for changes to take effect
- deploy.bat: detects server/ vs src/ changes, triggers appropriate workflow(s)
