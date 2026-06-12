// Renderer logic: pages, grid, taps, button editor, settings.
// `deck` is a global exposed by preload.js via contextBridge — use it directly.
// (Do NOT redeclare it with const/let — that throws "already declared".)

function showError(msg) {
  let bar = document.getElementById('errbar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'errbar';
    bar.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#7f1d1d;color:#fff;' +
      'font:12px/1.4 monospace;padding:8px 12px;white-space:pre-wrap;max-height:40%;overflow:auto;';
    document.body.appendChild(bar);
  }
  bar.textContent = 'ERROR: ' + msg;
}
window.addEventListener('error', (e) => showError(e.message + '\n' + (e.error?.stack || '')));
window.addEventListener('unhandledrejection', (e) => showError('Promise: ' + (e.reason?.message || e.reason)));

// ── Lucide-style SVG icons (DLS: no emoji as UI icons) ──
const ICON_PATHS = {
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  cpu: '<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
  gpu: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 11v2"/><path d="M9 11v2"/><circle cx="16" cy="12" r="2.5"/>',
  memory: '<path d="M6 19v-3"/><path d="M10 19v-3"/><path d="M14 19v-3"/><path d="M18 19v-3"/><path d="M9 11V9"/><path d="M15 11V9"/><path d="M2 15h20"/><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8H3Z"/>',
  wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/>',
  drive: '<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  skipForward: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>',
  skipBack: '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/>',
  square: '<rect width="16" height="16" x="4" y="4" rx="2"/>',
  volumeX: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
  volume2: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  volume1: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  keyboard: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  text: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
  arrowLeft: '<path d="m15 18-6-6 6-6"/>',
  arrowRight: '<path d="m9 18 6-6-6-6"/>',
};

// Built-in icon for an action when the user hasn't set a custom icon/image.
function defaultActionIcon(a) {
  if (!a) return null;
  if (a.type === 'media') return { playpause: 'play', next: 'skipForward', prev: 'skipBack', stop: 'square', mute: 'volumeX', volup: 'volume2', voldown: 'volume1' }[a.value] || 'play';
  if (a.type === 'volume') return 'volume2';
  if (a.type === 'system') return a.value === 'sleep' ? 'moon' : 'lock';
  if (a.type === 'sound') return 'music';
  if (a.type === 'stopsound') return 'square';
  if (a.type === 'keys') return 'keyboard';
  if (a.type === 'type') return 'text';
  if (a.type === 'shell' || a.type === 'applescript') return 'terminal';
  if (a.type === 'url') return 'globe';
  if (a.type === 'page') return 'folder';
  return null;
}

// Choices for the media / system action types (shown as a dropdown).
const CHOICES = {
  media: [['playpause', 'Play / Pause'], ['next', 'Next track'], ['prev', 'Previous track'],
    ['stop', 'Stop'], ['mute', 'Mute'], ['volup', 'Volume Up'], ['voldown', 'Volume Down']],
  system: [['lock', 'Lock screen'], ['sleep', 'Sleep']],
};
function icon(name, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}

let config = null;
let pageIndex = 0;
let editing = false;
let editingIndex = null;
let pendingImage; // undefined = keep, '' = cleared, string = new data URL
let cellPx = 120; // current computed square size of a grid button
let swiped = false; // set true when a pointer gesture was a page-swipe (suppresses tap)
let dragMoved = false; // set true when a button was drag-repositioned (suppresses tap)

const $ = (id) => document.getElementById(id);
const grid = $('grid');
const content = $('content');

const uid = (p) => p + Math.random().toString(36).slice(2, 9);
const page = () => config.pages[pageIndex];
const cellCount = () => config.grid.cols * config.grid.rows;
const buttonAt = (i) => page().buttons.find((b) => b && b.pos === i) || null;
const pageById = (id) => config.pages.findIndex((p) => p.id === id);

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ── Generic text prompt modal (Electron disables window.prompt) ──
function promptText(title, initial = '') {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML =
      `<div class="modal" style="width:340px">
         <h2>${escapeHtml(title)}</h2>
         <label>Name<input type="text" id="__pt" value="${escapeHtml(initial)}" /></label>
         <div class="modal-actions"><span class="spacer"></span>
           <button class="btn-ghost" id="__ptc">Cancel</button>
           <button class="btn-primary" id="__pto">OK</button>
         </div>
       </div>`;
    document.body.appendChild(ov);
    const input = ov.querySelector('#__pt');
    input.focus(); input.select();
    const done = (val) => { ov.remove(); resolve(val); };
    ov.querySelector('#__pto').onclick = () => done(input.value.trim() || null);
    ov.querySelector('#__ptc').onclick = () => done(null);
    input.onkeydown = (e) => { if (e.key === 'Enter') done(input.value.trim() || null); };
  });
}

// ── Page strip ──
function renderPageStrip() {
  const strip = $('pageStrip');
  strip.innerHTML = '';
  config.pages.forEach((p, i) => {
    const tab = document.createElement('button');
    tab.className = 'page-tab' + (i === pageIndex ? ' active' : '');
    tab.innerHTML = `<span>${escapeHtml(p.name)}</span>`;
    if (editing) {
      // ← move left
      if (i > 0) {
        const ml = document.createElement('span'); ml.className = 'mini';
        ml.innerHTML = icon('arrowLeft', 12); ml.title = 'Move left';
        ml.onclick = (e) => { e.stopPropagation(); movePage(i, -1); };
        tab.insertBefore(ml, tab.firstChild);
      }
      if (i === pageIndex) {
        const ren = document.createElement('span'); ren.className = 'mini'; ren.innerHTML = icon('pencil', 12);
        ren.title = 'Rename'; ren.onclick = (e) => { e.stopPropagation(); renamePage(i); };
        tab.appendChild(ren);
        if (config.pages.length > 1) {
          const del = document.createElement('span'); del.className = 'mini'; del.innerHTML = icon('trash', 12);
          del.title = 'Delete page'; del.onclick = (e) => { e.stopPropagation(); deletePage(i); };
          tab.appendChild(del);
        }
      }
      // → move right
      if (i < config.pages.length - 1) {
        const mr = document.createElement('span'); mr.className = 'mini';
        mr.innerHTML = icon('arrowRight', 12); mr.title = 'Move right';
        mr.onclick = (e) => { e.stopPropagation(); movePage(i, 1); };
        tab.appendChild(mr);
      }
    }
    tab.onclick = () => { pageIndex = i; render(); };
    strip.appendChild(tab);
  });
  if (editing) {
    const add = document.createElement('button');
    add.className = 'page-add'; add.innerHTML = icon('plus', 15); add.title = 'Add deck page';
    add.onclick = addPage;
    strip.appendChild(add);
    const addMon = document.createElement('button');
    addMon.className = 'page-add'; addMon.innerHTML = icon('cpu', 15); addMon.title = 'Add monitor page (PC stats)';
    addMon.onclick = addMonitorPage;
    strip.appendChild(addMon);
  }
  // Pure-grid display when there's a single page and we're not editing.
  document.body.classList.toggle('one-page', config.pages.length <= 1 && !editing);
}

