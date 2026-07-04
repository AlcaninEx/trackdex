// Objetivo screen
import { show, showToast, si } from './helpers.js';
import { gp, goc, albumPks } from './state.js';
import { save } from './storage.js';
import { inferTags, getEff, renderBadges } from './helpers.js';

let _objData = [];

const LEGENDARY_IDS = new Set(['10169', '10170', '10171', '144', '145', '146', '150', '151', '243', '244', '245', '249', '250', '251', '377', '378', '379', '380', '381', '382', '383', '384', '385', '386', '480', '481', '482', '483', '484', '486', '487', '489', '490', '491', '492', '493', '494', '638', '639', '640', '641', '642', '643', '644', '645', '646', '647', '648', '649', '716', '717', '718', '719', '720', '721', '785', '786', '787', '788', '789', '790', '791', '792', '793', '794', '795', '796', '797', '798', '799', '800', '801', '802', '803', '804', '805', '806', '807', '888', '889', '890', '891', '892', '893', '894', '895', '896', '897', '898', '905', '807']);

function isMaxed(id, p) { return !!(p.pk && p.pk[id] && p.pk[id].maxed); }
function isOwned(id, p) { return !!(p.pk && p.pk[id] && p.pk[id].owned); }

export function buildObjetivoData(profileName) {
  const p = gp(profileName);
  if (!p || !p.album) return [];

  const tradeAnyDay = (p.tradeAnyDay) || {};

  const byEvo = {};
  for (const id in p.album) {
    if (p.album[id] !== true) continue;
    const isDmaxSlot = id.includes('-dmax-');
    const pkName = getPkName(id, p);
    if (!pkName) continue;
    const evo = getEvoKey(pkName);
    if (!evo) continue;
    if (LEGENDARY_IDS.has(evo.id)) continue;
    const key = evo.id;
    if (!byEvo[key]) byEvo[key] = {n: evo.n, id: evo.id, raidDmax: [], raidShadow: [], raidPurified: [], raidNormal: [], dmaxEntries: [], totalCopies: 0, maxedCopies: 0};
    const bucket = byEvo[key];
    bucket.totalCopies++;
    if (isMaxed(id, p)) bucket.maxedCopies++;

    const entry = {id, maxed: isMaxed(id, p), owned: isOwned(id, p)};
    if (isDmaxSlot) bucket.dmaxEntries.push(entry);
    else if (isPurifiedEntry(id, p)) bucket.raidPurified.push(entry);
    else if (isShadowEntry(id, p)) bucket.raidShadow.push(entry);
    else if (hasDmaxTag(id, p)) bucket.raidDmax.push(entry);
    else bucket.raidNormal.push(entry);
  }

  const results = [];
  for (const key in byEvo) {
    const e = byEvo[key];
    const pend = arr => arr.filter(x => !x.maxed).length;
    const raidNormalP = pend(e.raidNormal);
    const raidDmaxP = pend(e.raidDmax);
    const raidShadowP = pend(e.raidShadow);
    const raidPurifP = pend(e.raidPurified);
    const dmaxP = pend(e.dmaxEntries);

    const sharedDmax = Math.min(dmaxP, raidDmaxP);
    const newDmax = Math.max(0, dmaxP - raidDmaxP);

    const normal = raidNormalP + raidDmaxP + newDmax;
    const shadow = raidShadowP;
    const purified = raidPurifP;
    const dmaxSkills = dmaxP;

    const pendingCount = normal + shadow + purified;
    const done = (pendingCount === 0 && dmaxSkills === 0);

    const normalTypeEntries = [...e.raidNormal, ...e.raidDmax];
    const needsGoodBase = normalTypeEntries.some(x => !x.owned);
    let tradeCategory = needsGoodBase ? 'viernes' : 'resto';
    if (tradeAnyDay[key]) tradeCategory = 'resto';

    const hasDmaxCapability = e.raidDmax.length > 0 || e.dmaxEntries.length > 0;

    const CANDY = {normal:{c:250,xl:296}, shadow:{c:298,xl:360}, purified:{c:220,xl:268}, dmaxSkill:{c:350,xl:120}};
    const totalC = normal*CANDY.normal.c + shadow*CANDY.shadow.c + purified*CANDY.purified.c + dmaxSkills*CANDY.dmaxSkill.c;
    const totalXL = normal*CANDY.normal.xl + shadow*CANDY.shadow.xl + purified*CANDY.purified.xl + dmaxSkills*CANDY.dmaxSkill.xl;

    results.push({
      n: e.n, id: key,
      count: pendingCount,
      normal, shadow, purified,
      dmaxSkills, sharedDmax, newDmax,
      done,
      totalCopies: e.totalCopies,
      maxedCopies: e.maxedCopies,
      tradeCategory,
      forcedAnyDay: !!tradeAnyDay[key],
      hasDmaxCapability,
      totalC, totalXL
    });
  }

  const candyProgress = p.candyProgress || {};
  return results.sort((a,b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pa = candyProgress[a.id] || {c:0, xl:0};
    const pb = candyProgress[b.id] || {c:0, xl:0};
    const wa = Math.max(0, a.totalC - pa.c) + Math.max(0, a.totalXL - pa.xl);
    const wb = Math.max(0, b.totalC - pb.c) + Math.max(0, b.totalXL - pb.xl);
    return wb - wa || a.n.localeCompare(b.n);
  });
}

