const { app, BrowserWindow, ipcMain, screen, nativeImage, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const si = require('systeminformation');
const config = require('./config');
const actions = require('./actions');

let cpuName = '';
si.cpu().then((c) => { cpuName = `${c.manufacturer || ''} ${c.brand || ''}`.trim(); }).catch(() => {});

let win = null;

// Discover installed Steam games (Windows): parse libraryfolders.vdf + each
// appmanifest_*.acf. Returns { name, path: steam://rungameid/<id>, iconPath }.
function scanSteamGames() {
  const out = [];
  try {
    let root = '';
    try {
      const o = require('child_process')
        .execSync('reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath', { encoding: 'utf8' });
      const m = o.match(/SteamPath\s+REG_SZ\s+(.+)/i);
      if (m) root = m[1].trim();
    } catch { /* registry miss */ }
    if (!root) {
      for (const c of ['C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam']) {
        if (fs.existsSync(c)) { root = c; break; }
      }
    }
    if (!root) return out;
    root = root.replace(/\//g, '\\');

    const libs = new Set([root]);
    try {
      const vdf = fs.readFileSync(path.join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8');
      const re = /"path"\s*"([^"]+)"/g; let m;
      while ((m = re.exec(vdf))) libs.add(m[1].replace(/\\\\/g, '\\'));
    } catch { /* single library */ }

    const iconDir = path.join(root, 'appcache', 'librarycache');
    const seen = new Set();
    for (const lib of libs) {
      const sa = path.join(lib, 'steamapps');
      let files;
      try { files = fs.readdirSync(sa).filter((f) => /^appmanifest_\d+\.acf$/i.test(f)); } catch { continue; }
      for (const f of files) {
        try {
          const t = fs.readFileSync(path.join(sa, f), 'utf8');
          const appid = (t.match(/"appid"\s*"(\d+)"/i) || [])[1];
          const name = (t.match(/"name"\s*"([^"]+)"/i) || [])[1];
          if (!appid || !name || seen.has(appid)) continue;
          seen.add(appid);
          let iconPath;
          for (const cand of [`${appid}_icon.jpg`, `${appid}_icon.ico`, `${appid}_library_600x900.jpg`]) {
            const ip = path.join(iconDir, cand);
            if (fs.existsSync(ip)) { iconPath = ip; break; }
          }
          out.push({ name, path: `steam://rungameid/${appid}`, iconPath, type: 'game' });
        } catch { /* skip bad manifest */ }
      }
    }
  } catch { /* no steam */ }
  return out;
}

// Scan installed apps for the App Picker. macOS: .app bundles. Windows: Start
// Menu .lnk/.url shortcuts + Steam games.
function scanApps() {
  const found = new Map(); // name -> launch path
  const sorted = () => [...found.entries()]
    .map(([name, p]) => ({ name, path: p, type: 'app' }))
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
        else {
          const lower = e.name.toLowerCase();
          if (lower.endsWith('.lnk') || lower.endsWith('.url')) {
            const name = e.name.slice(0, -4);
            if (!skip.test(name) && !found.has(name)) found.set(name, full);
          }
        }
      }
    };
    roots.forEach((r) => walk(r, 0));

    // Merge in Steam games (with their icons), de-duped by name.
    const entries = sorted();
    const names = new Set(entries.map((e) => e.name));
    for (const g of scanSteamGames()) if (!names.has(g.name)) { entries.push(g); names.add(g.name); }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }

  return []; // Linux: type the command/path manually
}

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
let winFs = false;
let savedBounds = null;

// macOS: simple fullscreen (stays in same Space so clicks land on a 2nd display).
// Windows: a frameless window OVER-scanned a few px past every display edge. Native
// fullscreen leaves a ~2px white compositor line at the bottom; pushing the window
// edges just off-screen hides it while still covering the whole panel.
const OVERSCAN = 4; // px past each edge
function setDeckFullscreen(on) {
  if (!win) return false;
  if (isMac) {
    win.setSimpleFullScreen(on);
  } else if (isWin) {
    if (on) {
      savedBounds = win.getBounds();
      const b = screen.getDisplayMatching(win.getBounds()).bounds;
      win.setAlwaysOnTop(true, 'screen-saver');
      win.setBounds({
        x: b.x - OVERSCAN, y: b.y - OVERSCAN,
        width: b.width + OVERSCAN * 2, height: b.height + OVERSCAN * 2,
      });
    } else {
      win.setAlwaysOnTop(false);
      if (savedBounds) win.setBounds(savedBounds);
    }
    winFs = on;
  } else {
    win.setFullScreen(on);
  }
  win.focus();
  win.webContents.send('deck:fullscreen', isDeckFullscreen());
  return on;
}

