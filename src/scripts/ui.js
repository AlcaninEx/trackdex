// UI module - rendering and UI interactions
import { ST, gp, countType, albumPks } from './state.js';
import { save } from './storage.js';
import { toggleDark, show, showToast, si } from './helpers.js';

// ============ POKEMON OBJETIVO ============

const CANDY_COSTS = {
  normal: { c: 250, xl: 296 },
  shadow: { c: 298, xl: 360 },
  purified: { c: 220, xl: 268 },
  dmaxSkill: { c: 350, xl: 120 }
};

const LEGENDARY_IDS = new Set([
  '10169', '10170', '10171', '144', '145', '146', '150', '151', '243', '244', '245', 
  '249', '250', '251', '377', '378', '379', '380', '381', '382', '383', '384', '385', '386', 
  '480', '481', '482', '483', '484', '486', '487', '489', '490', '491', '492', '493', '494', 
  '638', '639', '640', '641', '642', '643', '644', '645', '646', '647', '648', '649', 
  '716', '717', '718', '719', '720', '721', '785', '786', '787', '788', '789', '790', '791', 
  '792', '793', '794', '795', '796', '797', '798', '799', '800', '801', '802', '803', '804', 
  '805', '806', '807', '888', '889', '890', '891', '892', '893', '894', '895', '896', '897', 
  '898', '905', '807'
]);

function getPkName(id, profile) {
  if (profile.custom && profile.custom[id]) return profile.custom[id].n;
  const pd = window.PD?.find(x => x.id === id);
  if (pd) return pd.name;
  return null;
}

function getEvoKey(rawName) {
  let n = (rawName || '').toLowerCase()
    .replace(/\\(shadow\\)/g, '').replace(/^shadow /, '')
    .replace(/^g-/, '').replace(/^d-/, '')
    .replace(/^g /, '').replace(/^d /, '')
    .replace(/^mega /, '').replace(/^primal /, '')
    .trim();
  let id = window.NAME_TO_ID?.[n];
  if (!id) { n = n.replace(/^mega /, '').replace(/^primal /, '').trim(); id = window.NAME_TO_ID?.[n]; }
  if (!id) return null;
  const p = window.POKEDEX?.[id];
  return { n: p ? p.es : rawName, id: id, en: p ? p.en : null };
}

function isShadowEntry(id, profile) {
  if (id.includes('shadow')) return true;
  if (profile.custom && profile.custom[id] && profile.custom[id].tags && profile.custom[id].tags.includes('shadow')) return true;
  const pd = window.PD?.find(x => x.id === id);
  if (pd && pd.tags && pd.tags.includes('shadow')) return true;
  return false;
}

function isPurifiedEntry(id, profile) {
  if (id.includes('purified')) return true;
  if (profile.custom && profile.custom[id] && profile.custom[id].tags && profile.custom[id].tags.includes('purified')) return true;
  const pd = window.PD?.find(x => x.id === id);
  if (pd && pd.tags && pd.tags.includes('purified')) return true;
  return false;
}

function hasDmaxTag(id, profile) {
  if (id.includes('dynamax')) return true;
  if (profile.custom && profile.custom[id] && profile.custom[id].tags && profile.custom[id].tags.includes('dynamax')) return true;
  const pd = window.PD?.find(x => x.id === id);
  if (pd && pd.tags) return pd.tags.includes('dynamax');
  return false;
}

export function buildObjetivoData(profileName) {
  const p = gp(profileName);
  if (!p || !p.album) return [];

  const isMaxed = (id) => !!(p.pk && p.pk[id] && p.pk[id].maxed);
  const isOwned = (id) => !!(p.pk && p.pk[id] && p.pk[id].owned);

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
    if (!byEvo[key]) byEvo[key] = { n: evo.n, id: evo.id, raidDmax: [], raidShadow: [], raidPurified: [], raidNormal: [], dmaxEntries: [], totalCopies: 0, maxedCopies: 0 };
    const bucket = byEvo[key];
    bucket.totalCopies++;
    if (isMaxed(id)) bucket.maxedCopies++;

    const entry = { id, maxed: isMaxed(id), owned: isOwned(id) };
    if (isDmaxSlot) bucket.dmaxEntries.push(entry);
    else if (isPurifiedEntry(id, p)) bucket.raidPurified.push(entry);
    else if (isShadowEntry(id, p)) bucket.raidShadow.push(entry);
    else if (hasDmaxTag(id, p)) bucket.raidDmax.push(entry);
    else bucket.raidNormal.push(entry);
  }

  const tradeAnyDay = (p.tradeAnyDay) || {};

  const results = [];
  for (const key in byEvo) {
    const e = byEvo[key];
    const pend = arr => arr.filter(x => !x.maxed).length;
    const raidNormalP = pend(e.raidNormal);
    const raidDmaxP   = pend(e.raidDmax);
    const raidShadowP = pend(e.raidShadow);
    const raidPurifP  = pend(e.raidPurified);
    const dmaxP       = pend(e.dmaxEntries);

    const sharedDmax = Math.min(dmaxP, raidDmaxP);
    const newDmax = Math.max(0, dmaxP - raidDmaxP);

    const normal   = raidNormalP + raidDmaxP + newDmax;
    const shadow   = raidShadowP;
    const purified = raidPurifP;
    const dmaxSkills = dmaxP;

    const pendingCount = normal + shadow + purified;
    const done = (pendingCount === 0 && dmaxSkills === 0);

    const normalTypeEntries = [...e.raidNormal, ...e.raidDmax];
    const needsGoodBase = normalTypeEntries.some(x => !x.owned);
    let tradeCategory = needsGoodBase ? 'viernes' : 'resto';
    if (tradeAnyDay[key]) tradeCategory = 'resto';

    const hasDmaxCapability = e.raidDmax.length > 0 || e.dmaxEntries.length > 0;

    const totalC  = normal*CANDY_COSTS.normal.c + shadow*CANDY_COSTS.shadow.c + purified*CANDY_COSTS.purified.c + dmaxSkills*CANDY_COSTS.dmaxSkill.c;
    const totalXL = normal*CANDY_COSTS.normal.xl + shadow*CANDY_COSTS.shadow.xl + purified*CANDY_COSTS.purified.xl + dmaxSkills*CANDY_COSTS.dmaxSkill.xl;

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

export function renderObjetivo() {
  if (!ST.cur) { showToast('Selecciona un entrenador primero'); return; }
  const data = buildObjetivoData(ST.cur);
  const bar = document.getElementById('obj-trainer-bar');
  const grid = document.getElementById('obj-grid');
  
  bar.innerHTML = '👤 <b>' + ST.cur + '</b> &nbsp;·&nbsp; ' + data.length + ' Pokémon iniciales &nbsp;·&nbsp; ordenados por prioridad';
  
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
      const p_obj = window._ST_CUR_PROFILE;
      const prog_obj = (p_obj && p_obj.candyProgress && p_obj.candyProgress[d.id]) || {c:0, xl:0};
      const xlRemaining = Math.max(0, d.totalXL - prog_obj.xl);
      const xlColor = xlRemaining === 0 ? '#43a047' : '#e65100';
      const xlTag = '<div style="position:absolute;bottom:2px;left:2px;right:2px;font-size:7.5px;font-weight:700;color:#fff;background:'+xlColor+';border-radius:5px;padding:1px 2px;text-align:center">'+(xlRemaining===0?'✓ XL':'⭐'+xlRemaining+' XL')+'</div>';
      return '<div class="obj-card" onclick="openObjPopup(' + i + ')" style="cursor:pointer;position:relative;padding-bottom:14px">' + badge + xlTag +
        '<img class="obj-img" src="' + imgUrl + '" alt="' + d.n + '" onerror="this.style.opacity=.2">' +
        '<div class="obj-name">' + d.n + '</div>' +
        '</div>';
    }).join('');
    window._objData = data;
    window._ST_CUR_PROFILE = gp(ST.cur);
  }
  
  show('objetivo-screen');
  window.scrollTo(0, 0);
}