async function addPage() {
  const name = await promptText('New page', 'Page ' + (config.pages.length + 1));
  if (!name) return;
  config.pages.push({ id: uid('p'), name, buttons: [] });
  pageIndex = config.pages.length - 1;
  await persist();
  render();
}

async function addMonitorPage() {
  const name = await promptText('New monitor page', 'Monitor');
  if (!name) return;
  config.pages.push({ id: uid('p'), name, type: 'monitor', buttons: [] });
  pageIndex = config.pages.length - 1;
  await persist();
  render();
}

async function renamePage(i) {
  const name = await promptText('Rename page', config.pages[i].name);
  if (!name) return;
  config.pages[i].name = name;
  await persist();
  render();
}

async function deletePage(i) {
  if (config.pages.length <= 1) return;
  if (!confirm(`Delete page "${config.pages[i].name}" and its buttons?`)) return;
  config.pages.splice(i, 1);
  pageIndex = Math.max(0, Math.min(pageIndex, config.pages.length - 1));
  await persist();
  render();
}

async function movePage(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= config.pages.length) return;
  [config.pages[i], config.pages[j]] = [config.pages[j], config.pages[i]];
  pageIndex = j; // follow the page we just moved
  await persist();
  render();
}

// ── Grid ──
// Compute a fixed SQUARE size for every button: take the largest size that still
// fits both the available width and height (so buttons stay 1:1, never stretched).
function sizeGrid() {
  const { cols, rows } = config.grid;
  const gap = config.gap || 12;
  const availW = grid.clientWidth - 28;   // minus 14px padding each side
  const availH = grid.clientHeight - 28;
  const size = Math.max(60, Math.floor(Math.min(
    (availW - (cols - 1) * gap) / cols,
    (availH - (rows - 1) * gap) / rows,
  )));
  cellPx = size;
  grid.style.gap = gap + 'px';
  grid.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
  grid.style.gridTemplateRows = `repeat(${rows}, ${size}px)`;
}

const DEFAULT_SCALE = 1.0; // new buttons: icon fills the card (Stream Deck style)

// Render a button's appearance into a .cell element. Shared by the grid and the
// editor's live preview. `px` is the square size of the card in pixels.
function applyButtonToCell(cell, btn, px) {
  const scale = btn.iconScale ?? DEFAULT_SCALE;
  const isFolder = btn.action && btn.action.type === 'page';
  cell.classList.toggle('folder', !!isFolder);
  cell.classList.remove('empty');
  cell.style.background = btn.transparent ? 'transparent' : (btn.color || '');
  // Volume fader: vintage 90s handle style, spans multiple cells.
  if (btn.action && btn.action.type === 'volume') {
    cell.classList.add('fader');
    const isH = (btn.spanDir || 'v') === 'h';
    if (isH) cell.classList.add('fader-h');
    const v = typeof lastVol === 'number' ? lastVol : 50;
    let fh = `<div class="fader-fill" style="${isH ? 'width' : 'height'}:${v}%"></div>`;
    fh += `<div class="fader-groove"></div>`;
    fh += `<div class="fader-handle"></div>`;
    fh += `<span class="fader-icon">${icon('volume2', 14)}</span>`;
    fh += `<span class="fader-val">${v}</span>`;
    if (btn.label) fh += `<div class="label">${escapeHtml(btn.label)}</div>`;
    fh += `<span class="badge-edit">${icon('pencil', 12)}</span>`;
    cell.innerHTML = fh;
    return;
  }

  const iconPx = Math.round(px * scale);
  let html = '<div class="icon">';
  if (btn.image) {
    const fit = btn.imageFit === 'cover' ? 'cover' : 'contain';
    const pos = btn.imagePosition || 'center';
    html += `<img src="${btn.image}" alt="" style="width:${iconPx}px;height:${iconPx}px;object-fit:${fit};object-position:${pos}">`;
  } else if (btn.icon) {
    html += `<span class="emoji" style="font-size:${Math.round(iconPx * 0.64)}px">${escapeHtml(btn.icon)}</span>`;
  } else {
    const dn = defaultActionIcon(btn.action);
    if (dn) html += `<span class="glyph">${icon(dn, Math.round(iconPx * 0.55))}</span>`;
    else html += `<span class="emoji" style="font-size:${Math.round(iconPx * 0.64)}px">▢</span>`;
  }
  html += '</div>';
  if (btn.label) html += `<div class="label">${escapeHtml(btn.label)}</div>`;
  if (isFolder) html += `<span class="badge-folder">${icon('folder', 12)}</span>`;
  html += `<span class="badge-edit">${icon('pencil', 12)}</span>`;
  cell.innerHTML = html;
}

// ── Volume fader widget ──
let lastVol = null;
let faderTimer = null, faderPending = null;
const FADER_PAD = 14, FADER_HANDLE = 42;

function setFaderPos(cell, v) {
  const isH = cell.classList.contains('fader-h');
  const fill = cell.querySelector('.fader-fill');
  const handle = cell.querySelector('.fader-handle');
  const val = cell.querySelector('.fader-val');
  if (fill) { if (isH) fill.style.width = v + '%'; else fill.style.height = v + '%'; }
  if (handle) {
    const travel = (isH ? cell.clientWidth : cell.clientHeight) - 2 * FADER_PAD - FADER_HANDLE;
    const pos = isH
      ? (v / 100) * travel + FADER_PAD
      : ((100 - v) / 100) * travel + FADER_PAD;
    handle.style[isH ? 'left' : 'top'] = pos + 'px';
  }
  if (val) val.textContent = v;
}
function commitVolume(v) { // throttle IPC (loudness spawns a process per call)
  faderPending = v;
  if (faderTimer) return;
  faderTimer = setTimeout(() => { deck.setVolume(faderPending); faderTimer = null; }, 110);
}
async function refreshVolume() {
  try {
    const a = await deck.getVolume();
    lastVol = a.volume;
    document.querySelectorAll('#grid .cell.fader').forEach((c) => setFaderPos(c, a.volume));
  } catch { /* ignore */ }
}
function setupFaderCell(cell) {
  const isH = cell.classList.contains('fader-h');
  const apply = (clientX, clientY) => {
    const r = cell.getBoundingClientRect();
    const v = isH
      ? Math.max(0, Math.min(100, Math.round((clientX - r.left) / r.width * 100)))
      : Math.max(0, Math.min(100, Math.round((1 - (clientY - r.top) / r.height) * 100)));
    lastVol = v; setFaderPos(cell, v); commitVolume(v);
  };
  cell.addEventListener('pointerdown', (e) => {
    if (editing) return;                 // edit mode → tap-to-edit / reposition
    e.preventDefault();
    try { cell.setPointerCapture(e.pointerId); } catch {}
    apply(e.clientX, e.clientY);
    const mv = (ev) => apply(ev.clientX, ev.clientY);
    const up = () => {
      cell.removeEventListener('pointermove', mv);
      cell.removeEventListener('pointerup', up);
      cell.removeEventListener('pointercancel', up);
      clearTimeout(faderTimer); faderTimer = null;
      if (faderPending != null) deck.setVolume(faderPending);
    };
    cell.addEventListener('pointermove', mv);
    cell.addEventListener('pointerup', up);
    cell.addEventListener('pointercancel', up);
  });
}