function isDeckFullscreen() {
  if (!win) return false;
  if (isMac) return win.isSimpleFullScreen();
  if (isWin) return winFs;
  return win.isFullScreen();
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

// Returns { url, w } so callers can pick the highest-resolution icon available.
const iconThumb = async (p) => {
  try {
    const t = await nativeImage.createThumbnailFromPath(p, { width: 256, height: 256 });
    return t.isEmpty() ? null : { url: t.toDataURL(), w: t.getSize().width };
  } catch { return null; }
};
const iconFile = async (p, size) => {
  // NOTE: size 'large' crashes Electron (FATAL/SIGTRAP) on macOS — only use it on Windows.
  try {
    const i = await app.getFileIcon(p, { size });
    return i.isEmpty() ? null : { url: i.toDataURL(), w: i.getSize().width };
  } catch { return null; }
};
const biggest = (...cands) => cands.filter(Boolean).sort((a, b) => b.w - a.w)[0];

ipcMain.handle('apps:icon', async (_e, filePath) => {
  if (isWin) {
    // Resolve the Start Menu .lnk to its real target .exe.
    let target = filePath;
    if (filePath.toLowerCase().endsWith('.lnk')) {
      try { const lnk = shell.readShortcutLink(filePath); if (lnk && lnk.target) target = lnk.target; }
      catch { /* keep .lnk */ }
    }
    // Only REAL icons (a .lnk thumbnail is a generic large doc image that would
    // wrongly win on size). getFileIcon resolves .lnk to the real icon too.
    const best = biggest(
      await iconThumb(target),         // high-res app icon if the .exe embeds one
      await iconFile(target, 'large'), // real icon (smaller) from the target
      await iconFile(filePath, 'large'), // real icon resolved from the .lnk itself
    );
    return best ? best.url : '';
  }
  // macOS: QuickLook thumbnail gives the REAL icon (getFileIcon is generic there).
  const best = biggest(await iconThumb(filePath), await iconFile(filePath, 'normal'));
  return best ? best.url : '';
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

// System monitoring snapshot for the monitor page.
ipcMain.handle('sys:stats', async () => {
  const [load, speed, temp, mem, net, disks, gfx] = await Promise.all([
    si.currentLoad().catch(() => ({})),
    si.cpuCurrentSpeed().catch(() => ({})),
    si.cpuTemperature().catch(() => ({})),
    si.mem().catch(() => ({})),
    si.networkStats().catch(() => []),
    si.fsSize().catch(() => []),
    si.graphics().catch(() => ({ controllers: [] })),
  ]);
  const ctrls = (gfx && gfx.controllers) || [];
  const gpu = ctrls.find((c) => c.temperatureGpu != null || c.utilizationGpu != null)
    || ctrls.find((c) => /nvidia|geforce|rtx|gtx|radeon|amd/i.test(c.model || '')) || ctrls[0] || {};
  const n0 = (net && net[0]) || {};
  const diskList = (disks || [])
    .filter((d) => d.size > 0)
    .map((d) => ({ mount: d.mount || d.fs || '', pct: d.use != null ? Math.round(d.use) : null }))
    .sort((a, b) => a.mount.localeCompare(b.mount));
  const usedMem = mem.active || mem.used || 0;
  return {
    cpu: {
      name: cpuName,
      load: load.currentLoad ?? null,
      tempC: temp.main ?? null,
      clockMHz: speed.avg ? Math.round(speed.avg * 1000) : null,
    },
    gpu: {
      name: gpu.model || null,
      load: gpu.utilizationGpu ?? null,
      tempC: gpu.temperatureGpu ?? null,
      fan: gpu.fanSpeed ?? null,
      clockMHz: gpu.clockCore ?? null,
    },
    mem: {
      usedMB: Math.round(usedMem / 1048576),
      freeMB: Math.round((mem.available ?? mem.free ?? 0) / 1048576),
      pct: mem.total ? Math.round((usedMem / mem.total) * 100) : null,
    },
    net: {
      upKBs: n0.tx_sec != null ? n0.tx_sec / 1024 : null,
      downKBs: n0.rx_sec != null ? n0.rx_sec / 1024 : null,
    },
    disks: diskList,
  };
});

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
