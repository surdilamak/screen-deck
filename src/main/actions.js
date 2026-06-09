// Action executor — runs the macro behind a button.
// Phase 1 actions (no native deps): app, url, path, shell, applescript.
// Phase 2 (needs a native module): keys (keystroke/hotkey simulation).
const { shell } = require('electron');
const { exec } = require('child_process');

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

// nut-js is a native module; load lazily so a load failure doesn't crash the
// whole app — only the keystroke actions degrade.
let _nut = null;
function nut() {
  if (_nut === null) {
    const n = require('@nut-tree-fork/nut-js');
    n.keyboard.config.autoDelayMs = 4;
    _nut = n;
  }
  return _nut;
}

// Map a hotkey token (e.g. "cmd", "shift", "a", "f5", "enter") to a nut-js Key.
function tokenToKey(Key, tokRaw) {
  const t = tokRaw.trim().toLowerCase();
  const mods = {
    cmd: 'LeftSuper', command: 'LeftSuper', meta: 'LeftSuper', win: 'LeftSuper', super: 'LeftSuper',
    ctrl: 'LeftControl', control: 'LeftControl',
    alt: 'LeftAlt', option: 'LeftAlt', opt: 'LeftAlt',
    shift: 'LeftShift',
  };
  const named = {
    enter: 'Return', return: 'Return', space: 'Space', tab: 'Tab',
    esc: 'Escape', escape: 'Escape', backspace: 'Backspace', delete: 'Delete', del: 'Delete',
    up: 'Up', down: 'Down', left: 'Left', right: 'Right',
    home: 'Home', end: 'End', pageup: 'PageUp', pagedown: 'PageDown',
    comma: 'Comma', period: 'Period', minus: 'Minus', equal: 'Equal',
  };
  if (mods[t]) return Key[mods[t]];
  if (named[t]) return Key[named[t]];
  if (/^[a-z]$/.test(t)) return Key[t.toUpperCase()];
  if (/^[0-9]$/.test(t)) return Key['Num' + t];
  if (/^f([1-9]|1[0-9]|2[0-4])$/.test(t)) return Key['F' + t.slice(1)];
  throw new Error(`Unknown key: "${tokRaw}"`);
}

async function sendHotkey(combo) {
  const { keyboard, Key } = nut();
  const keys = combo.split('+').map((tok) => tokenToKey(Key, tok));
  if (!keys.length) throw new Error('Empty hotkey');
  await keyboard.pressKey(...keys);
  await keyboard.releaseKey(...keys.reverse());
}

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout);
    });
  });
}

// Launch an app. `target` can be a full path (e.g. /Applications/Foo.app on macOS
// or a Start Menu .lnk on Windows — both from the App Picker) or a plain name.
async function launchApp(target) {
  // Protocol URL (e.g. steam://rungameid/440, com.app://…) → open via the OS handler.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) return shell.openExternal(target);
  const isPath = target.includes('/') || target.includes('\\') || target.endsWith('.app');
  if (isPath) {
    // Default-handler launch: .app launches, .lnk/.exe runs, folder opens. No shell quoting.
    const err = await shell.openPath(target);
    if (err) throw new Error(err);
    return;
  }
  // Bare name (typed manually)
  if (isMac) return run(`open -a ${JSON.stringify(target)}`);
  if (isWin) return run(`start "" ${JSON.stringify(target)}`);
  return run(`${JSON.stringify(target)} &`); // linux fallback
}

async function execute(action) {
  if (!action || !action.type) throw new Error('No action configured');
  const value = action.value ?? '';

  switch (action.type) {
    case 'app':
      return launchApp(value);

    case 'url': {
      const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      return shell.openExternal(url);
    }

    case 'path':
      return shell.openPath(value);

    case 'shell':
      return run(value);

    case 'applescript':
      if (!isMac) throw new Error('AppleScript only works on macOS');
      return run(`osascript -e ${JSON.stringify(value)}`);

    case 'keys':
      return sendHotkey(value);

    case 'type':
      return nut().keyboard.type(value);

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

module.exports = { execute };