function renderGrid() {
  sizeGrid();
  grid.innerHTML = '';
  let hasFader = false;
  const { cols } = config.grid;
  const total = cellCount();

  // Which positions are consumed by a spanning cell (not the origin)
  const occupied = new Set();
  for (const btn of (page().buttons || [])) {
    if (!btn || !btn.span || btn.span <= 1) continue;
    const dir = btn.spanDir || 'v';
    for (let s = 1; s < btn.span; s++) {
      const skip = dir === 'h' ? btn.pos + s : btn.pos + s * cols;
      if (skip >= total) break;
      if (dir === 'h' && Math.floor(skip / cols) !== Math.floor(btn.pos / cols)) break;
      occupied.add(skip);
    }
  }

  for (let i = 0; i < total; i++) {
    if (occupied.has(i)) continue; // covered by spanning neighbour

    const btn = buttonAt(i);
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;

    // Explicit grid placement (1-indexed)
    const gRow = Math.floor(i / cols) + 1;
    const gCol = (i % cols) + 1;

    if (btn && btn.span > 1) {
      const dir = btn.spanDir || 'v';
      let eff = 1;
      for (let s = 1; s < btn.span; s++) {
        const next = dir === 'h' ? btn.pos + s : btn.pos + s * cols;
        if (next >= total) break;
        if (dir === 'h' && Math.floor(next / cols) !== Math.floor(btn.pos / cols)) break;
        eff++;
      }
      cell.style.gridColumn = dir === 'h' ? `${gCol} / span ${eff}` : String(gCol);
      cell.style.gridRow    = dir === 'v' ? `${gRow} / span ${eff}` : String(gRow);
    } else {
      cell.style.gridColumn = String(gCol);
      cell.style.gridRow    = String(gRow);
    }

    if (btn) {
      applyButtonToCell(cell, btn, cellPx);
      setupCellDrag(cell, i);
      if (btn.action && btn.action.type === 'volume') { setupFaderCell(cell); hasFader = true; }
    } else {
      cell.classList.add('empty');
      cell.innerHTML = `<div class="icon">${icon('plus', 26)}</div>`;
    }

    cell.addEventListener('click', () => onCellClick(i, btn));
    grid.appendChild(cell);
  }
  if (hasFader) requestAnimationFrame(() => refreshVolume());
}

// ── Drag-and-drop reposition (edit mode only) ──
function cellIndexUnder(x, y) {
  const el = document.elementFromPoint(x, y);
  const cell = el && el.closest && el.closest('#grid .cell');
  return cell && cell.dataset.index != null ? parseInt(cell.dataset.index, 10) : null;
}
function setDropTarget(idx) {
  grid.querySelectorAll('.cell.drop-target').forEach((c) => c.classList.remove('drop-target'));
  if (idx == null) return;
  const cell = grid.querySelector(`.cell[data-index="${idx}"]`);
  if (cell) cell.classList.add('drop-target');
}
async function moveButton(fromIdx, toIdx) {
  const from = buttonAt(fromIdx);
  if (!from || fromIdx === toIdx) return;
  const to = buttonAt(toIdx);
  from.pos = toIdx;
  if (to) to.pos = fromIdx; // swap with whatever was there
  await persist();
  render();
}
function setupCellDrag(cell, index) {
  cell.addEventListener('pointerdown', (e) => {
    if (!editing) return;                 // drag only in edit mode
    const startX = e.clientX, startY = e.clientY;
    let dragging = false, ghost = null;
    try { cell.setPointerCapture(e.pointerId); } catch {}

    const onMove = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) > 8) {
        dragging = true; dragMoved = true;
        ghost = cell.cloneNode(true);
        Object.assign(ghost.style, {
          position: 'fixed', zIndex: '9999', pointerEvents: 'none', margin: '0',
          width: cell.offsetWidth + 'px', height: cell.offsetHeight + 'px',
          opacity: '0.9', transform: 'scale(1.06)',
        });
        document.body.appendChild(ghost);
        cell.style.opacity = '0.25';
      }
      if (dragging) {
        ghost.style.left = (ev.clientX - cell.offsetWidth / 2) + 'px';
        ghost.style.top = (ev.clientY - cell.offsetHeight / 2) + 'px';
        setDropTarget(cellIndexUnder(ev.clientX, ev.clientY));
      }
    };
    const onUp = (ev) => {
      cell.removeEventListener('pointermove', onMove);
      cell.removeEventListener('pointerup', onUp);
      cell.removeEventListener('pointercancel', onUp);
      if (!dragging) return;
      if (ghost) ghost.remove();
      cell.style.opacity = '';
      setDropTarget(null);
      const target = cellIndexUnder(ev.clientX, ev.clientY);
      if (target != null) moveButton(index, target);
      setTimeout(() => { dragMoved = false; }, 80); // clear even if no click follows
    };
    cell.addEventListener('pointermove', onMove);
    cell.addEventListener('pointerup', onUp);
    cell.addEventListener('pointercancel', onUp);
  });
}

// Carousel commit: slide the current page out, render the target, slide it in.
// dir: +1 = next page (content moves left), -1 = previous.
let animating = false;
async function commitSwipe(startDx, dir) {
  if (animating) return;
  animating = true;
  const w = content.offsetWidth || 320;
  const ease = 'cubic-bezier(0.2,0,0,1)';
  await content.animate(
    [{ transform: `translateX(${startDx}px)` }, { transform: `translateX(${-dir * w}px)`, opacity: 0.25 }],
    { duration: 150, easing: ease },
  ).finished;
  content.style.transform = '';
  pageIndex += dir;
  render();
  await content.animate(
    [{ transform: `translateX(${dir * w}px)`, opacity: 0.25 }, { transform: 'translateX(0)', opacity: 1 }],
    { duration: 220, easing: ease },
  ).finished;
  animating = false;
}