function getEvoKey(rawName) {
  let n = rawName.toLowerCase()
    .replace(/\(shadow\)/g, '').replace(/^shadow /, '')
    .replace(/^g-/, '').replace(/^d-/, '')
    .replace(/^g /, '').replace(/^d /, '')
    .trim();
  let id = window.NAME_TO_ID?.[n];
  if (!id) { n = n.replace(/^mega /, '').replace(/^primal /, '').trim(); id = window.NAME_TO_ID?.[n]; }
  if (!id) return null;
  const p = window.POKEDEX?.[id];
  return { n: p ? p.es : rawName, id: id, en: p ? p.en : null };
}

function isShadowEntry(id, p) {
  if (id.includes('shadow')) return true;
  if (p.custom && p.custom[id] && p.custom[id].tags && p.custom[id].tags.includes('shadow')) return true;
  const pd = window.PD?.find(x => x.id === id);
  if (pd && pd.tags && pd.tags.includes('shadow')) return true;
  return false;
}

function isPurifiedEntry(id, p) {
  if (p.custom && p.custom[id] && p.custom[id].tags && p.custom[id].tags.includes('purified')) return true;
  const pd = window.PD?.find(x => x.id === id);
  if (pd && pd.tags && pd.tags.includes('purified')) return true;
  return false;
}

function getPkName(id, p) {
  if (p.custom && p.custom[id] && p.custom[id].n) return p.custom[id].n;
  const pd = window.PD?.find(x => x.id === id);
  if (pd) return pd.name;
  const m = id.match(/^[a-z]+-ext-(.+?)(?:-\d+)?$/);
  if (m) return m[1].replace(/-/g, ' ');
  const m2 = id.match(/^[a-z]+-dmax-(.+?)(?:-\d+)?$/);
  if (m2) return m2[1].replace(/-/g, ' ');
  return '';
}

