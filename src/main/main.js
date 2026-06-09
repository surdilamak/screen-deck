const { app, BrowserWindow, ipcMain, screen, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const config = require('./config');
const actions = require('./actions');

let win = null;

// Scan installed apps for the App Picker. macOS: .app bundles. Windows: Start
// Menu .lnk shortcuts (all-users + current-user, recursive).
function scanApps() {
  const found = new Map(); // name -> launch path
  const sorted = () => [...found.entries()]
    .map(([name, p]) => ({ name, path: p }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (process.platform === 'darwin') {
    const roots = [
      '/Applications', '/System/Applications', '/System/Applications/Utilities',
      path.join(os.homedir(), 'Applications'),
    ];
    const add = (p) => {
      if (!p.endsWith('.app')) return;
      const name = path.basename(p, '.app');
      if (!found.has(name)) found.set(name, p);
    };
    for (const root of roots) {
      let entries;
      try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { continue; }
      for (const e of entries) {
        const full = path.join(root, e.name);
        if (e.name.endsWith('.app')) add(full);
        else if (e.isDirectory()) {
          try { for (const sub of fs.readdirSync(full)) if (sub.endsWith('.app')) add(path.join(full, sub)); }
          catch { /* ignore */ }
        }
      }
    }
    return sorted();
  }

  if (process.platform === 'win32') {
    const roots = [
      path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    ].filter(Boolean);
    const skip = /^(uninstall|setup|readme|help|website|home page|visit )/i;
    const walk = (dir, depth) => {
      if (depth > 4) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full, depth + 1);
        else if (e.name.toLowerCase().endsWith('.lnk')) {
          const name = e.name.slice(0, -4);
          if (!skip.test(name) && !found.has(name)) found.set(name, full);
        }
      }
    };
    roots.forEach((r) => walk(r, 0));
    return sorted();
  }

  return []; // Linux: type the command/path manually
}

const isMac = process.platform === 'darwin';

// On macOS, native fullscreen moves the window to a separate Space, which on a
// secondary display makes mouse clicks miss the window. "Simple fullscreen"
// covers the screen while staying in the same Space, so clicks work normally.
function setDeckFullscreen(on) {
  if (!win) return false;
  if (isMac) win.setSimpleFullScreen(on);
  else win.setFullScreen(on);
  win.focus();
  // Tell the renderer so it can switch between display (clean) and edit chrome.
  win.webContents.send('deck:fullscreen', isDeckFullscreen());
  return on;
}

function isDeckFullscreen() {
  if (!win) return false;
  return isMac ? win.isSimpleFullScreen() : win.isFullScreen();
}

// Pick which display to show the deck on.
// Priority: configured display id → an external ~1024x600 panel → primary.
function pickDisplay(targetId) {
  const displays = screen.getAllDisplays();
  if (targetId != null) {
    const found = displays.find((d) => d.id === targetId);
    if (found) return found;
  }
  const primaryId = screen.getPrimaryDisplay().id;
  // Heuristic: prefer a non-primary display close to 1024x600.
  const touch = displays
    .filter((d) => d.id !== primaryId)
    .find((d) => d.size.width <= 1280 && d.size.height <= 800);
  return touch || screen.getPrimaryDisplay();
}

function createWindow() {
  const cfg = config.load();
  const display = pickDisplay(cfg.targetDisplayId);
  const { x, y, width, height } = display.bounds;

  // Start as a normal, movable, clickable window — NOT fullscreen.
  // (Fullscreen on the MacBook hides the toolbar under the menu bar/notch.)
  // The user picks the touch monitor in Settings, then we fullscreen there.
  const startW = Math.min(1024, width - 80);
  const startH = Math.min(600, height - 120);
  win = new BrowserWindow({
    x: x + 40,
    y: y + 60,
    width: startW,
    height: startH,
    frame: false,          // no OS title bar — our toolbar is the drag handle
    fullscreen: false,
    resizable: true,
    backgroundColor: '#0c0d10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Avoid serving a stale cached app.js/style.css across restarts.
  win.webContents.session.clearCache().finally(() => {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  });

  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

// ---- IPC ----
ipcMain.handle('config:get', () => config.load());

ipcMain.handle('config:save', (_e, cfg) => {
  const ok = config.save(cfg);
  return ok;
});

ipcMain.handle('action:run', async (_e, action) => {
  try {
    await actions.execute(action);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('displays:list', () => {
  const primaryId = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    width: d.size.width,
    height: d.size.height,
    isPrimary: d.id === primaryId,
    label: d.label || `Display ${d.id}`,
  }));
});

// Move the deck window onto a chosen display, fullscreen it, persist the choice.
ipcMain.handle('window:moveToDisplay', (_e, displayId) => {
  const cfg = config.load();
  cfg.targetDisplayId = displayId;
  config.save(cfg);
  const display = pickDisplay(displayId);
  if (win) {
    setDeckFullscreen(false);
    win.setBounds(display.bounds);
    setDeckFullscreen(true);
  }
  return { ok: true };
});

ipcMain.handle('window:setFullscreen', (_e, on) => {
  setDeckFullscreen(!!on);
  return { ok: true, fullscreen: isDeckFullscreen() };
});

ipcMain.handle('window:toggleFullscreen', () => {
  setDeckFullscreen(!isDeckFullscreen());
  return { ok: true, fullscreen: isDeckFullscreen() };
});

ipcMain.handle('apps:list', () => {
  try { return scanApps(); } catch { return []; }
});

ipcMain.handle('apps:icon', async (_e, filePath) => {
  // OS thumbnail service: QuickLook (macOS) gives the REAL app icon (getFileIcon is
  // generic there). On Windows, getFileIcon resolves .lnk/.exe icons reliably.
  const viaThumb = async () => {
    try {
      const t = await nativeImage.createThumbnailFromPath(filePath, { width: 128, height: 128 });
      return t.isEmpty() ? '' : t.toDataURL();
    } catch { return ''; }
  };
  const viaFileIcon = async () => {
    // NOTE: size 'large' crashes Electron (FATAL/SIGTRAP) on macOS — use 'normal'.
    try {
      const i = await app.getFileIcon(filePath, { size: 'normal' });
      return i.isEmpty() ? '' : i.toDataURL();
    } catch { return ''; }
  };
  if (process.platform === 'win32') return (await viaFileIcon()) || (await viaThumb());
  return (await viaThumb()) || (await viaFileIcon());
});

// Native file/folder picker for the "Open File/Folder" action.
ipcMain.handle('dialog:pickPath', async () => {
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'openDirectory'],
    message: 'Choose a file or folder to open',
  });
  return res.canceled || !res.filePaths.length ? '' : res.filePaths[0];
});

ipcMain.handle('window:minimize', () => { if (win) win.minimize(); });
ipcMain.handle('window:close', () => { if (win) win.close(); });

ipcMain.handle('app:quit', () => app.quit());

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