function snapBack(dx) {
  content.animate([{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }],
    { duration: 180, easing: 'cubic-bezier(0.2,0,0,1)' });
  content.style.transform = '';
}

async function onCellClick(index, btn) {
  if (swiped) { swiped = false; return; }       // ignore tap that ends a swipe
  if (dragMoved) { dragMoved = false; return; } // ignore tap that ends a drag
  if (editing) return openEditor(index, btn);
  if (!btn) return; // empty cells are invisible + non-interactive in kiosk mode

  if (btn.action && btn.action.type === 'page') {
    const idx = pageById(btn.action.value);
    if (idx >= 0) { pageIndex = idx; render(); }
    else setStatus('Folder target not set', 'err');
    return;
  }

  if (btn.action && btn.action.type === 'volume') return; // fader handles its own drag

  if (btn.action && btn.action.type === 'sound') { // played in the renderer
    const r = playSound(btn.action.value);
    setStatus((r === 'stopped' ? 'Stopped ' : '') + (btn.label || 'Sound'), 'ok');
    setTimeout(() => setStatus('Screen Deck'), 1500);
    return;
  }
  if (btn.action && btn.action.type === 'stopsound') {
    stopAllSounds();
    setStatus('Sounds stopped', 'ok');
    setTimeout(() => setStatus('Screen Deck'), 1500);
    return;
  }

  setStatus(`Running ${btn.label || ''}…`);
  const res = await deck.runAction(btn.action);
  setStatus(res.ok ? (btn.label || 'Done') : res.error, res.ok ? 'ok' : 'err');
  setTimeout(() => setStatus('Screen Deck'), 2200);
}

function setStatus(text, state) {
  const s = $('status');
  s.textContent = text;
  s.classList.remove('ok', 'err');
  if (state) s.classList.add(state);
}

function render() {
  renderPageStrip();
  const isMon = page().type === 'monitor';
  $('grid').classList.toggle('hidden', isMon);
  $('monitor').classList.toggle('hidden', !isMon);
  if (isMon) { renderMonitor(); startMonitor(); }
  else { stopMonitor(); renderGrid(); }
}

// ── Monitor dashboard ──
let monClockTimer = null, monStatsTimer = null;
const monMetric = (k, id, withBar) =>
  `<div class="mon-metric"><div class="ml"><span class="k">${k}</span><span class="v" id="${id}">—</span></div>${withBar ? `<div class="mon-bar"><i id="${id}-bar" style="width:0%"></i></div>` : ''}</div>`;

const ALL_WIDGETS = [
  ['cpu', 'CPU'], ['gpu', 'GPU'], ['ram', 'RAM'], ['network', 'Network'], ['storage', 'Storage'],
];
const DEFAULT_WIDGETS = ['cpu', 'gpu', 'ram', 'network', 'storage'];
function monEnabled() {
  const w = page().widgets;
  return Array.isArray(w) && w.length ? w : DEFAULT_WIDGETS.slice();
}

const monCard = (ic, titleHtml, bodyHtml) =>
  `<div class="mon-card"><div class="mon-head">${icon(ic, 22)}${titleHtml}</div>${bodyHtml}</div>`;

function monCardHtml(type) {
  switch (type) {
    case 'cpu': return monCard('cpu', '<span class="mon-title" id="mon-cpu-name">CPU</span>',
      `<div class="mon-metrics">${monMetric('Load', 'mon-cpu-load', true)}${monMetric('Temperature', 'mon-cpu-temp')}${monMetric('Clock', 'mon-cpu-clock')}</div>`);
    case 'gpu': return monCard('gpu', '<span class="mon-title" id="mon-gpu-name">GPU</span>',
      `<div class="mon-metrics">${monMetric('Load', 'mon-gpu-load', true)}${monMetric('Temperature', 'mon-gpu-temp')}${monMetric('Clock', 'mon-gpu-clock')}</div>`);
    case 'ram': return monCard('memory', '<span class="mon-title">RAM</span>',
      `<div class="mon-metrics">${monMetric('Load', 'mon-ram-load', true)}${monMetric('Used', 'mon-ram-used')}${monMetric('Free', 'mon-ram-free')}</div>`);
    case 'network': return monCard('wifi', '<span class="mon-title">Network</span>',
      `<div class="mon-net"><div><span class="v" id="mon-net-down">—</span><div class="k">Down</div></div><div><span class="v" id="mon-net-up">—</span><div class="k">Up</div></div></div>`);
    case 'storage': return monCard('drive', '<span class="mon-title">Storage</span>',
      `<div class="mon-metrics" id="mon-disks"></div>`);
    default: return '';
  }
}

function renderMonitor() {
  const enabled = monEnabled();
  let html = '<div class="mon-clock" id="mon-clock">--:--</div>';
  if (editing) html += `<div class="mon-cfgbar"><button id="monCfgBtn" class="btn-ghost sm">${icon('settings', 13)}<span>Configure widgets</span></button></div>`;
  html += '<div class="mon-grid">' + enabled.map(monCardHtml).join('') + '</div>';
  $('monitor').innerHTML = html;
  if (editing) $('monCfgBtn').addEventListener('click', openMonitorConfig);
  updateClock();
  if (lastStats) applyStats(lastStats); // instant: show last-known values, no empty flash
  fetchStats();                         // then refresh
}

// Configure which monitor widgets are shown (edit mode).
function openMonitorConfig() {
  const enabled = new Set(monEnabled());
  const list = $('monCfgList');
  list.innerHTML = '';
  for (const [type, label] of ALL_WIDGETS) {
    const row = document.createElement('label');
    row.className = 'checkbox';
    row.innerHTML = `<input type="checkbox" value="${type}" ${enabled.has(type) ? 'checked' : ''}/> ${label}`;
    list.appendChild(row);
  }
  $('monCfgOverlay').classList.remove('hidden');
}
async function saveMonitorConfig() {
  const checked = [...$('monCfgList').querySelectorAll('input:checked')].map((i) => i.value);
  // Keep canonical order
  page().widgets = ALL_WIDGETS.map(([t]) => t).filter((t) => checked.includes(t));
  await persist();
  $('monCfgOverlay').classList.add('hidden');
  render();
}

