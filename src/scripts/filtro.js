// Objetivo screen
import { show, showToast, si } from './helpers.js';

let _objData = [];
let _objDataResto = [];
let _objDataViernes = [];
let _filtroBaseByCat = {viernes:'', resto:''};
const FILTRO_SUFFIXES = [
  {label:'Quitar con etiquetas', suffix:'&!#'},
  {label:'Quitar favoritos', suffix:'&!favoritos'},
  {label:'Quitar oscuros', suffix:'&!oscuro'},
  {label:'Quitar dinamax', suffix:'&!dinamax'},
  {label:'Quitar tamaños (XXS / XXL)', suffix:'&!xxs&!xxl', full:true},
];

function buildBaseFilterFromData(data, cat) {
  if (!data || !data.length) return '';
  return data
    .filter(d => !d.done && d.tradeCategory === cat)
    .map(d => {
      const eng = (window.POKEDEX?.[d.id]?.en) || window.ENG_NAMES?.[d.id];
      if (!eng) return null;
      let block = '+' + eng;
      if (d.hasDmaxCapability) {
        block += (cat === 'viernes') ? '&dynamax' : '&!dynamax';
      }
      return block;
    })
    .filter(Boolean)
    .join(',');
}

function getActiveSuffixesByCat(cat) {
  let s = '';
  document.querySelectorAll('#filtro-toggles-' + cat + ' .filtro-tog.on').forEach(btn => {
    s += btn.getAttribute('data-suffix');
  });
  return s;
}

function rebuildFiltroCat(cat) {
  const ta = document.getElementById('filtro-text-' + cat);
  if (!ta) return;
  const data = cat === 'viernes' ? _objDataViernes : _objDataResto;
  const base = _filtroBaseByCat[cat] !== undefined ? _filtroBaseByCat[cat] : buildBaseFilterFromData(data, cat);
  ta.value = base + getActiveSuffixesByCat(cat);
}

function onFiltroEdit(cat) {
  const ta = document.getElementById('filtro-text-' + cat);
  if (!ta) return;
  let txt = ta.value;
  const suffixes = getActiveSuffixesByCat(cat);
  if (suffixes && txt.endsWith(suffixes)) txt = txt.slice(0, txt.length - suffixes.length);
  _filtroBaseByCat[cat] = txt;
}

function toggleFiltroSuffix(btn) {
  const cat = btn.closest('.filtro-toggles').getAttribute('data-cat');
  onFiltroEdit(cat);
  btn.classList.toggle('on');
  rebuildFiltroCat(cat);
}

function addFiltroPokemon() {
  const input = document.getElementById('filtro-add-input');
  const val = (input.value || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!val) { showToast('Escribe un Pokémon primero'); return; }
  onFiltroEdit('resto');
  const base = _filtroBaseByCat.resto || '';
  _filtroBaseByCat.resto = base ? (base + ',+' + val) : ('+' + val);
  input.value = '';
  rebuildFiltroCat('resto');
}

function copyFiltroFinal(cat) {
  const ta = document.getElementById('filtro-text-' + cat);
  const text = ta ? ta.value : '';
  if (!text) { showToast('El filtro está vacío'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast('Copiado al portapapeles'))
      .catch(() => _copyFallback(text));
  } else {
    _copyFallback(text);
  }
}

function _copyFallback(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); showToast('✅ Filtro copiado'); }
  catch(e) { showToast('Error al copiar'); }
  document.body.removeChild(ta);
}

function getTradeWithStorageKey() {
  return 'pbcn_tradeWith_' + window.ST?.cur;
}

function getSavedTradeWith() {
  try { return localStorage.getItem(getTradeWithStorageKey()) || ''; } catch(e) { return ''; }
}

function saveTradeWith(name) {
  try { localStorage.setItem(getTradeWithStorageKey(), name); } catch(e) {}
}

function populateTradeWithSelects(selectedName) {
  const names = (window.ST?.profiles || []).map(p => p.name).filter(n => n !== window.ST?.cur);
  const optsHtml = '<option value="">Selecciona un entrenador...</option>' +
    names.map(n => `<option value="${n}"${n===selectedName?' selected':''}>${n}</option>`).join('');
  const selInitial = document.getElementById('filtro-trade-with-select-initial');
  const selTop = document.getElementById('filtro-trade-with-select');
  if (selInitial) selInitial.innerHTML = optsHtml;
  if (selTop) selTop.innerHTML = optsHtml;
}

function loadViernesForTrainer(name) {
  if (!name) {
    document.getElementById('filtro-viernes-locked').style.display = 'block';
    document.getElementById('filtro-viernes-unlocked').style.display = 'none';
    document.getElementById('filtro-trade-with-label').style.display = 'none';
    return;
  }
  _objDataViernes = window.buildObjetivoData?.(name) || [];
  delete _filtroBaseByCat.viernes;
  document.querySelectorAll('#filtro-toggles-viernes .filtro-tog').forEach(b => b.classList.remove('on'));
  rebuildFiltroCat('viernes');

  document.getElementById('filtro-viernes-locked').style.display = 'none';
  document.getElementById('filtro-viernes-unlocked').style.display = 'block';
  document.getElementById('filtro-trade-with-label').style.display = 'block';
  document.getElementById('filtro-trade-with-name').textContent = name;
}

function onTradeWithInitialSelect() {
  const name = document.getElementById('filtro-trade-with-select-initial').value;
  if (!name) return;
  saveTradeWith(name);
  loadViernesForTrainer(name);
}

function onTradeWithChange() {
  const name = document.getElementById('filtro-trade-with-select').value;
  if (!name) return;
  saveTradeWith(name);
  loadViernesForTrainer(name);
  toggleTradeWithDropdown();
}

function toggleTradeWithDropdown() {
  const sel = document.getElementById('filtro-trade-with-select');
  const isOpen = sel.style.display === 'block';
  sel.style.display = isOpen ? 'none' : 'block';
}

export function openFiltro() {
  renderFiltroToggles();

  _objDataResto = window.buildObjetivoData?.(window.ST?.cur) || [];
  delete _filtroBaseByCat.resto;
  document.querySelectorAll('#filtro-toggles-resto .filtro-tog').forEach(b => b.classList.remove('on'));
  rebuildFiltroCat('resto');

  const savedName = getSavedTradeWith();
  populateTradeWithSelects(savedName);
  loadViernesForTrainer(savedName);

  show('filtro-screen');
  document.getElementById('home-menu').style.display = 'none';
  window.scrollTo(0, 0);
}

export function closeFiltro() {
  import('./objetivo.js').then(m => m.openObjetivo());
}

function renderFiltroToggles() {
  ['viernes','resto'].forEach(cat => {
    const el = document.getElementById('filtro-toggles-' + cat);
    if (!el) return;
    el.innerHTML = FILTRO_SUFFIXES.map(s => 
      `<button class="filtro-tog" data-suffix="${s.suffix}" onclick="toggleFiltroSuffix(this)"${s.full?' style="grid-column:1/-1"':''}>${s.label}</button>`
    ).join('');
  });
}

// Expose globals
window.toggleFiltroSuffix = toggleFiltroSuffix;
window.addFiltroPokemon = addFiltroPokemon;
window.copyFiltroFinal = copyFiltroFinal;
window.onFiltroEdit = onFiltroEdit;
window.onTradeWithInitialSelect = onTradeWithInitialSelect;
window.onTradeWithChange = onTradeWithChange;
window.toggleTradeWithDropdown = toggleTradeWithDropdown;
window.openFiltro = openFiltro;
window.closeFiltro = closeFiltro;