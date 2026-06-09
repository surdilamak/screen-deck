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
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
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

const $ = (id) => document.getElementById(id);
const grid = $('grid');

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
    if (editing && i === pageIndex) {
      const ren = document.createElement('span'); ren.className = 'mini'; ren.innerHTML = icon('pencil', 12);
      ren.title = 'Rename'; ren.onclick = (e) => { e.stopPropagation(); renamePage(i); };
      tab.appendChild(ren);
      if (config.pages.length > 1) {
        const del = document.createElement('span'); del.className = 'mini'; del.innerHTML = icon('trash', 12);
        del.title = 'Delete page'; del.onclick = (e) => { e.stopPropagation(); deletePage(i); };
        tab.appendChild(del);
      }
    }
    tab.onclick = () => { pageIndex = i; render(); };
    strip.appendChild(tab);
  });
  if (editing) {
    const add = document.createElement('button');
    add.className = 'page-add'; add.innerHTML = icon('plus', 15); add.title = 'Add page';
    add.onclick = addPage;
    strip.appendChild(add);
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

const DEFAULT_SCALE = 0.9;

// Render a button's appearance into a .cell element. Shared by the grid and the
// editor's live preview. `px` is the square size of the card in pixels.
function applyButtonToCell(cell, btn, px) {
  const scale = btn.iconScale ?? DEFAULT_SCALE;
  const isFolder = btn.action && btn.action.type === 'page';
  cell.classList.toggle('folder', !!isFolder);
  cell.classList.remove('empty');
  cell.style.background = btn.transparent ? 'transparent' : (btn.color || '');
  const iconPx = Math.round(px * scale);
  let html = '<div class="icon">';
  if (btn.image) {
    html += `<img src="${btn.image}" alt="" style="width:${iconPx}px;height:${iconPx}px">`;
  } else {
    html += `<span class="emoji" style="font-size:${Math.round(iconPx * 0.64)}px">${escapeHtml(btn.icon || '▢')}</span>`;
  }
  html += '</div>';
  if (btn.label) html += `<div class="label">${escapeHtml(btn.label)}</div>`;
  if (isFolder) html += `<span class="badge-folder">${icon('folder', 12)}</span>`;
  html += `<span class="badge-edit">${icon('pencil', 12)}</span>`;
  cell.innerHTML = html;
}

function renderGrid() {
  sizeGrid();
  grid.innerHTML = '';

  for (let i = 0; i < cellCount(); i++) {
    const btn = buttonAt(i);
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;

    if (btn) {
      applyButtonToCell(cell, btn, cellPx);
    } else {
      cell.classList.add('empty');
      cell.innerHTML = `<div class="icon">${icon('plus', 26)}</div>`;
    }

    cell.addEventListener('click', () => onCellClick(i, btn));
    grid.appendChild(cell);
  }
}

async function onCellClick(index, btn) {
  if (editing) return openEditor(index, btn);
  if (!btn) return openEditor(index, null);

  if (btn.action && btn.action.type === 'page') {
    const idx = pageById(btn.action.value);
    if (idx >= 0) { pageIndex = idx; render(); }
    else setStatus('Folder target not set', 'err');
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

function render() { renderPageStrip(); renderGrid(); }

// ── Button editor ──
const HINTS = {
  app: 'App name, e.g. Finder / Spotify / Notes',
  url: 'https://example.com',
  path: '/Users/you/Documents  (or a file)',
  keys: 'Hotkey combo, e.g. cmd+c · ctrl+shift+t · alt+tab · cmd+space',
  type: 'Text to type out automatically',
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
  setImagePreview(btn?.image || '');
  populatePageSelect(btn?.action?.type === 'page' ? btn?.action?.value : '');
  $('clearBtn').style.display = btn ? 'inline-block' : 'none';
  syncTypeUI();
  updatePreview();
  $('editorOverlay').classList.remove('hidden');
}

// Build a button-like object from the current form state (for save & preview).
function formButton() {
  const type = $('f-type').value;
  const existing = buttonAt(editingIndex);
  return {
    label: $('f-label').value.trim(),
    icon: $('f-icon').value.trim(),
    image: pendingImage === undefined ? (existing?.image || '') : pendingImage,
    color: $('f-color').value,
    iconScale: parseInt($('f-size').value, 10) / 100,
    transparent: $('f-transparent').checked,
    action: { type, value: type === 'page' ? $('f-page').value : $('f-value').value.trim() },
  };
}

function updatePreview() {
  applyButtonToCell($('btnPreview'), formButton(), 108);
}

function syncTypeUI() {
  const t = $('f-type').value;
  const isPage = t === 'page';
  $('valueLabel').classList.toggle('hidden', isPage);
  $('pageValueLabel').classList.toggle('hidden', !isPage);
  $('chooseAppBtn').classList.toggle('hidden', t !== 'app');
  $('browsePathBtn').classList.toggle('hidden', t !== 'path');
  $('f-value').placeholder = VALUE_PLACEHOLDER[t] || '';
  $('hint').textContent = HINTS[t] || '';
  updatePreview();
}

// ── App picker ──
let appsCache = null;
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
  $('appList').innerHTML = '<div class="app-empty">Loading apps…</div>';
  if (!appsCache) appsCache = await deck.listApps();
  renderAppList('');
  $('appSearch').focus();
}

function renderAppList(filter) {
  const list = $('appList');
  const q = filter.trim().toLowerCase();
  const items = (appsCache || []).filter((a) => a.name.toLowerCase().includes(q));
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
    queueIcon(a.path, (data) => {
      if (!data || !row.isConnected) return;
      const ph = row.querySelector('.ph');
      if (ph) ph.replaceWith(makeIconImg(data));
    });
  }
}

async function selectApp(a) {
  $('f-value').value = a.path;
  if (!$('f-label').value.trim()) $('f-label').value = a.name;
  $('appPickerOverlay').classList.add('hidden');
  // Auto-set the button icon from the app's icon (user can still override).
  const ic = iconCache.get(a.path) || (await deck.getAppIcon(a.path));
  if (ic) { iconCache.set(a.path, ic); pendingImage = ic; setImagePreview(ic); $('f-icon').value = ''; }
  updatePreview();
}

// Native file/folder picker for the "Open File/Folder" action.
async function openPathPicker() {
  const p = await deck.pickPath();
  if (!p) return;
  $('f-value').value = p;
  if (!$('f-label').value.trim()) $('f-label').value = p.split('/').filter(Boolean).pop() || p;
  const ic = await deck.getAppIcon(p);
  if (ic) { pendingImage = ic; setImagePreview(ic); $('f-icon').value = ''; }
  updatePreview();
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
  $('settingsOverlay').classList.remove('hidden');
}

async function applySettings() {
  config.grid.cols = clamp(parseInt($('s-cols').value, 10), 1, 8);
  config.grid.rows = clamp(parseInt($('s-rows').value, 10), 1, 6);
  config.giphyKey = $('s-giphy').value.trim();
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
  renderPageStrip();
}

async function persist() { await deck.saveConfig(config); }

// Inject SVG icons into static buttons (replacing emoji).
function paintIcons() {
  $('editToggle').innerHTML = icon('pencil') + '<span>Edit</span>';
  $('fsBtn').innerHTML = icon('maximize') + '<span>Fullscreen</span>';
  $('settingsBtn').innerHTML = icon('settings');
  $('chooseAppBtn').innerHTML = icon('grid') + '<span>Choose App… (auto-fills name + icon)</span>';
  $('browsePathBtn').innerHTML = icon('folder') + '<span>Browse… (pick file/folder)</span>';
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
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') deck.setFullscreen(false); });
  window.addEventListener('resize', () => { if (config) sizeGrid(); });

  $('f-type').addEventListener('change', syncTypeUI);
  $('f-label').addEventListener('input', updatePreview);
  $('f-icon').addEventListener('input', updatePreview);
  $('f-color').addEventListener('input', updatePreview);
  $('f-transparent').addEventListener('change', updatePreview);
  $('f-size').addEventListener('input', () => {
    $('sizeVal').textContent = $('f-size').value + '%';
    updatePreview();
  });
  $('chooseAppBtn').addEventListener('click', openAppPicker);
  $('browsePathBtn').addEventListener('click', openPathPicker);
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