function startMonitor() {
  if (!monClockTimer) monClockTimer = setInterval(updateClock, 1000);
  if (!monStatsTimer) monStatsTimer = setInterval(fetchStats, 2000);
}
function stopMonitor() {
  clearInterval(monClockTimer); clearInterval(monStatsTimer);
  monClockTimer = monStatsTimer = null;
}

function updateClock() {
  const el = $('mon-clock'); if (!el) return;
  el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const _pct = (v) => (v == null ? '—' : Math.round(v) + '%');
const _deg = (v) => (v == null ? '—' : Math.round(v) + '°C');
const _mhz = (v) => (v == null ? '—' : Math.round(v) + ' MHz');
const _kbs = (v) => (v == null ? '—' : (v >= 1024 ? (v / 1024).toFixed(1) + ' MB/s' : v.toFixed(1) + ' KB/s'));
function setTxt(id, t) { const e = $(id); if (e) e.textContent = t; }
function setBar(id, v) { const e = $(id); if (e) e.style.width = (v == null ? 0 : Math.max(0, Math.min(100, v))) + '%'; }

let lastStats = null; // cache so switching back to the monitor shows values instantly

async function fetchStats() {
  let s; try { s = await deck.getStats(); } catch { return; }
  if (page().type !== 'monitor') return; // page changed mid-fetch
  lastStats = s;
  applyStats(s);
}

function applyStats(s) {
  setTxt('mon-cpu-name', s.cpu.name || 'CPU');
  setTxt('mon-cpu-load', _pct(s.cpu.load)); setBar('mon-cpu-load-bar', s.cpu.load);
  setTxt('mon-cpu-temp', _deg(s.cpu.tempC));
  setTxt('mon-cpu-clock', _mhz(s.cpu.clockMHz));
  setTxt('mon-gpu-name', s.gpu.name || 'GPU');
  setTxt('mon-gpu-load', _pct(s.gpu.load)); setBar('mon-gpu-load-bar', s.gpu.load);
  setTxt('mon-gpu-temp', _deg(s.gpu.tempC));
  setTxt('mon-gpu-clock', _mhz(s.gpu.clockMHz));
  setTxt('mon-ram-load', _pct(s.mem.pct)); setBar('mon-ram-load-bar', s.mem.pct);
  setTxt('mon-ram-used', s.mem.usedMB + ' MB');
  setTxt('mon-ram-free', s.mem.freeMB + ' MB');
  setTxt('mon-net-down', _kbs(s.net.downKBs));
  setTxt('mon-net-up', _kbs(s.net.upKBs));
  const dz = $('mon-disks');
  if (dz) {
    dz.innerHTML = (s.disks || []).map((d) =>
      `<div class="mon-disk-row"><div class="ml"><span class="k">${escapeHtml(d.mount)}</span><span class="v">${_pct(d.pct)}</span></div><div class="mon-bar"><i style="width:${d.pct || 0}%"></i></div></div>`
    ).join('') || '<span class="k">No disks</span>';
  }
}

// ── Button editor ──
const HINTS = {
  app: 'App name, e.g. Finder / Spotify / Notes',
  url: 'https://example.com',
  path: '/Users/you/Documents  (or a file)',
  keys: 'Hotkey combo, e.g. cmd+c · ctrl+shift+t · alt+tab — or click Record',
  type: 'Text to type out automatically',
  media: 'Media key (works with most players).',
  volume: 'A slider — drag up/down on the button to set system volume.',
  system: 'System action.',
  sound: 'Pick an audio file. Press the button again to stop it.',
  stopsound: 'Stops every sound currently playing.',
  shell: 'Shell command, e.g. open -a Calculator',
  applescript: 'AppleScript, e.g. display notification "Hi"',
  page: 'Pick which page this folder button opens.',
};
const VALUE_PLACEHOLDER = {
  app: 'Finder', url: 'https://youtube.com', path: '/Users/you/Documents',
  keys: 'cmd+shift+4', type: 'Hello world!', shell: 'echo hi', applescript: 'display notification "Hi"',
};

function openEditor(index, btn) {
  editingIndex = index;
  pendingImage = undefined;
  $('editorTitle').textContent = btn ? 'Edit Button' : 'New Button';
  $('f-label').value = btn?.label || '';
  $('f-icon').value = btn?.icon || '';
  $('f-color').value = btn?.color || '#2563eb';
  $('f-type').value = btn?.action?.type || 'app';
  $('f-value').value = btn?.action?.value || '';
  const scale = Math.round((btn?.iconScale ?? DEFAULT_SCALE) * 100);
  $('f-size').value = scale;
  $('sizeVal').textContent = scale + '%';
  $('f-transparent').checked = !!btn?.transparent;
  $('f-url-reuse').checked = !!btn?.action?.reuse;
  $('f-span').value = btn?.span ?? 1;
  $('f-spanDir').value = btn?.spanDir ?? 'v';
  $('f-fit').value = btn?.imageFit === 'cover' ? 'cover' : 'contain';
  $('f-pos').value = btn?.imagePosition || 'center';
  syncFitUI();
  setImagePreview(btn?.image || '');
  populatePageSelect(btn?.action?.type === 'page' ? btn?.action?.value : '');
  $('clearBtn').style.display = btn ? 'inline-block' : 'none';
  syncTypeUI();
  if (btn?.action?.type === 'media' || btn?.action?.type === 'system') {
    populateChoice(btn.action.type, btn.action.value);
  }
  updatePreview();
  $('editorOverlay').classList.remove('hidden');
}

// Build a button-like object from the current form state (for save & preview).
function formButton() {
  const type = $('f-type').value;
  const existing = buttonAt(editingIndex);
  let value;
  if (type === 'page') value = $('f-page').value;
  else if (type === 'media' || type === 'system') value = $('f-choice').value;
  else value = $('f-value').value.trim();
  const action = { type, value };
  if (type === 'url') action.reuse = $('f-url-reuse').checked;
  const result = {
    label: $('f-label').value.trim(),
    icon: $('f-icon').value.trim(),
    image: pendingImage === undefined ? (existing?.image || '') : pendingImage,
    color: $('f-color').value,
    iconScale: parseInt($('f-size').value, 10) / 100,
    transparent: $('f-transparent').checked,
    imageFit: $('f-fit').value,
    imagePosition: $('f-pos').value,
    action,
  };
  if (type === 'volume') {
    const sp = parseInt($('f-span').value, 10);
    result.span = sp;
    if (sp > 1) result.spanDir = $('f-spanDir').value;
  }
  return result;
}

// Show the position selector only when fit = Fill (cover).
function syncFitUI() {
  $('posLabel').classList.toggle('hidden', $('f-fit').value !== 'cover');
}

function updatePreview() {
  applyButtonToCell($('btnPreview'), formButton(), 92);
}

function syncTypeUI() {
  const t = $('f-type').value;
  const isPage = t === 'page';
  const isChoice = t === 'media' || t === 'system';
  const noValue = isPage || isChoice || t === 'stopsound' || t === 'volume';
  $('valueLabel').classList.toggle('hidden', noValue);
  $('pageValueLabel').classList.toggle('hidden', !isPage);
  $('choiceLabel').classList.toggle('hidden', !isChoice);
  $('chooseAppBtn').classList.toggle('hidden', t !== 'app');
  $('browsePathBtn').classList.toggle('hidden', t !== 'path');
  $('chooseAudioBtn').classList.toggle('hidden', t !== 'sound');
  $('recordBtn').classList.toggle('hidden', t !== 'keys');
  $('urlReuseLabel').classList.toggle('hidden', t !== 'url');
  $('faderSpanRow').classList.toggle('hidden', t !== 'volume');
  if (isChoice) populateChoice(t, $('f-choice').value);
  $('f-value').placeholder = VALUE_PLACEHOLDER[t] || '';
  $('hint').textContent = HINTS[t] || '';
  updatePreview();
}

function populateChoice(type, selected) {
  const sel = $('f-choice');
  sel.innerHTML = '';
  for (const [val, label] of (CHOICES[type] || [])) {
    const o = document.createElement('option');
    o.value = val; o.textContent = label;
    if (val === selected) o.selected = true;
    sel.appendChild(o);
  }
}

// ── App picker ──
let appsCache = null;
let appFilter = 'all'; // all | app | game
const iconCache = new Map();

// Limited-concurrency icon loader — fetching all 100+ icons at once can choke
// app.getFileIcon and return blanks. Cap to a few in flight at a time.
let iconQueue = [];
let iconActive = 0;
function queueIcon(p, apply) {
  if (iconCache.has(p)) { apply(iconCache.get(p)); return; }
  iconQueue.push({ p, apply });
  pumpIcons();
}
function pumpIcons() {
  while (iconActive < 6 && iconQueue.length) {
    const { p, apply } = iconQueue.shift();
    iconActive++;
    deck.getAppIcon(p)
      .then((data) => { if (data) iconCache.set(p, data); apply(data); })
      .catch(() => apply(''))
      .finally(() => { iconActive--; pumpIcons(); });
  }
}

// Build an <img> with a JS-attached onerror (CSP-safe) for diagnostics.
function makeIconImg(src) {
  const img = document.createElement('img');
  img.alt = '';
  img.onerror = () => { img.replaceWith(Object.assign(document.createElement('div'), { className: 'ph' })); };
  img.src = src;
  return img;
}

async function openAppPicker() {
  $('appPickerOverlay').classList.remove('hidden');
  $('appSearch').value = '';
  appFilter = 'all';
  $('appList').innerHTML = '<div class="app-empty">Loading apps…</div>';
  if (!appsCache) appsCache = await deck.listApps();
  renderFilterTabs();
  renderAppList('');
  $('appSearch').focus();
}

// Show All/Apps/Games tabs only when there are games to separate.
function renderFilterTabs() {
  const bar = $('appFilter');
  const hasGames = (appsCache || []).some((a) => a.type === 'game');
  bar.classList.toggle('hidden', !hasGames);
  if (!hasGames) { appFilter = 'all'; return; }
  const tabs = [['all', 'All'], ['app', 'Apps'], ['game', 'Games']];
  bar.innerHTML = '';
  for (const [key, label] of tabs) {
    const b = document.createElement('button');
    b.className = 'seg-btn' + (appFilter === key ? ' active' : '');
    b.textContent = label;
    b.onclick = () => { appFilter = key; renderFilterTabs(); renderAppList($('appSearch').value); };
    bar.appendChild(b);
  }
}

function renderAppList(filter) {
  const list = $('appList');
  const q = filter.trim().toLowerCase();
  const items = (appsCache || []).filter((a) =>
    a.name.toLowerCase().includes(q) && (appFilter === 'all' || (a.type || 'app') === appFilter));
  iconQueue = []; // drop pending loads for the previous (now-removed) rows
  if (!items.length) {
    list.innerHTML = `<div class="app-empty">${appsCache && appsCache.length
      ? 'No matching apps.' : 'No apps found — type the app name/path manually instead.'}</div>`;
    return;
  }
  list.innerHTML = '';
  for (const a of items) {
    const row = document.createElement('div');
    row.className = 'app-item';
    const slot = document.createElement('div'); slot.className = 'ph';
    const name = document.createElement('span'); name.className = 'nm'; name.textContent = a.name;
    row.append(slot, name);
    row.onclick = () => selectApp(a);
    list.appendChild(row);
    queueIcon(a.iconPath || a.path, (data) => {
      if (!data || !row.isConnected) return;
      const ph = row.querySelector('.ph');
      if (ph) ph.replaceWith(makeIconImg(data));
    });
  }
}

async function selectApp(a) {
  $('f-value').value = a.path;
  $('appPickerOverlay').classList.add('hidden');
  // Auto-set the button icon from the app's icon (user can still override).
  const iconSrc = a.iconPath || a.path;
  const ic = iconCache.get(iconSrc) || (await deck.getAppIcon(iconSrc));
  if (ic) { iconCache.set(iconSrc, ic); pendingImage = ic; setImagePreview(ic); $('f-icon').value = ''; }
  updatePreview();
}

// Native file/folder picker for the "Open File/Folder" action.
async function openPathPicker() {
  const p = await deck.pickPath();
  if (!p) return;
  $('f-value').value = p;
  const ic = await deck.getAppIcon(p);
  if (ic) { pendingImage = ic; setImagePreview(ic); $('f-icon').value = ''; }
  updatePreview();
}

// Pick an audio file for a "Play sound" button.
async function chooseAudio() {
  const p = await deck.pickAudio();
  if (!p) return;
  $('f-value').value = p;
  updatePreview();
}

// ── Hotkey recorder ──
let recording = false;
let recordHandler = null;
function codeToToken(code) {
  let m;
  if ((m = /^Key([A-Z])$/.exec(code))) return m[1].toLowerCase();
  if ((m = /^Digit(\d)$/.exec(code))) return m[1];
  if ((m = /^Numpad(\d)$/.exec(code))) return m[1];
  if ((m = /^F(\d{1,2})$/.exec(code))) return 'f' + m[1];
  const named = {
    Space: 'space', Enter: 'enter', NumpadEnter: 'enter', Tab: 'tab', Backspace: 'backspace',
    Delete: 'delete', ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    Home: 'home', End: 'end', PageUp: 'pageup', PageDown: 'pagedown',
    Comma: 'comma', Period: 'period', Minus: 'minus', Equal: 'equal',
  };
  return named[code] || null; // null = modifier-only / unsupported
}
function toggleRecord() {
  if (recording) return stopRecord();
  recording = true;
  $('recordBtn').classList.add('armed');
  $('recordBtn').textContent = 'Press keys…';
  recordHandler = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'Escape') return stopRecord();
    const mods = [];
    if (e.ctrlKey) mods.push('ctrl');
    if (e.metaKey) mods.push('cmd');
    if (e.altKey) mods.push('alt');
    if (e.shiftKey) mods.push('shift');
    const key = codeToToken(e.code);
    if (!key) return;                 // wait for a non-modifier key
    $('f-value').value = [...mods, key].join('+');
    stopRecord();
    updatePreview();
  };
  window.addEventListener('keydown', recordHandler, true);
}
function stopRecord() {
  recording = false;
  if (recordHandler) window.removeEventListener('keydown', recordHandler, true);
  recordHandler = null;
  $('recordBtn').classList.remove('armed');
  $('recordBtn').textContent = '● Record';
}