export function openObjetivo() {
  renderObjetivo();
}

export function copyObjetivoFilter() {
  const data = window._objData;
  if (!data || !data.length) { showToast('No hay Pokémon objetivo aún'); return; }
  const filter = data
    .filter(d => !d.done)
    .map(d => {
      const eng = (window.POKEDEX?.[d.id] && window.POKEDEX[d.id].en) || window.ENG_NAMES?.[d.id];
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

export function openObjPopup(idx) {
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

  const p = gp(ST.cur);
  if (!p.candyProgress) p.candyProgress = {};
  if (!p.candyProgress[d.id]) p.candyProgress[d.id] = {c:0, xl:0};
  const prog = p.candyProgress[d.id];
  prog.c = Math.min(prog.c, d.totalC);
  prog.xl = Math.min(prog.xl, d.totalXL);

  const barsBox = document.getElementById('obj-popup-bars');
  if (barsBox) {
    const xlNeeded = Math.max(0, d.totalXL - prog.xl);
    const cNeeded  = Math.max(0, d.totalC  - prog.c);
    const xlColor  = xlNeeded === 0 ? '#43a047' : '#e65100';
    const cColor   = cNeeded  === 0 ? '#43a047' : '#CC0000';
    barsBox.innerHTML = `
      <div style="margin-top:10px;padding:10px;background:#f5f5f5;border-radius:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;font-weight:700;color:#444">🍬 Caramelos que tengo</span>
          <span style="font-size:10px;font-weight:700;color:${cColor}">Necesarios: ${cNeeded}</span>
        </div>
        <input type="range" min="0" max="${d.totalC}" value="${prog.c}" oninput="updObjCandy('${d.id}','c',this.value)" style="width:100%;accent-color:${cColor}">
        <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:#888"><span>0</span><span>${d.totalC}</span></div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 6px">
          <span style="font-size:11px;font-weight:700;color:#444">⭐ Caramelos XL que tengo</span>
          <span style="font-size:10px;font-weight:700;color:${xlColor}">Necesarios: ${xlNeeded}</span>
        </div>
        <input type="range" min="0" max="${d.totalXL}" value="${prog.xl}" oninput="updObjCandy('${d.id}','xl',this.value)" style="width:100%;accent-color:${xlColor}">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#888"><span>0</span><span>${d.totalXL}</span></div>
      </div>
    `;
  }

  const tcBox = document.getElementById('obj-popup-tradecat');
  if (tcBox) {
    const label = d.tradeCategory === 'viernes' ? '🗓️ Viernes (necesita base buena)' : '📅 Resto de días';
    tcBox.innerHTML = '<div style="margin-top:8px;padding:8px;background:#f0f0f0;border-radius:8px;font-size:11px;color:#444"><b>Trade:</b> ' + label + (d.forcedAnyDay ? ' <span style="color:#43a047">(forzado a cualquier día)</span>' : '') + '</div>';
  }

  document.getElementById('obj-popup').style.display = 'flex';
}

export function closeObjPopup() {
  document.getElementById('obj-popup').style.display = 'none';
}

export function toggleObjInfo() {
  const detail = document.getElementById('obj-info-detail');
  const label = document.getElementById('obj-info-toggle-label');
  const isOpen = detail.style.display === 'block';
  detail.style.display = isOpen ? 'none' : 'block';
  label.textContent = isOpen ? '+Info ▾' : '-Info ▴';
}

export function updObjCandy(id, which, val) {
  const p = gp(ST.cur);
  if (!p.candyProgress) p.candyProgress = {};
  if (!p.candyProgress[id]) p.candyProgress[id] = {c:0, xl:0};
  if (which === 'c') p.candyProgress[id].c = parseInt(val) || 0;
  else p.candyProgress[id].xl = parseInt(val) || 0;
  save();
  openObjPopup(window._objData.findIndex(d => d.id === id));
}

// ============ MAIN SCREEN ============

export function renderMain() {
  const nameEl = document.getElementById('uname');
  if (nameEl) nameEl.textContent = ST.view ? ST.cur + ' → ' + ST.view : ST.cur;
  
  const v = ST.view || ST.cur;
  const grid = document.getElementById('types-grid');
  if (!grid) return;
  
  const pObj = gp(v);
  if (!pObj) return;
  
  grid.innerHTML = (window.TYPES || []).map(t => {
    const { o } = countType(v, t.key);
    const pct = Math.round(o / 6 * 100);
    const dxOwned = pObj.album ? Object.keys(pObj.album).filter(
      id => pObj.album[id] === true && id.startsWith(t.key + '-dmax-') && 
             pObj.pk?.[id]?.owned
    ).length : 0;
    const dxPct = Math.round(Math.min(dxOwned, 3) / 3 * 100);
    
    return `<div class="type-card" onclick="openType('${t.key}')" style="background:${t.color}">
      <div class="type-card-top" style="padding:10px 12px 4px">
        <span class="type-badge" style="background:${t.bg};color:#333;border-color:${t.color}">
          <span class="type-icon">${t.icon}</span>${t.name}
        </span>
      </div>
      <div class="type-card-bars">
        <div class="bar-row">
          <span class="bar-lbl">⚔️</span>
          <div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:rgba(255,255,255,.9)"></div></div>
          <span class="prog-count">${o}/6</span>
        </div>
        <div class="bar-row">
          <span class="bar-lbl">⚡</span>
          <div class="dx-bar"><div class="dx-fill" style="width:${dxPct}%"></div></div>
          <span class="dx-count">${dxOwned}/3</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ============ DETAIL SCREEN ============

export function renderTypeNav() {
  const strip = document.getElementById('type-nav-strip');
  if (!strip) return;
  strip.innerHTML = (window.TYPES || []).map(t => 
    `<button class="tn-btn${ST.type === t.key ? ' active' : ''}" style="background:${t.color}" onclick="navToType('${t.key}')">${t.name}</button>`
  ).join('');
}

export function switchTab(tab) {
  ST.tab = tab;
  document.getElementById('tab-a').className = tab === 'album' ? 'tab active' : 'tab';
  document.getElementById('tab-r').className = tab === 'ranking' ? 'tab active' : 'tab';
  document.getElementById('album-panel').style.display = tab === 'album' ? 'block' : 'none';
  document.getElementById('ranking-panel').style.display = tab === 'ranking' ? 'block' : 'none';
  
  if (tab === 'album') {
    renderAlbum();
    renderAlbumDmax();
  } else {
    renderRanking();
    if (ST.rankTab === 'dmax') renderDmaxRanking();
  }
}

export function switchAlbumTab(tab) {
  ST.albumTab = tab;
  document.getElementById('atab-raid').className = tab === 'raid' ? 'album-subtab active' : 'album-subtab';
  document.getElementById('atab-dmax').className = tab === 'dmax' ? 'album-subtab active' : 'album-subtab';
  document.getElementById('apanel-raid').style.display = tab === 'raid' ? 'block' : 'none';
  document.getElementById('apanel-dmax').style.display = tab === 'dmax' ? 'block' : 'none';
}

export function switchRankTab(tab) {
  ST.rankTab = tab;
  document.getElementById('rtab-raid').className = tab === 'raid' ? 'tab active' : 'tab';
  document.getElementById('rtab-dmax').className = tab === 'dmax' ? 'tab active' : 'tab';
  document.getElementById('rpanel-raid').style.display = tab === 'raid' ? 'block' : 'none';
  document.getElementById('rpanel-dmax').style.display = tab === 'dmax' ? 'block' : 'none';
  
  if (tab === 'dmax') renderDmaxRanking();
}

export function expandCard(id) {
  ST.expanded = ST.expanded === id ? null : id;
  if (ST.albumTab === 'raid') renderAlbum();
  else renderAlbumDmax();
}

export function toggleMegaFilter() {
  ST.showOnlyMega = !ST.showOnlyMega;
  renderRanking();
}

// ============ NAVIGATION ============

export function navToType(key) {
  ST.type = key;
  ST.expanded = null;
  const t = window.TM?.[key];
  if (t) document.getElementById('detail-title').innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;color:#fff"><span style="width:20px;height:20px;display:inline-flex;align-items:center">' + t.icon + '</span>' + t.name + '</span>';
  renderTypeNav();
  renderAlbum();
  renderRanking();
  renderAlbumDmax();
  if (ST.rankTab === 'dmax') renderDmaxRanking();
  renderMain();
}

// ============ ALBUM RENDERING ============

function evoH(evo, img, shadow) {
  const sb = shadow ? '<img src="shadow_icon.png" class="shadow-badge" alt="">' : '';
  if (!evo || evo.length <= 1) return `<div class="final-wrap">${sb}<img class="final-img" src="${si(img)}" onerror="this.style.opacity=.1"></div>`;
  return `<div class="evo-chain"><img class="evo-sm" src="${si(evo[0])}" onerror="this.style.opacity=.1"><span class="evo-arr">▶</span><div class="final-wrap">${sb}<img class="final-img" src="${si(img)}" style="width:40px;height:40px" onerror="this.style.opacity=.1"></div></div>`;
}

function renderBadges(tags) {
  return (tags || []).map(tg => {
    if (tg === 'shadow') return '<span class="badge" style="background:#6a1b9a;color:#fff">Shadow</span>';
    if (tg === 'mega')   return '<span class="badge" style="background:#CC0000;color:#fff">Mega</span>';
    if (tg === 'legacy') return '<span class="badge" style="background:#e65100;color:#fff">Legacy ⭐</span>';
    if (tg === 'dynamax') return '<span class="badge" style="background:#ad1565c0;color:#fff">DMAX</span>';
    if (tg === 'mission') return '<span class="badge" style="background:#2e7d32;color:#fff">Misión</span>';
    return '';
  }).join('');
}

function inferTags(name, fastL, chargeL, pdTags) {
  const tags = new Set(pdTags || []);
  const nl = (name || '').toLowerCase();
  if (nl.includes('(shadow)') || nl.startsWith('shadow ')) tags.add('shadow');
  if (nl.startsWith('mega ') || nl.startsWith('primal ')) tags.add('mega');
  if (fastL || chargeL) tags.add('legacy');
  const base = nl.replace(/\(shadow\)/g, '').replace(/^shadow /, '')
    .replace(/^mega /, '').replace(/^primal /, '')
    .replace(/^galarian /, '').replace(/^alolan /, '')
    .replace(/^hisuian /, '').replace(/^paldean /, '')
    .replace(/ standard$/, '').replace(/ zen$/, '')
    .replace(/ sky$/, '').replace(/ ordinary$/, '')
    .replace(/ resolute$/, '').replace(/ therian$/, '')
    .replace(/ incarnate$/, '').replace(/ crowned.*$/, '')
    .replace(/ hero.*$/, '').replace(/ white$/, '')
    .replace(/ black$/, '').replace(/ origin$/, '')
    .replace(/ rapid.*$/, '').replace(/ single.*$/, '')
    .replace(/ amped$/, '').replace(/ low key$/, '')
    .replace(/ curly$/, '').replace(/ droopy$/, '')
    .replace(/ stretchy$/, '').replace(/ masterpiece$/, '')
    .replace(/ antique$/, '').replace(/ phony$/, '')
    .replace(/ [xyz]$/, '').replace(/ \(.*\)$/, '').trim();
  if (window.DMAX_NAMES?.has(base)) tags.add('dynamax');
  else { for (const w of base.split(' ')) { if (window.DMAX_NAMES?.has(w)) { tags.add('dynamax'); break; } } }
  if (tags.has('shadow')) tags.delete('dynamax');
  return [...tags];
}

export function renderAlbum() {
  const profile = ST.view || ST.cur;
  const isV = !!ST.view;
  const t = window.TM?.[ST.type];
  const pks = albumPks(profile, ST.type);
  const maxD = Math.max(...pks.map(p => p.dps), 1);
  
  const pp0 = gp(profile);
  const ownedCount = pks.filter(pk => pp0 && pp0.pk[pk.id] && pp0.pk[pk.id].owned).length;
  
  const teamHeader = `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px 6px;background:rgba(0,0,0,.18);border-bottom:1px solid rgba(255,255,255,.15)">
    <span style="font-size:12px;font-weight:700;color:#fff">Equipo deseado</span>
    <span style="font-size:12px;font-weight:700;color:#fff">En propiedad <span id="album-owned-count">${ownedCount}/6</span></span>
  </div>`;
  
  const empty = Array(Math.max(0, 6 - pks.length)).fill('<div class="empty-slot"><div class="empty-slot-icon">❓</div><div class="empty-slot-txt"><b>Slot vacío</b><br>Necesitas equipo de 6 para incursiones</div></div>').join('');
  
  document.getElementById('album-list').innerHTML = teamHeader + pks.map(pk => {
    const pp = gp(profile);
    const pd = (pp && pp.pk[pk.id]) || {};
    const isO = pd.owned || false;
    const lg = pd.legacy || false;
    const ia = pd.ivAtk || 0, id2 = pd.ivDef || 0, ih = pd.ivHp || 0;
    const baseDps = pk.dps;
    const bs2 = window.BASE_STATS?.[pk.id] || [200, 150, 180];
    const realDps = baseDps * (bs2[0] + ia) / (bs2[0] + 15);
    const dd = realDps;
    const bw = Math.round((realDps / maxD) * 100);
    const isOpen = ST.expanded === pk.id;
    const isShadow = pk.tags.includes('shadow');
    const tH = renderBadges(inferTags(pk.name || pk.n || '', pk.fast && pk.fast.endsWith('*'), pk.charge && pk.charge.endsWith('*'), pk.tags || []));
    const fd = pk.fast.replace('*', '');
    const cd = pk.charge.replace('*', '');
    const fl = pk.fast.endsWith('*');
    const cl = pk.charge.endsWith('*');
    const mvH = `<div class="mv-box"><div class="mv-row"><span class="mv-lbl">Rápido</span><span class="mv-name">${fd}${fl ? '<span class="leg-star">⭐</span>' : ''}</span></div><div class="mv-row"><span class="mv-lbl">Cargado</span><span class="mv-name">${cd}${cl ? '<span class="leg-star">⭐</span>' : ''}</span></div></div>`;
    const bs = window.BASE_STATS?.[pk.id] || [200, 150, 180];
    const pctA = Math.round((bs[0] + ia) / (bs[0] + 15) * 100);
    const pctD = Math.round((bs[1] + id2) / (bs[1] + 15) * 100);
    const pctH = Math.round((bs[2] + ih) / (bs[2] + 15) * 100);
    
    const ownedToggle = !isV ? `<div class="tr" style="margin-bottom:8px;padding:8px 12px;background:${isO ? '#e8f5e9' : '#f5f5f5'};border-radius:8px;border:1.5px solid ${isO ? '#43a047' : '#ddd'}">
      <span style="font-size:13px;font-weight:700;color:${isO ? '#2e7d32' : '#555'}">${isO ? '✅ Obtenido' : '¿Lo tienes?'}</span>
      <label class="sw" onclick="event.stopPropagation()"><input type="checkbox" ${isO ? 'checked' : ''} onchange="togOwned('${pk.id}',this.checked)"><span class="sl"></span></label>
    </div>` : '';
    
    const isMax = pd.maxed || false;
    const maxToggle = !isV ? `<div class="tr" style="margin-bottom:10px;padding:8px 12px;background:${isMax ? '#fff8e1' : '#f5f5f5'};border-radius:8px;border:1.5px solid ${isMax ? '#ffb300' : '#ddd'}">
      <span style="font-size:13px;font-weight:700;color:${isMax ? '#e65100' : '#555'}">${isMax ? '⭐ Al máximo' : '¿Lo tengo al máximo?'}</span>
      <label class="sw" onclick="event.stopPropagation()"><input type="checkbox" ${isMax ? 'checked' : ''} onchange="togMaxed('${pk.id}',this.checked)"><span class="sl"></span></label>
    </div>` : '';
    
    const editF = `${ownedToggle}${maxToggle}<div class="fr" style="margin-top:4px">
      <div class="fl">DPS con tus IVs</div>
      <p style="font-size:18px;font-weight:700;color:#222"><span id="dps-real-${pk.id}">${dd.toFixed(2)}</span> <span style="font-size:12px;color:#888;font-weight:400">/ Max ${baseDps.toFixed(2)}</span></p>
    </div><div class="fr"><div class="fl">IVs</div><div class="iv-grid">
      <div class="iv-col"><div class="iv-lbl">Ataque</div><div class="iv-val" id="ia-${pk.id}">${ia}<span style="font-size:10px;color:#888;font-weight:400"> (${pctA}%)</span></div><input type="range" min="0" max="15" value="${ia}" oninput="updIV('${pk.id}','a',this.value)"></div>
      <div class="iv-col"><div class="iv-lbl">Defensa</div><div class="iv-val" id="id-${pk.id}">${id2}<span style="font-size:10px;color:#888;font-weight:400"> (${pctD}%)</span></div><input type="range" min="0" max="15" value="${id2}" oninput="updIV('${pk.id}','d',"></div>
      <div class="iv-col"><div class="iv-lbl">Vida</div><div class="iv-val" id="ih-${pk.id}">${ih}<span style="font-size:10px;color:#888;font-weight:400"> (${pctH}%)</span></div><input type="range" min="0" max="15" value="${ih}" oninput="updIV('${pk.id}','h',"></div>
    </div></div><div class="fr"><div class="fl">Moveset</div>${mvH}</div>`;
    
    const viewF = `<div class="fr"><div class="fl">DPS con sus IVs</div><p style="font-size:18px;font-weight:700;color:#222"><span id="dps-real-${pk.id}">${dd.toFixed(2)}</span> <span style="font-size:12px;color:#888;font-weight:400">/ Max ${baseDps.toFixed(2)}</span></p></div><div class="fr"><div class="fl">Moveset</div>${mvH}</div>`;
    
    const removeBtn = !isV ? (pk.isCustom ? `<button class="album-remove" onclick="event.stopPropagation();removeRankEntry('${pk.id}','${ST.type}')">✕</button>` : `<button class="album-remove" onclick="event.stopPropagation();removeFromAlbum('${pk.id}')">✕</button>`) : '';
    const evoDisplay = pk.isCustom ? `<div class="final-wrap"><img class="final-img" src="${si(pk.img)}" onerror="this.style.opacity=.1"></div>` : evoH(pk.evo, pk.img, isShadow);
    const _pkOwned = !!(pp0 && pp0.pk[pk.id] && pp0.pk[pk.id].owned);
    const _pkMaxed = !!(pp0 && pp0.pk[pk.id] && pp0.pk[pk.id].maxed);
    const tickHtml = `<div class="pk-ticks" title="${_pkMaxed ? 'Al máximo' : _pkOwned ? 'Lo tienes' : 'Pendiente'}"><span class="pk-tick${_pkOwned ? ' on' : ''}">✓</span><span class="pk-tick${_pkMaxed ? ' on' : ''}">✓</span></div>`;
    
    return `<div class="pk-card" id="c-${pk.id}" style="background:${t?.color || '#CC0000'}"><div class="pk-top" onclick="togCard('${pk.id}')"><div style="display:flex;align-items:center;gap:2px;flex-shrink:0">${evoDisplay}</div><div class="pk-info"><div class="pk-name">${pk.name.replace(' (Shadow)', '')}</div>${pk.tags.length ? `<div class="tags-row">${tH}</div>` : ''}<div class="dps-wrap"><div class="dps-lbl"><span>DPS <span id="dps-bar-${pk.id}">${dd.toFixed(2)}</span></span><span style="color:rgba(255,255,255,.6);font-size:9px">Max ${baseDps.toFixed(2)}</span></div><div class="dps-bar"><div class="dps-fill" style="width:${bw}%"></div></div></div></div>${tickHtml}${removeBtn}</div><div class="pk-body${isOpen ? ' open' : ''}">${isV ? viewF : editF}</div></div>`;
  }).join('') + empty;
}

export function renderAlbumDmax() {
  const t = window.TM?.[ST.type];
  const isV = !!ST.view;
  const rows = window.DMAX?.[ST.type] || [];
  const el = document.getElementById('album-list-dmax');
  if (!rows.length) { el.innerHTML = '<p style="text-align:center;padding:20px;color:#aaa">Sin datos Dynamax.</p>'; return; }
  
  const p2 = gp(ST.view || ST.cur);
  const userDmaxIds = p2 && p2.album ? Object.keys(p2.album).filter(id => p2.album[id] === true && id.startsWith(ST.type + '-dmax-')) : [];
  
  const slots = [];
  userDmaxIds.forEach(albumId => {
    const r = rows.find(r => {
      const did = ST.type + '-dmax-' + r.n.toLowerCase().replace(/[^a-z0-9]/g, '-');
      return albumId === did || albumId.startsWith(did + '-');
    });
    if (r) slots.push({ r, albumId });
  });
  
  slots.sort((a, b) => b.r.dps - a.r.dps);
  const maxD = slots.length ? Math.max(...slots.map(s => s.r.dps)) : 1;
  const dmaxMax = 6;
  const emptyDmax = Array(Math.max(0, dmaxMax - slots.length)).fill('<div class="empty-slot"><div class="empty-slot-icon">⚡</div><div class="empty-slot-txt"><b>Slot vacío</b><br>Máx recomendado: 3</div></div>').join('');
  
  const dmaxWarn = slots.length > 3 ? '<div style="padding:6px 14px;background:#fff3e0;border-bottom:1px solid #ffe082;font-size:11px;color:#e65100;font-weight:600">⚠️ El equipo óptimo Dynamax es de 3. Tienes ' + slots.length + '.</div>' : '';
  
  if (!slots.length) { el.innerHTML = emptyDmax; return; }
  
  const isG = r => r.charge.startsWith('G-Max') || ['Drum Solo', 'Vine Lash', 'Cannonade', 'Hydrosnipe', 'Foam Burst', 'Fireball', 'Wildfire', 'Stun Shock', 'Befuddle', 'Terror', 'Snooze', 'Resonance', 'Chi Strike', 'Behemoth'].some(x => r.charge.includes(x));
  
  el.innerHTML = dmaxWarn + slots.map(({ r, albumId }) => {
    const rb = !isV ? `<button class="album-remove" onclick="event.stopPropagation();removeDmaxEntry('${albumId}')">✕</button>` : '';
    const pdd = (p2 && p2.pk && p2.pk[albumId]) || {};
    const dIsO = pdd.owned || false;
    const dIsMax = pdd.maxed || false;
    
    const dToggles = !isV ? `<div style="padding:8px 12px;background:rgba(255,255,255,.92)">
      <div class="tr" style="margin-bottom:6px;padding:6px 10px;background:${dIsO ? '#e8f5e9' : '#f5f5f5'};border-radius:8px;border:1.5px solid ${dIsO ? '#43a047' : '#ddd'}"><span style="font-size:12px;font-weight:700;color:${dIsO ? '#2e7d32' : '#555'}">${dIsO ? '✅ Obtenido' : '¿Lo tienes?'}</span><label class="sw" onclick="event.stopPropagation()"><input type="checkbox" ${dIsO ? 'checked' : ''} onchange="togOwned('${albumId}',this.checked)"><span class="sl"></span></label></div>
      <div class="tr" style="padding:6px 10px;background:${dIsMax ? '#fff8e1' : '#f5f5f5'};border-radius:8px;border:1.5px solid ${dIsMax ? '#ffb300' : '#ddd'}"><span style="font-size:12px;font-weight:700;color:${dIsMax ? '#e65100' : '#555'}">${dIsMax ? '⭐ Al máximo' : '¿Lo tengo al máximo?'}</span><label class="sw" onclick="event.stopPropagation()"><input type="checkbox" ${dIsMax ? 'checked' : ''} onchange="togMaxed('${albumId}',this.checked)"><span class="sl"></span></label></div>
    </div>` : '';
    
    const dIsOpen = ST.expanded === albumId;
    const dInner = !isV ? `<div style="padding:8px 12px;font-size:11px;color:rgba(255,255,255,.8)">${r.fast} → ${r.charge}</div>${dToggles}` : `<div style="padding:8px 12px;font-size:11px;color:rgba(255,255,255,.8)">${r.fast} → ${r.charge}</div>`;
    
    const dTickHtml = `<div class="pk-ticks" title="${dIsMax ? 'Al máximo' : dIsO ? 'Lo tienes' : 'Pendiente'}"><span class="pk-tick${dIsO ? ' on' : ''}">✓</span><span class="pk-tick${dIsMax ? ' on' : ''}">✓</span></div>`;
    
    return `<div class="pk-card" id="c-${albumId}" style="background:${t?.color || '#CC0000'}"><div class="pk-top" onclick="togCard('${albumId}')"><div style="flex-shrink:0"><div class="final-wrap"><img class="final-img" src="${si(r.img)}" onerror="this.style.opacity=.1"></div></div><div class="pk-info"><div class="pk-name">${r.n.replace(/^[GD]-/, '')}</div><div class="tags-row">${isG(r) ? '<span class="tag" style="background:#7b1fa2;color:#fff;font-size:9px">GMAX</span>' : '<span class="tag" style="background:#1565c0;color:#fff;font-size:9px">DMAX</span>'}</div><div class="dps-wrap"><div class="dps-lbl"><span>Max Dmg</span><span>${r.dps.toFixed(1)}</span></div><div class="dps-bar"><div class="dps-fill" style="width:${Math.round(r.dps / maxD * 100)}%"></div></div></div></div>${dTickHtml}${rb}</div><div class="pk-body${dIsOpen ? ' open' : ''}">${dInner}</div></div>`;
  }).join('') + emptyDmax;
}

export function removeDmaxEntry(albumId) {
  if (!ST.cur) return;
  const p = gp(ST.cur);
  if (!p.album) return;
  delete p.album[albumId];
  if (p.custom) delete p.custom[albumId];
  save();
  renderAlbumDmax();
  renderMain();
}

// ============ RANKING RENDERING ============

export function renderRanking() {
  const t = window.TM?.[ST.type];
  const rows = window.RANKINGS?.[ST.type] || [];
  const el = document.getElementById('rank-list');
  if (!rows.length) { el.innerHTML = '<p style="text-align:center;padding:20px;color:#aaa">Sin datos de ranking.</p>'; return; }
  
  const maxD = rows[0].dps;
  const isV2 = !!ST.view;
  
  el.innerHTML = rows.map((r, i) => {
    const bw = Math.round(r.dps / maxD * 100);
    if (!window._rankCache) window._rankCache = {};
    window._rankCache[r.id] = { n: r.n, dps: r.dps, img: r.img, fast: r.fast, charge: r.charge, type: ST.type };
    const addBtn = !isV2 ? '<button class="rank-add-btn" onclick="event.stopPropagation();addFromRanking(\'' + r.id + '\')" title="Añadir a Mis Pokémon">+</button>' : '';
    return '<div class="rank-row" style="background:#fff"><span class="rank-num">#' + i + '</span><img class="rank-img" src="' + si(r.img) + '" onerror="this.style.opacity=.1"><div class="rank-info"><div class="rank-name" style="color:#222">' + r.n + '</div><div class="rank-move" style="color:#888">' + r.fast + ' / ' + r.charge + '</div><div class="dps-minibar"><div class="dps-minifill" style="width:' + bw + '%;background:' + t.color + '"></div></div></div><div class="rank-dps" style="color:#222">' + r.dps.toFixed(1) + '</div>' + addBtn + '</div>';
  }).join('');
}

export function renderDmaxRanking() {
  const t = window.TM?.[ST.type];
  const rows = window.DMAX?.[ST.type] || [];
  const el = document.getElementById('rank-list-dmax');
  if (!rows.length) { el.innerHTML = '<p style="text-align:center;padding:20px;color:#aaa">Sin datos Dynamax.</p>'; return; }
  
  const maxD = rows[0].dps;
  const isV2 = !!ST.view;
  
  const isG = r => r.charge.startsWith('G-Max') || ['Drum Solo', 'Vine Lash', 'Cannonade', 'Hydrosnipe', 'Foam Burst', 'Fireball', 'Wildfire', 'Stun Shock', 'Befuddle', 'Terror', 'Snooze', 'Resonance', 'Chi Strike', 'Behemoth'].some(x => r.charge.includes(x));
  
  el.innerHTML = rows.map((r, i) => {
    const dname = r.n.replace(/^[GD]-/, '');
    const badge = isG(r) ? '<span style="font-size:9px;background:#7b1fa2;color:#fff;padding:1px 5px;border-radius:6px;margin-left:4px">GMAX</span>' : '<span style="font-size:9px;background:#1565c0;color:#fff;padding:1px 5px;border-radius:6px;margin-left:4px">DMAX</span>';
    const bw = Math.round(r.dps / maxD * 100);
    const did = ST.type + '-dmax-' + r.n.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (!window._rankCache) window._rankCache = {};
    window._rankCache[did] = { n: dname, dps: r.dps, img: r.img, fast: r.fast, charge: r.charge, type: ST.type };
    const addBtn = !isV2 ? '<button class="rank-add-btn" onclick="event.stopPropagation();addFromRanking(\'' + did + '\')" title="Añadir a Mis Pokémon">+</button>' : '';
    return '<div class="rank-row" style="background:#fff"><span class="rank-num">#' + i + '</span><img class="rank-img" src="' + si(r.img) + '" onerror="this.style.opacity=.1"><div class="rank-info"><div class="rank-name" style="color:#222">' + dname + badge + '</div><div class="rank-move" style="color:#888">' + r.fast + ' / ' + r.charge + '</div><div class="dps-minibar"><div class="dps-minifill" style="width:' + bw + '%;background:' + t.color + '"></div></div></div><div class="rank-dps" style="color:#222">' + r.dps.toFixed(1) + '</div>' + addBtn + '</div>';
  }).join('');
}

// ============ UI HELPERS ============

// ============ GLOBAL WINDOW EXPORTS ============

window.togCard = (id) => { ST.expanded = ST.expanded === id ? null : id; if (ST.albumTab === 'raid') renderAlbum(); else renderAlbumDmax(); };
window.togOwned = (id, checked) => { const p = gp(ST.cur); if (p && p.pk && p.pk[id]) { p.pk[id].owned = checked; if (!checked) p.pk[id].maxed = false; save(); if (ST.albumTab === 'raid') renderAlbum(); else renderAlbumDmax(); renderMain(); } };
window.togMaxed = (id, checked) => { const p = gp(ST.cur); if (p && p.pk && p.pk[id]) { p.pk[id].maxed = checked; if (checked) p.pk[id].owned = true; save(); if (ST.albumTab === 'raid') renderAlbum(); else renderAlbumDmax(); renderMain(); } };
window.updIV = (id, which, val) => { const p = gp(ST.cur); if (p && p.pk && p.pk[id]) { if (which === 'a') p.pk[id].ivAtk = parseInt(val) || 0; else if (which === 'd') p.pk[id].ivDef = parseInt(val) || 0; else if (which === 'h') p.pk[id].ivHp = parseInt(val) || 0; save(); if (ST.albumTab === 'raid') renderAlbum(); else renderAlbumDmax(); renderMain(); } };
function hasMegaInTeam(p, type) {
  if (!p || !p.album) return false;
  for (const id in p.album) {
    if (p.album[id] !== true) continue;
    let tags = [];
    if (p.custom && p.custom[id]) {
      const d = p.custom[id];
      if ((d.type || type) !== type) continue;
      const pdRef = d.pdRef ? window.PD?.find(x => x.id === d.pdRef) : null;
      tags = pdRef ? pdRef.tags : (d.tags || inferTags(d.n, false, false, []));
    } else {
      const pd = window.PD?.find(x => x.id === id);
      if (!pd || pd.type !== type) continue;
      tags = pd.tags || [];
    }
    if (tags.includes('mega')) return true;
  }
  return false;
}

function countAlbumForType(p, type) {
  if (!p || !p.album) return 0;
  let count = 0;
  for (const id in p.album) {
    if (p.album[id] !== true) continue;
    if (id.includes('-dmax-')) continue;
    let pkType = null;
    if (p.custom && p.custom[id]) {
      pkType = p.custom[id].type;
    } else {
      const pd = window.PD?.find(x => x.id === id);
      if (pd) pkType = pd.type;
    }
    if (pkType === type) count++;
  }
  return count;
}

window.addFromRanking = (id) => {
  if (!ST.cur) return;
  const data = (window._rankCache && window._rankCache[id]) || {};
  const type = data.type || ST.type;
  const p = gp(ST.cur);
  if (!p.album) p.album = {};
  if (!p.custom) p.custom = {};
  
  const _pdE2 = window.PD?.find(x => x.id === id);
  const isDmaxEntry = id.includes('-dmax-');
  
  if (isDmaxEntry) {
    const dmaxCount = Object.keys(p.album).filter(k => p.album[k] === true && k.startsWith(type + '-dmax-')).length;
    if (dmaxCount >= 6) { showToast('Ya tienes 6 Pokémon Dynamax en este tipo\nElimina uno primero ⚡'); return; }
    if (dmaxCount === 3) { showToast('⚠️ El equipo óptimo Dynamax es de 3 Pokémon'); }
  } else {
    const typeCount = countAlbumForType(p, type);
    if (typeCount >= 6) { showToast('Ya tienes 6 Pokémon en este tipo\nElimina uno primero ⚔️'); return; }
  }
  
  const _isMega2 = (_pdE2 && _pdE2.tags && _pdE2.tags.includes('mega')) || (data.n && (data.n.toLowerCase().startsWith('mega ') || data.n.toLowerCase().startsWith('primal ')));
  if (_isMega2 && hasMegaInTeam(p, type)) { showToast('Solo un Mega por equipo\nSustituye el actual primero 🔴'); return; }
  
  let newId = id;
  let n = 1;
  while (p.album[newId] === true) { newId = id + '-' + n; n++; }
  p.album[newId] = true;
  
  const pdEntry = isDmaxEntry ? null : window.PD?.find(x => x.id === id);
  if (pdEntry) {
    p.custom[newId] = { n: pdEntry.name, dps: pdEntry.dps, img: pdEntry.img, fast: pdEntry.fast, charge: pdEntry.charge, type: pdEntry.type, pdRef: id, tags: inferTags(pdEntry.name, pdEntry.fast.endsWith('*'), pdEntry.charge.endsWith('*'), pdEntry.tags || []) };
  } else if (data.n) {
    const _ft = data.fastL && data.fast ? data.fast + '*' : data.fast || '';
    const _ct = data.chargeL && data.charge ? data.charge + '*' : data.charge || '';
    const _tt = inferTags(data.n, data.fastL, data.chargeL, data.tags || []);
    if (isDmaxEntry && !_tt.includes('dynamax')) _tt.push('dynamax');
    p.custom[newId] = { n: data.n, dps: data.dps || 0, img: data.img || '', fast: _ft, charge: _ct, type: type, tags: _tt, isDmax: isDmaxEntry };
  }
  save(); 
  if (ST.albumTab === 'raid') renderAlbum(); 
  else renderAlbumDmax(); 
  renderMain(); renderRanking();
  
  if (isDmaxEntry) {
    const dmaxNow = Object.keys(p.album).filter(k => p.album[k] === true && k.startsWith(type + '-dmax-')).length;
    const dmaxLeft = 6 - dmaxNow;
    showToast(dmaxLeft === 0 ? '⚡ Equipo Dynamax completo (' + dmaxNow + '/6)' : '⚡ Añadido · ' + dmaxLeft + ' hueco' + (dmaxLeft === 1 ? '' : 's') + ' libre' + (dmaxLeft === 1 ? '' : 's') + ' (' + dmaxNow + '/6)');
  } else {
    const raidNow = countAlbumForType(p, type);
    const raidLeft = 6 - raidNow;
    showToast(raidLeft === 0 ? '⚔️ Equipo completo (' + raidNow + '/6)' : '⚔️ Añadido · ' + raidLeft + ' hueco' + (raidLeft === 1 ? '' : 's') + ' libre' + (raidLeft === 1 ? '' : 's') + ' (' + raidNow + '/6)');
    if (raidNow === 6 && !hasMegaInTeam(p, type)) {
      showMegaWarning();
    }
  }
};
window.removeFromAlbum = (id) => { const p = gp(ST.cur); if (p && p.album) { delete p.album[id]; if (p.custom) delete p.custom[id]; if (p.pk) delete p.pk[id]; save(); if (ST.albumTab === 'raid') renderAlbum(); else renderAlbumDmax(); renderMain(); } };
window.removeRankEntry = (id, type) => { const p = gp(ST.cur); if (p && p.album) { delete p.album[id]; if (p.custom) delete p.custom[id]; if (p.pk) delete p.pk[id]; save(); if (ST.albumTab === 'raid') renderAlbum(); else renderAlbumDmax(); renderMain(); } };
window.openType = (key) => { navToType(key); show('detail-screen'); switchTab('album'); };
window.selProfileIdx = (i) => { ST.view = ST.profiles[i].name; show('detail-screen'); renderMain(); };
window.viewProfileIdx = (i) => { ST.view = ST.profiles[i].name; show('detail-screen'); renderMain(); };

// Make functions globally available
window.renderMain = renderMain;
window.renderRanking = renderRanking;
window.renderTypeNav = renderTypeNav;
window.switchTab = switchTab;
window.switchAlbumTab = switchAlbumTab;
window.switchRankTab = switchRankTab;
window.expandCard = expandCard;
window.toggleMegaFilter = toggleMegaFilter;
window.navToType = navToType;
window.renderAlbum = renderAlbum;
window.renderAlbumDmax = renderAlbumDmax;
window.removeDmaxEntry = removeDmaxEntry;
window.renderDmaxRanking = renderDmaxRanking;
window.show = show;

// Objetivo functions
window.openObjetivo = openObjetivo;
window.buildObjetivoData = buildObjetivoData;
window.renderObjetivo = renderObjetivo;
window.copyObjetivoFilter = copyObjetivoFilter;
window.openObjPopup = openObjPopup;
window.closeObjPopup = closeObjPopup;
window.toggleObjInfo = toggleObjInfo;
window.updObjCandy = updObjCandy;

// New screen functions
window.showMegaCandy = showMegaCandy;
window.showLegacyGuide = showLegacyGuide;
window.showTypeChart = showTypeChart;
window.openGuia = openGuia;
window.openInfo = openInfo;
window.openDiarias = openDiarias;
window.openLegacy = openLegacy;
window.openPokeparadas = openPokeparadas;
window.openNovedades = openNovedades;
window.backToHome = backToHome;
window.goToTypes = goToTypes;
window.goToFireRanking = goToFireRanking;
window.renderLegacyGuide = renderLegacyGuide;
window.openLegacyPopup = openLegacyPopup;
window.closeLegacyPopup = closeLegacyPopup;
window.renderTypeChart = renderTypeChart;
window.renderDiarias = renderDiarias;
window.addDiaria = addDiaria;
window.renderLegacyAttacks = renderLegacyAttacks;
window.renderPokeparadas = renderPokeparadas;
window.ppTogglePin = ppTogglePin;
window.toggleMegaDevMode = toggleMegaDevMode;
window.toggleMegaInMonth = toggleMegaInMonth;
window.toggleMegaActiveNow = toggleMegaActiveNow;
window.renderMegaGrids = renderMegaGrids;
window.renderMegaMissions = renderMegaMissions;

// ============ LEGACY GUIDE POPUP ============
function openLegacyPopup(id) {
  const p = (window.PD || []).find(x => x.id === id);
  if (!p) return;
  document.getElementById('legacy-popup-img').src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + p.id + '.png';
  document.getElementById('legacy-popup-name').textContent = p.name;
  document.getElementById('legacy-popup-moves').textContent = p.fast + ' / ' + p.charge;
  document.getElementById('legacy-popup-desc').textContent = p.desc || 'Ataque Legacy - solo obtenible con MT Élite o eventos pasados.';
  document.getElementById('legacy-popup').style.display = 'flex';
}

function closeLegacyPopup() {
  document.getElementById('legacy-popup').style.display = 'none';
}

// ============ TYPE CHART ============
let _tcSel = { atk: [], def: [] };

function renderTypeGrid() {
  const grid = document.getElementById('tc-type-grid');
  if (!grid) return;
  grid.innerHTML = (window.TYPES || []).map(t => {
    const isAtk = _tcSel.atk.includes(t.key);
    const isDef = _tcSel.def.includes(t.key);
    return '<button class="tn-btn' + (isAtk || isDef ? ' active' : '') + '" style="background:' + t.color + '" data-type="' + t.key + '" onclick="tcToggleType(\'' + t.key + '\')">' + t.name + '</button>';
  }).join('');
}

function tcToggleType(key) {
  const isAtk = _tcSel.atk.includes(key);
  const isDef = _tcSel.def.includes(key);
  if (isAtk) _tcSel.atk = _tcSel.atk.filter(x => x !== key);
  else if (_tcSel.atk.length < 2) _tcSel.atk.push(key);
  else if (isDef) _tcSel.def = _tcSel.def.filter(x => x !== key);
  else if (_tcSel.def.length < 2) _tcSel.def.push(key);
  renderTypeGrid();
  placeBalls(_tcSel.atk);
  placeBalls(_tcSel.def);
}

function placeBalls(types) {
  const atk = _tcSel.atk;
  const def = _tcSel.def;
  
  function eff(atkT, defT) {
    return (window.TYPE_EFF?.[atkT]?.[defT]) || 1;
  }
  
  function calc(atkTs, defT) {
    return atkTs.reduce((acc, t) => acc * eff(t, defT), 1);
  }
  
  // ATK
  const atkImmune = [];
  const atkResisted = [];
  const atkSuper = [];
  (window.TYPES || []).forEach(t => {
    const e = calc(atkTs, t.key);
    if (e <= 0.39) atkImmune.push(t);
    else if (e < 1) atkResisted.push(t);
    else if (e > 1) atkSuper.push(t);
  });
  
  function renderBall(t, css) {
    return '<div style="display:inline-flex;align-items:center;gap:4px;margin:2px;padding:2px 6px;background:' + t.color + ';border-radius:20px;font-size:11px;font-weight:700;color:#fff"><span>' + t.icon + '</span>' + t.name + '</div>';
  }
  
  const atkImmuneEl = document.getElementById('tc-atk-resisted');
  const atkSuperEl = document.getElementById('tc-atk-super');
  if (atkImmuneEl) atkImmuneEl.innerHTML = atkImmune.map(t => renderBall(t, 'immune')).join('');
  if (atkSuperEl) atkSuperEl.innerHTML = atkSuper.map(t => renderBall(t, 'super')).join('');
  
  // DEF
  const defImmune = [];
  const defResisted = [];
  const defSuper = [];
  const defDouble = [];
  (window.TYPES || []).forEach(t => {
    const e = calc(def, t.key);
    if (e <= 0.39) defImmune.push(t);
    else if (e < 1) defResisted.push(t);
    else if (e < 2) defSuper.push(t);
    else defDouble.push(t);
  });
  
  const defImmuneEl = document.getElementById('tc-def-immune');
  const defResistedEl = document.getElementById('tc-def-resisted');
  const defSuperEl = document.getElementById('tc-def-super');
  const defDoubleEl = document.getElementById('tc-def-double');
  if (defImmuneEl) defImmuneEl.innerHTML = defImmune.map(t => renderBall(t, 'immune')).join('');
  if (defResistedEl) defResistedEl.innerHTML = defResisted.map(t => renderBall(t, 'resisted')).join('');
  if (defSuperEl) defSuperEl.innerHTML = defSuper.map(t => renderBall(t, 'super')).join('');
  if (defDoubleEl) defDoubleEl.innerHTML = defDouble.map(t => renderBall(t, 'double')).join('');
}

function renderTypeChart() {
  renderTypeGrid();
}

export function openGuia() {
  show('guia-screen');
}

export function openInfo() {
  show('info-screen');
}

export function openDiarias() {
  show('diarias-screen');
  renderDiarias();
}

export function openLegacy() {
  show('legacy-screen');
  renderLegacyAttacks();
}

export function openPokeparadas() {
  show('pokeparadas-screen');
  renderPokeparadas();
}

export function openNovedades() {
  show('novedades-screen');
}

export function renderDiarias() {
  const el = document.getElementById('diarias-list');
  if (!el) return;
  const p = gp(ST.cur);
  const casa = p.diarias?.casa || [];
  const calle = p.diarias?.calle || [];
  
  el.innerHTML = `
    <div class="diarias-section">
      <div class="diarias-section-header casa">🏠 Casa</div>
      ${casa.map((d, i) => `<div class="diarias-item">
        <div class="diarias-item-title">${d.title} <span class="diff diff-${d.diff}">${d.diff}</span></div>
        <div class="diarias-item-body">${d.body}</div>
      </div>`).join('') || '<div class="diarias-item"><div class="diarias-item-title">Sin tareas</div></div>'}
      <button class="btn-secondary" onclick="addDiaria('casa')" style="width:100%;margin:8px 0;padding:10px">+ Añadir tarea casa</button>
    </div>
    <div class="diarias-section">
      <div class="diarias-section-header calle">🚶 Calle</div>
      ${calle.map((d, i) => `<div class="diarias-item">
        <div class="diarias-item-title">${d.title} <span class="diff diff-${d.diff}">${d.diff}</span></div>
        <div class="diarias-item-body">${d.body}</div>
      </div>`).join('') || '<div class="diarias-item"><div class="diarias-item-title">Sin tareas</div></div>'}
      <button class="btn-secondary" onclick="addDiaria('calle')" style="width:100%;margin:8px 0;padding:10px">+ Añadir tarea calle</button>
    </div>
  `;
}

export function addDiaria(section) {
  const title = prompt('Título de la tarea:');
  if (!title) return;
  const body = prompt('Descripción (opcional):') || '';
  const diff = prompt('Dificultad (facil/medio/dificil):', 'facil');
  const p = gp(ST.cur);
  if (!p.diarias) p.diarias = { casa: [], calle: [] };
  p.diarias[section].push({ title, body, diff });
  save();
  renderDiarias();
}

export function backToHome() {
  show('main-app-screen');
  document.getElementById('home-menu').style.display = 'block';
  updateHomeMenu();
}

export function goToTypes() {
  show('main-screen');
  renderMain();
}

export function goToFireRanking() {
  if (!ST.cur) { showToast('Selecciona un entrenador primero'); return; }
  ST.type = 'fire';
  ST.tab = 'ranking';
  ST.rankTab = 'raid';
  ST.albumTab = 'raid';
  ST.expanded = null;
  const t = window.TM?.fire;
  if (t) document.getElementById('detail-title').textContent = t.name;
  show('detail-screen');
  document.getElementById('tab-a').className = 'tab';
  document.getElementById('tab-r').className = 'tab active';
  document.getElementById('album-panel').style.display = 'none';
  document.getElementById('ranking-panel').style.display = 'block';
  renderTypeNav();
  renderRanking();
}

export function renderLegacyAttacks() {
  const el = document.getElementById('legacy-attack-list');
  if (!el) return;
  const pd = (window.PD || []).filter(x => x.tags && x.tags.includes('legacy'));
  el.innerHTML = pd.map(p => `
    <div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);display:flex;align-items:center;gap:10px">
      <div style="width:68px;height:68px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border:2px solid #00838f;flex-shrink:0">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png" style="width:58px;height:58px;object-fit:contain" onerror="this.style.opacity=.1">
      </div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:800;color:#222">${p.name}</div>
        <div style="font-size:12px;color:#666;margin-top:4px">${p.fast} / ${p.charge}</div>
        <div style="font-size:11px;color:#999;margin-top:4px">Ataque Legacy - MT Élite necesaria</div>
      </div>
    </div>
  `).join('');
}

export function showMegaCandy() {
  show('megaguide-screen');
  if (window.loadMegaRotation) {
    window.loadMegaRotation().then(() => renderMegaGrids());
  } else {
    renderMegaGrids();
  }
}

export function showLegacyGuide() {
  openLegacy();
}

