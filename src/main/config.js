// Config persistence — stores pages of buttons as JSON in the app's userData dir.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function configPath() {
  return path.join(app.getPath('userData'), 'screen-deck-config.json');
}

function uid(prefix) {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function defaultConfig() {
  return {
    version: 2,
    grid: { cols: 5, rows: 3 },
    gap: 12,
    targetDisplayId: null, // null = auto-pick / primary
    giphyKey: '', // user's free GIPHY API key (for GIF icon search)
    pages: [
      {
        id: 'home',
        name: 'Home',
        buttons: [
          { id: uid('b'), pos: 0, label: 'Browser', icon: '🌐', color: '#2563eb',
            action: { type: 'url', value: 'https://www.google.com' } },
          { id: uid('b'), pos: 1, label: 'Finder', icon: '📁', color: '#475569',
            action: { type: 'app', value: 'Finder' } },
          { id: uid('b'), pos: 2, label: 'Copy', icon: '📋', color: '#7c3aed',
            action: { type: 'keys', value: 'cmd+c' } },
          { id: uid('b'), pos: 4, label: 'Media', icon: '🎬', color: '#0891b2',
            action: { type: 'page', value: '' } }, // folder button (set target in editor)
        ],
      },
    ],
  };
}

// Migrate a v1 (flat `buttons`) config into the v2 `pages` shape.
function migrate(cfg) {
  if (cfg && Array.isArray(cfg.buttons) && !cfg.pages) {
    cfg.pages = [{ id: 'home', name: 'Home', buttons: cfg.buttons }];
    delete cfg.buttons;
  }
  if (!cfg.pages || !cfg.pages.length) cfg.pages = defaultConfig().pages;
  cfg.version = 2;
  return cfg;
}

function load() {
  try {
    const raw = fs.readFileSync(configPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    return migrate({ ...defaultConfig(), ...parsed });
  } catch {
    const def = defaultConfig();
    save(def);
    return def;
  }
}

function save(config) {
  try {
    fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save config:', err);
    return false;
  }
}

module.exports = { load, save, configPath, defaultConfig, uid };