// Soundboard playback. Pressing a playing sound again STOPS it (toggle).
const playingSounds = new Map(); // path -> Audio
function playSound(p) {
  if (!p) return;
  const existing = playingSounds.get(p);
  if (existing) { existing.pause(); existing.currentTime = 0; playingSounds.delete(p); return 'stopped'; }
  const url = 'file:///' + p.replace(/\\/g, '/').replace(/^\/+/, '');
  try {
    const a = new Audio(url);
    a.addEventListener('ended', () => playingSounds.delete(p));
    a.play().catch(() => playingSounds.delete(p));
    playingSounds.set(p, a);
  } catch { /* ignore */ }
  return 'playing';
}
function stopAllSounds() {
  for (const a of playingSounds.values()) { a.pause(); a.currentTime = 0; }
  playingSounds.clear();
}

// ── GIF picker (GIPHY) ──
let gifTimer = null;
function openGifPicker() {
  if (!config.giphyKey) {
    setStatus('Add a GIPHY API key in Settings (⚙) first', 'err');
    return;
  }
  $('gifPickerOverlay').classList.remove('hidden');
  $('gifSearch').value = '';
  searchGiphy(''); // trending
  $('gifSearch').focus();
}

async function searchGiphy(q) {
  const grid = $('gifGrid');
  grid.innerHTML = '<div class="app-empty">Loading…</div>';
  const key = config.giphyKey;
  const base = q.trim()
    ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(q)}&limit=24&rating=g&`
    : 'https://api.giphy.com/v1/gifs/trending?limit=24&rating=g&';
  try {
    const res = await fetch(`${base}api_key=${encodeURIComponent(key)}`);
    if (!res.ok) throw new Error('HTTP ' + res.status + (res.status === 401 || res.status === 403 ? ' — check your API key' : ''));
    const json = await res.json();
    const items = json.data || [];
    if (!items.length) { grid.innerHTML = '<div class="app-empty">No GIFs found.</div>'; return; }
    grid.innerHTML = '';
    for (const g of items) {
      const thumb = g.images?.fixed_width_small?.url || g.images?.preview_gif?.url;
      const full = g.images?.fixed_width?.url || thumb;
      if (!thumb) continue;
      const btn = document.createElement('button');
      btn.className = 'gif-item';
      btn.innerHTML = `<img src="${thumb}" alt="${escapeHtml(g.title || 'gif')}" loading="lazy">`;
      btn.onclick = () => pickGif(full);
      grid.appendChild(btn);
    }
  } catch (err) {
    grid.innerHTML = `<div class="app-empty">GIPHY error: ${escapeHtml(String(err.message || err))}</div>`;
  }
}

// Download the chosen GIF and store it inline (data URL) so the config stays portable.
async function pickGif(url) {
  try {
    setStatus('Downloading GIF…');
    const res = await fetch(url);
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    pendingImage = dataUrl;
    setImagePreview(dataUrl);
    $('f-icon').value = '';
    $('gifPickerOverlay').classList.add('hidden');
    setStatus('Screen Deck');
    updatePreview();
  } catch (err) {
    setStatus('GIF download failed', 'err');
  }
}

function populatePageSelect(selectedId) {
  const sel = $('f-page');
  sel.innerHTML = '';
  config.pages.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id; opt.textContent = p.name;
    if (p.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function setImagePreview(dataUrl) {
  const prev = $('imgPreview');
  if (dataUrl) { prev.classList.remove('empty'); prev.innerHTML = `<img src="${dataUrl}" alt="" />`; }
  else { prev.classList.add('empty'); prev.textContent = '—'; }
}

function onImageFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { pendingImage = reader.result; setImagePreview(pendingImage); updatePreview(); };
  reader.readAsDataURL(file);
  e.target.value = '';
}

async function saveButton() {
  const existing = buttonAt(editingIndex);
  const btn = { id: existing?.id || uid('b'), pos: editingIndex, ...formButton() };
  page().buttons = page().buttons.filter((b) => b && b.pos !== editingIndex);
  page().buttons.push(btn);
  await persist();
  $('editorOverlay').classList.add('hidden');
  render();
}

async function clearButton() {
  page().buttons = page().buttons.filter((b) => b && b.pos !== editingIndex);
  await persist();
  $('editorOverlay').classList.add('hidden');
  render();
}

// ── Settings ──
async function openSettings() {
  $('s-cols').value = config.grid.cols;
  $('s-rows').value = config.grid.rows;
  const displays = await deck.listDisplays();
  const sel = $('s-display');
  sel.innerHTML = '';
  displays.forEach((d) => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.width}×${d.height}${d.isPrimary ? ' (primary)' : ''}`;
    if (config.targetDisplayId === d.id) opt.selected = true;
    sel.appendChild(opt);
  });
  $('s-giphy').value = config.giphyKey || '';
  $('s-startfs').checked = !!config.startFullscreen;
  $('s-startup').checked = await deck.getStartup();
  $('appVersion').textContent = 'Screen Deck v' + await deck.getVersion();
  $('settingsOverlay').classList.remove('hidden');
}