function hasDmaxTag(id, p) {
  if (p.custom && p.custom[id] && p.custom[id].tags) return p.custom[id].tags.includes('dynamax');
  const pd = window.PD?.find(x => x.id === id);
  if (pd && pd.tags) return pd.tags.includes('dynamax');
  return false;
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
  _objDataViernes = buildObjetivoData(name);
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

export function openObjetivo() {
  if (!window.ST?.cur) { showToast('Selecciona un entrenador primero'); return; }
  const data = buildObjetivoData(window.ST.cur);
  const bar = document.getElementById('obj-trainer-bar');
  const grid = document.getElementById('obj-grid');
  bar.innerHTML = '👤 <b>' + window.ST.cur + '</b> &nbsp;·&nbsp; ' + data.length + ' Pokémon iniciales &nbsp;·&nbsp; ordenados por prioridad';
  if (!data.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#aaa;font-size:14px">No tienes Pokémon en ningún equipo deseado aún.<br><br>Añade Pokémon a tus equipos primero.</div>';
  } else {
    grid.innerHTML = data.map((d,i) => {
      const imgUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + d.id + '.png';
      if (d.done) {
        return '<div class="obj-card obj-done" onclick="openObjPopup(' + i + ')" style="cursor:pointer;opacity:.55">' +
          '<div class="obj-badge" style="background:#43a047">✓</div>' +
          '<img class="obj-img" src="' + imgUrl + '" alt="' + d.n + '" onerror="this.style.opacity=.2">' +
          '<div class="obj-name">' + d.n + '</div>' +
          '</div>';
      }
      const badge = d.count > 1 ? '<div class="obj-badge">x' + d.count + '</div>' : '';
      const p_obj = window.gp(window.ST.cur);
      const prog_obj = (p_obj && p_obj.candyProgress && p_obj.candyProgress[d.id]) || {c:0:0, xl:0};
      const xlRemaining = Math.max(0, d.totalXL - prog_obj.xl);
      const xlColor = xlRemaining === 0 ? '#43a047' : '#e65100';
      const xlTag = '<div style="position:absolute;bottom:2px;left:2px;right:2px;font-size:7.5px;font-weight:700;color:#fff;background:'+xlColor+';border-radius:5px;padding:1px 2px;text-align:center">'+(xlRemaining===0?'✓ XL':'⭐'+xlRemaining+' XL')+'</div>';
      return '<div class="obj-card" onclick="openObjPopup(' + i + ')" style="cursor:pointer;position:relative;padding-bottom:14px">' + badge + xlTag +
        '<img class="obj-img" src="' + imgUrl + '" alt="' + d.n + '" onerror="this.style.opacity=.2">' +
        '<div class="obj-name">' + d.n + '</div>' +
        '</div>';
    }).join('');
    window._objData = data;
    window._objDataResto = data;
    window._objDataViernes = data;
  }
  show('objetivo-screen');
  document.getElementById('home-menu').style.display = 'none';
  window.scrollTo(0, 0);
}

export function closeObjetivo() {
  show('profile-screen');
  document.getElementById('home-menu').style.display = 'block';
  document.getElementById('home-profile-section').style.display = 'none';
  document.getElementById('trainer-name-bar').textContent = '👋 ' + window.ST?.cur;
  import('./main-screen.js').then(m => m.updateHomeMenu());
  window.scrollTo(0, 0);
}

export function toggleObjInfo() {
  const detail = document.getElementById('obj-info-detail');
  const label = document.getElementById('obj-info-toggle-label');
  const isOpen = detail.style.display === 'block';
  detail.style.display = isOpen ? 'none' : 'block';
  label.textContent = isOpen ? '+Info ▾' : '-Info ▴';
}

function copyObjetivoFilter() {
  const data = window._objData;
  if (!data || !data.length) { showToast('No hay Pokémon objetivo aún'); return; }
  const filter = data
    .filter(d => !d.done)
    .map(d => {
      const eng = (window.POKEDEX?.[d.id]?.en) || window.ENG_NAMES?.[d.id];
      return eng ? '+' + eng : null;
    })
    .filter(Boolean)
    .join(',');
  if (!filter) { showToast('No se pudo generar el filtro'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(filter).then(() => showToast('✅ Filtro copiado'))
      .catch(() => { _copyFallback(filter); });
  } else {
    _copyFallback(filter);
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

function openObjPopup(idx) {
  const d = window._objData && window._objData[idx];
  if (!d) return;
  const imgUrlTop = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + d.id + '.png';
  if (d.done) {
    document.getElementById('obj-popup-img').src = imgUrlTop;
    document.getElementById('obj-popup-name').textContent = d.n;
    document.getElementById('obj-popup-count').innerHTML = '<span style="color:#43a047;font-weight:700">✓ Completado · todas las copias al máximo</span>';
    document.getElementById('obj-popup-breakdown').innerHTML = '';
    document.getElementById('obj-popup-total').textContent = '';
    const tcBox0 = document.getElementById('obj-popup-tradecat'); if (tcBox0) tcBox0.innerHTML = '';
    document.getElementById('obj-popup').style.display = 'flex';
    return;
  }

  document.getElementById('obj-popup-img').src = imgUrlTop;
  document.getElementById('obj-popup-name').textContent = d.n;

  const parts = [];
  if (d.normal > 0) {
    const label = d.hasDmaxCapability ? 'Dynamax' : (d.normal === 1 ? 'Normal' : 'Normales');
    parts.push(d.normal + ' ' + label);
  }
  if (d.shadow > 0) parts.push(d.shadow + ' ' + (d.shadow === 1 ? 'Oscuro' : 'Oscuros'));
  if (d.purified > 0) parts.push(d.purified + ' ' + (d.purified === 1 ? 'Purificado' : 'Purificados'));
  document.getElementById('obj-popup-count').innerHTML = parts.join(' &nbsp;·&nbsp; ') || '<span style="color:#aaa">Sin pendientes</span>';

  document.getElementById('obj-popup-breakdown').innerHTML = '';
  document.getElementById('obj-popup-total').textContent = '🍬 Total necesario: ~' + d.totalC + ' caramelos + ' + d.totalXL + ' XL';

  const p = goc(window.ST.cur);
  if (!p.candyProgress) p.candyProgress = {};
  if (!p.candyProgress[d.id]) p.candyProgress[d.id] = {c:0, xl:0};
  const prog = p.candyProgress[d.id];
  prog.c = Math.min(prog.c, d.totalC);
  prog.xl = Math.min(prog.xl, d.totalXL);

  const barsBox = document.getElementById('obj-popup-bars');
  if (barsBox) {
    const xlNeeded = Math.max(0, d.totalXL - prog.xl);
    const cNeeded = Math.max(0, d.totalC - prog.c);
    const xlColor = xlNeeded === 0 ? '#43a047' : '#e65100';
    const cColor = cNeeded === 0 ? '#43a047' : '#CC0000';
    barsBox.innerHTML = `
      <div style="margin-top:10px;padding:10px;background:#f5f5f5;border-radius:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;font-weight:700;color:#444">🍬 Caramelos que tengo</span>
          <span style="font-size:10px;font-weight:700;color:${cColor}">Necesarios: ${cNeeded}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#999;margin-bottom:2px"><span>0</span><span id="obj-bar-c-val">${prog.c} / ${d.totalC}</span></div>
        <input type="range" min="0" max="${d.totalC}" value="${prog.c}" oninput="updateCandyProgress('${d.id}','c',this.value)" style="width:100%;accent-color:#CC0000">
        <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 6px">
          <span style="font-size:11px;font-weight:700;color:#444">⭐ XL que tengo</span>
          <span style="font-size:10px;font-weight:700;color:${xlColor}">Necesarios: ${xlNeeded}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#999;margin-bottom:2px"><span>0</span><span id="obj-bar-xl-val">${prog.xl} / ${d.totalXL}</span></div>
        <input type="range" min="0" max="${d.totalXL}" value="${prog.xl}" oninput="updateCandyProgress('${d.id}','xl',this.value)" style="width:100%;accent-color:#FF9800">
      </div>`;
  }

  const tcBox = document.getElementById('obj-popup-tradecat');
  if (tcBox) {
    const tcColor = d.tradeCategory === 'viernes' ? '#1565c0' : '#789';
    const tcLabel = d.tradeCategory === 'viernes' ? '⭐ Viernes (busca buena base)' : '📅 Resto de días (ya tienes base)';
    const btnLabel = d.forcedAnyDay ? '↩️ Quitar de "cualquier día"' : '📅 Pasar a "cualquier día"';
    tcBox.innerHTML = '<div style="margin-top:10px;padding:8px 10px;background:#f5f5f5;border-radius:10px;font-size:11px">' +
      '<div style="font-weight:700;color:' + tcColor + ';margin-bottom:6px">' + tcLabel + '</div>' +
      '<button onclick="toggleTradeAnyDay(\\'' + d.id + '\\')" style="width:100%;padding:7px;background:#fff;border:1.5px solid ' + tcColor + ';color:' + tcColor + ';border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">' + btnLabel + '</button>' +
      '</div>';
  }

  document.getElementById('obj-popup').style.display = 'flex';
}

function updateCandyProgress(evoId, kind, value) {
  const p = goc(window.ST.cur);
  if (!p.candyProgress) p.candyProgress = {};
  if (!p.candyProgress[evoId]) p.candyProgress[evoId] = {c:0, xl:0};
  p.candyProgress[evoId][kind] = parseInt(value, 10) || 0;
  save();
  const d = window._objData.find(x => x.id === evoId);
  if (!d) return;
  const prog = p.candyProgress[evoId];
  const labelId = kind === 'c' ? 'obj-bar-c-val' : 'obj-bar-xl-val';
  const max = kind === 'c' ? d.totalC : d.totalXL;
  const labelEl = document.getElementById(labelId);
  if (labelEl) labelEl.textContent = prog[kind] + ' / ' + max;
}

function toggleTradeAnyDay(evoId) {
  const p = goc(window.ST.cur);
  if (!p.tradeAnyDay) p.tradeAnyDay = {};
  p.tradeAnyDay[evoId] = !p.tradeAnyDay[evoId];
  save();
  openObjetivo();
  const idx = window._objData.findIndex(x => x.id === evoId);
  if (idx >= 0) openObjPopup(idx);
}

function closeObjPopup() {
  const popup = document.getElementById('obj-popup');
  if (popup) popup.style.display = 'none';
}

// Expose globals
window.buildObjetivoData = buildObjetivoData;
window.openObjetivo = openObjetivo;
window.closeObjetivo = closeObjetivo;
window.toggleObjInfo = toggleObjInfo;
window.copyObjetivoFilter = copyObjetivoFilter;
window.openObjPopup = openObjPopup;
window.updateCandyProgress = updateCandyProgress;
window.toggleTradeAnyDay = toggleTradeAnyDay;
window.closeObjPopup = closeObjPopup;