async function applySettings() {
  config.grid.cols = clamp(parseInt($('s-cols').value, 10), 1, 8);
  config.grid.rows = clamp(parseInt($('s-rows').value, 10), 1, 6);
  config.giphyKey = $('s-giphy').value.trim();
  config.startFullscreen = $('s-startfs').checked;
  await deck.setStartup($('s-startup').checked);
  const displayId = parseInt($('s-display').value, 10);
  config.targetDisplayId = displayId;
  await persist();
  await deck.moveToDisplay(displayId);
  $('settingsOverlay').classList.add('hidden');
  render();
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, isNaN(n) ? lo : n));

function toggleEdit() {
  editing = !editing;
  document.body.classList.toggle('editing', editing);
  $('editToggle').classList.toggle('active', editing);
  render();
}

async function persist() { await deck.saveConfig(config); }

// Inject SVG icons into static buttons (replacing emoji).
function paintIcons() {
  $('editToggle').innerHTML = icon('pencil') + '<span>Edit</span>';
  $('fsBtn').innerHTML = icon('maximize') + '<span>Fullscreen</span>';
  $('settingsBtn').innerHTML = icon('settings');
  $('minBtn').innerHTML = icon('minus');
  $('closeBtn').innerHTML = icon('x');
  $('chooseAppBtn').innerHTML = icon('grid') + '<span>Choose App… (auto-fills name + icon)</span>';
  $('browsePathBtn').innerHTML = icon('folder') + '<span>Browse… (pick file/folder)</span>';
  $('chooseAudioBtn').innerHTML = icon('music') + '<span>Choose audio…</span>';
  $('imgUploadBtn').innerHTML = icon('upload', 13) + '<span>Upload</span>';
  $('imgGifBtn').innerHTML = icon('image', 13) + '<span>GIF</span>';
  document.querySelectorAll('.app-search-wrap').forEach((sw) => {
    if (!sw.querySelector('svg')) sw.insertAdjacentHTML('afterbegin', icon('search'));
  });
}

// ── Wire up ──
function bind() {
  paintIcons();
  $('editToggle').addEventListener('click', toggleEdit);
  $('fsBtn').addEventListener('click', () => deck.toggleFullscreen());
  $('settingsBtn').addEventListener('click', openSettings);
  $('minBtn').addEventListener('click', () => deck.minimize());
  $('closeBtn').addEventListener('click', () => deck.closeWindow());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') deck.setFullscreen(false); });
  window.addEventListener('resize', () => { if (config) sizeGrid(); });

  // Follow-finger carousel: drag the content horizontally, snap/commit on release.
  let sx = 0, sy = 0, dragging = false, hMove = false;
  content.addEventListener('pointerdown', (e) => {
    if (animating || editing) return;     // don't carousel while editing
    sx = e.clientX; sy = e.clientY; dragging = true; hMove = false; swiped = false;
    // NOTE: do NOT capture the pointer here — that would steal the `click` from
    // the buttons (broke mouse clicks). Capture only once a real drag starts.
  });
  content.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    let dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (!hMove && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      hMove = true;
      try { content.setPointerCapture(e.pointerId); } catch {}
    }
    if (!hMove) return;
    swiped = true;                         // a real drag → suppress the tap
    const n = config.pages.length;
    const atEdge = (dx > 0 && pageIndex === 0) || (dx < 0 && pageIndex === n - 1);
    if (atEdge) dx *= 0.32;                // rubber-band resistance at ends
    content.style.transform = `translateX(${dx}px)`;
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    const dx = e.clientX - sx;
    const n = config.pages.length;
    const threshold = Math.max(60, (content.offsetWidth || 320) * 0.16);
    if (dx <= -threshold && pageIndex < n - 1) commitSwipe(dx, 1);
    else if (dx >= threshold && pageIndex > 0) commitSwipe(dx, -1);
    else if (hMove) snapBack(dx);
  };
  content.addEventListener('pointerup', endDrag);
  content.addEventListener('pointercancel', endDrag);

  $('f-type').addEventListener('change', syncTypeUI);
  $('f-label').addEventListener('input', updatePreview);
  $('f-icon').addEventListener('input', updatePreview);
  $('f-color').addEventListener('input', updatePreview);
  $('f-transparent').addEventListener('change', updatePreview);
  $('f-fit').addEventListener('change', () => { syncFitUI(); updatePreview(); });
  $('f-pos').addEventListener('change', updatePreview);
  $('f-size').addEventListener('input', () => {
    $('sizeVal').textContent = $('f-size').value + '%';
    updatePreview();
  });
  $('chooseAppBtn').addEventListener('click', openAppPicker);
  $('browsePathBtn').addEventListener('click', openPathPicker);
  $('chooseAudioBtn').addEventListener('click', chooseAudio);
  $('recordBtn').addEventListener('click', toggleRecord);
  $('f-choice').addEventListener('change', updatePreview);
  deck.onUpdateStatus((msg) => setStatus(msg, 'ok'));
  deck.onFullscreen((on) => {
    document.body.classList.toggle('fullscreen', on);
    if (on && editing) { // leaving edit when entering display mode
      editing = false;
      document.body.classList.remove('editing');
      $('editToggle').classList.remove('active');
    }
    if (config) render();
  });
  $('appSearch').addEventListener('input', (e) => renderAppList(e.target.value));
  $('appPickerClose').addEventListener('click', () => $('appPickerOverlay').classList.add('hidden'));
  $('imgUploadBtn').addEventListener('click', () => $('imgFile').click());
  $('imgGifBtn').addEventListener('click', openGifPicker);
  $('gifSearch').addEventListener('input', (e) => {
    clearTimeout(gifTimer);
    const q = e.target.value;
    gifTimer = setTimeout(() => searchGiphy(q), 350);
  });
  $('gifPickerClose').addEventListener('click', () => $('gifPickerOverlay').classList.add('hidden'));
  $('monCfgSave').addEventListener('click', saveMonitorConfig);
  $('monCfgCancel').addEventListener('click', () => $('monCfgOverlay').classList.add('hidden'));
  $('imgFile').addEventListener('change', onImageFile);
  $('imgClearBtn').addEventListener('click', () => { pendingImage = ''; setImagePreview(''); updatePreview(); });
  $('saveBtn').addEventListener('click', saveButton);
  $('clearBtn').addEventListener('click', clearButton);
  $('cancelBtn').addEventListener('click', () => $('editorOverlay').classList.add('hidden'));
  $('settingsSave').addEventListener('click', applySettings);
  $('settingsCancel').addEventListener('click', () => $('settingsOverlay').classList.add('hidden'));
  $('quitBtn').addEventListener('click', () => deck.quit());
}

async function init() {
  if (typeof deck === 'undefined') {
    showError('preload.js did not load — deck API unavailable.');
    return;
  }
  try {
    bind();
    config = await deck.getConfig();
    render();
  } catch (err) {
    showError('init failed: ' + (err?.stack || err));
  }
}

init();
