// Album rendering - Mis Pokémon
import { ST, gp, albumPks, getAlbum } from './state.js';
import { save, showToast } from './storage.js';
import { renderBadges, inferTags, toggleDark, show, si, evoH } from './helpers.js';

let _toastTimer = null;

export function renderAlbum() {
  const profile = ST.view || ST.cur;
  const isView = !!ST.view;
  const t = window.TM?.[ST.type];
  if (!t) return;
  
  const pks = albumPks(profile, ST.type);
  const maxD = Math.max(...pks.map(p => p.dps), 1);
  
  const pp0 = gp(profile);
  const ownedCount = pks.filter(pk => pp0?.pk?.[pk.id]?.owned).length;
  
  const teamHeader = `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px 6px;background:rgba(0,0,0,.18);border-bottom:1px solid rgba(255,255,255,.15)">
    <span style="font-size:12px;font-weight:700;color:#fff">Equipo deseado</span>
    <span style="font-size:12px;font-weight:700;color:#fff">En propiedad <span id="album-owned-count">${ownedCount}/6</span></span>
  </div>`;
  
  const empty = Array(Math.max(0, 6 - pks.length)).fill(
    '<div class="empty-slot"><div class="empty-slot-icon">❓</div><div class="empty-slot-txt"><b>Slot vacío</b><br>Necesitas equipo de 6 para incursiones</div></div>'
  ).join('');
  
  const listEl = document.getElementById('album-list');
  if (!listEl) return;
  
  listEl.innerHTML = teamHeader + pks.map(pk => {
    const pp = gp(profile);
    const pd = pp?.pk?.[pk.id] || {};
    const isOwned = pd.owned || false;
    const isLegacy = pd.legacy || false;
    const ia = pd.ivAtk || 0, id = pd.ivDef || 0, ih = pd.ivHp || 0;
    const baseDps = pk.dps;
    const bs = window.BASE_STATS?.[pk.id] || [200, 150, 180];
    const realDps = baseDps * (bs[0] + ia) / (bs[0] + 15);
    const dd = realDps;
    const bw = Math.round((realDps / maxD) * 100);
    const isOpen = ST.expanded === pk.id;
    const isShadow = pk.tags?.includes('shadow');
    const tagsHtml = renderBadges(inferTags(pk.name || pk.n || '', pk.fast?.endsWith('*'), pk.charge?.endsWith('*'), pk.tags || []));
    const fd = pk.fast?.replace('*', '');
    const cd = pk.charge?.replace('*', '');
    const fl = pk.fast?.endsWith('*');
    const cl = pk.charge?.endsWith('*');
    
    const mvH = `<div class="mv-box">
      <div class="mv-row"><span class="mv-lbl">Rápido</span><span class="mv-name">${fd}${fl ? '<span class="leg-star">⭐</span>' : ''}</span></div>
      <div class="mv-row"><span class="mv-lbl">Cargado</span><span class="mv-name">${cd}${cl ? '<span class="leg-star">⭐</span>' : ''}</span></div>
    </div>`;
    
    const pctA = Math.round((bs[0] + ia) / (bs[0] + 15) * 100);
    const pctD = Math.round((bs[1] + id) / (bs[1] + 15) * 100);
    const pctH = Math.round((bs[2] + ih) / (bs[2] + 15) * 100);
    
    const ownedToggle = !isView ? `
      <div class="tr" style="margin-bottom:8px;padding:8px 12px;background:${isOwned ? '#e8f5e9' : '#f5f5f5'};border-radius:8px;border:1.5px solid ${isOwned ? '#43a047' : '#ddd'}">
        <span style="font-size:13px;font-weight:700;color:${isOwned ? '#2e7d32' : '#555'}">${isOwned ? '✅ Obtenido' : '¿Lo tienes?'}</span>
        <label class="sw" onclick="event.stopPropagation()"><input type="checkbox" ${isOwned ? 'checked' : ''} onchange="togOwned('${pk.id}',this.checked)"><span class="sl"></span></label>
      </div>` : '';
    
    const isMaxed = pd.maxed || false;
    const maxToggle = !isView ? `
      <div class="tr" style="margin-bottom:10px;padding:8px 12px;background:${isMaxed ? '#fff8e1' : '#f5f5f5'};border-radius:8px;border:1.5px solid ${isMaxed ? '#ffb300' : '#ddd'}">
        <span style="font-size:13px;font-weight:700;color:${isMaxed ? '#e65100' : '#555'}">${isMaxed ? '⭐ Al máximo' : '¿Lo tengo al máximo?'}</span>
        <label class="sw" onclick="event.stopPropagation()"><input type="checkbox" ${isMaxed ? 'checked' : ''} onchange="togMaxed('${pk.id}',this.checked)"><span class="sl"></span></label>
      </div>` : '';
    
    const editF = `${ownedToggle}${maxToggle}
      <div class="fr" style="margin-top:4px">
        <div class="fl">DPS con tus IVs</div>
        <p style="font-size:18px;font-weight:700;color:#222"><span id="dps-real-${pk.id}">${dd.toFixed(2)}</span> <span style="font-size:12px;color:#888;font-weight:400">/ Max ${baseDps.toFixed(2)}</span></p>
      </div>
      <div class="fr"><div class="fl">IVs</div>
        <div class="iv-grid">
          <div class="iv-col"><div class="iv-lbl">Ataque</div><div class="iv-val" id="ia-${pk.id}">${ia}<span style="font-size:10px;color:#888;font-weight:400"> (${pctA}%)</span></div><input type="range" min="0" max="15" value="${ia}" oninput="updIV('${pk.id}','a',this.value)"></div>
          <div class="iv-col"><div class="iv-lbl">Defensa</div><div class="iv-val" id="id-${pk.id}">${id}<span style="font-size:10px;color:#888;font-weight:400"> (${pctD}%)</span></div><input type="range" min="0" max="15" value="${id}" oninput="updIV('${pk.id}','d',this.value)"></div>
          <div class="iv-col"><div class="iv-lbl">Vida</div><div class="iv-val" id="ih-${pk.id}">${ih}<span style="font-size:10px;color:#888;font-weight:400"> (${pctH}%)</span></div><input type="range" min="0" max="15" value="${ih}" oninput="updIV('${pk.id}','h',this.value)"></div>
        </div>
      </div>
      <div class="fr"><div class="fl">Moveset</div>${mvH}</div>`;
    
    const viewF = `<div class="fr"><div class="fl">DPS con sus IVs</div><p style="font-size:18px;font-weight:700;color:#222"><span id="dps-real-${pk.id}">${dd.toFixed(2)}</span> <span style="font-size:12px;color:#888;font-weight:400">/ Max ${baseDps.toFixed(2)}</span></p></div><div class="fr"><div class="fl">Moveset</div>${mvH}</div>`;
    
    const removeBtn = !isView ? (pk.isCustom 
      ? `<button class="album-remove" onclick="event.stopPropagation();removeRankEntry('${pk.id}','${ST.type}')">✕</button>`
      : `<button class="album-remove" onclick="event.stopPropagation();removeFromAlbum('${pk.id}')">✕</button>`
    ) : '';
    
    const evoDisplay = pk.isCustom 
      ? `<div class="final-wrap"><img class="final-img" src="${si(pk.img)}" onerror="this.style.opacity=.1"></div>`
      : evoH(pk.evo, pk.img, isShadow);
    
    const _pkOwned = !!(pp0?.pk?.[pk.id]?.owned);
    const _pkMaxed = !!(pp0?.pk?.[pk.id]?.maxed);
    const tickHtml = `<div class="pk-ticks" title="${_pkMaxed ? 'Al máximo' : _pkOwned ? 'Lo tienes' : 'Pendiente'}"><span class="pk-tick${_pkOwned ? ' on' : ''}">✓</span><span class="pk-tick${_pkMaxed ? ' on' : ''}">✓</span></div>`;
    
    return `<div class="pk-card" id="c-${pk.id}" style="background:${t.color}">
      <div class="pk-top" onclick="togCard('${pk.id}')">
        <div style="display:flex;align-items:center;gap:2px;flex-shrink:0">${evoDisplay}</div>
        <div class="pk-info">
          <div class="pk-name">${pk.name.replace(' (Shadow)', '')}</div>
          ${pk.tags?.length ? `<div class="tags-row">${tagsHtml}</div>` : ''}
          <div class="dps-wrap">
            <div class="dps-lbl"><span>DPS <span id="dps-bar-${pk.id}">${dd.toFixed(2)}</span></span><span style="color:rgba(255,255,255,.6);font-size:9px">Max ${baseDps.toFixed(2)}</span></div>
            <div class="dps-bar"><div class="dps-fill" style="width:${bw}%"></div></div>
          </div>
        </div>
        ${tickHtml}
        ${removeBtn}
      </div>
      <div class="pk-body${isOpen ? ' open' : ''}">${isView ? viewF : editF}</div>
    </div>`;
  }).join('') + empty;
}

export function renderAlbumDmax() {
  const t = window.TM?.[ST.type];
  const isView = !!ST.view;
  const rows = window.DMAX?.[ST.type] || [];
  const el = document.getElementById('album-list-dmax');
  if (!el) return;
  
  if (!rows.length) { el.innerHTML = '<p style="text-align:center;padding:20px;color:#aaa">Sin datos Dynamax.</p>'; return; }
  
  const p2 = gp(ST.view || ST.cur);
  const userDmaxIds = p2?.album ? Object.keys(p2.album).filter(id => p2.album[id] === true && id.startsWith(ST.type + '-dmax-')) : [];
  
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
  const emptyDmax = Array(Math.max(0, dmaxMax - slots.length)).fill(
    '<div class="empty-slot"><div class="empty-slot-icon">⚡</div><div class="empty-slot-txt"><b>Slot vacío</b><br>Máx recomendado: 3</div></div>'
  ).join('');
  
  const dmaxWarn = slots.length > 3 ? '<div style="padding:6px 14px;background:#fff3e0;border-bottom:1px solid #ffe082;font-size:11px;color:#e65100;font-weight:600">⚠️ El equipo óptimo Dynamax es de 3. Tienes ' + slots.length + '.</div>' : '';
  
  if (!slots.length) { el.innerHTML = emptyDmax; return; }
  
  const isG = r => r.charge?.startsWith('G-Max') || ['Drum Solo','Vine Lash','Cannonade','Hydrosnipe','Foam Burst','Fireball','Wildfire','Stun Shock','Befuddle','Terror','Snooze','Resonance','Chi Strike','Behemoth'].some(x => r.charge?.includes(x));
  
  el.innerHTML = dmaxWarn + slots.map(({ r, albumId }) => {
    const pdd = (p2?.pk?.[albumId]) || {};
    const dIsOwned = pdd.owned || false;
    const dIsMaxed = pdd.maxed || false;
    const dToggles = !isView ? `
      <div style="padding:8px 12px;background:rgba(255,255,255,.92)">
        <div class="tr" style="margin-bottom:6px;padding:6px 10px;background:${dIsOwned ? '#e8f5e9' : '#f5f5f5'};border-radius:8px;border:1.5px solid ${dIsOwned ? '#43a047' : '#ddd'}">
          <span style="font-size:12px;font-weight:700;color:${dIsOwned ? '#2e7d32' : '#555'}">${dIsOwned ? '✅ Obtenido' : '¿Lo tienes?'}</span>
          <label class="sw" onclick="event.stopPropagation()"><input type="checkbox" ${dIsOwned ? 'checked' : ''} onchange="togOwned('${albumId}',this.checked)"><span class="sl"></span></label>
        </div>
        <div class="tr" style="padding:6px 10px;background:${dIsMaxed ? '#fff8e1' : '#f5f5f5'};border-radius:8px;border:1.5px solid ${dIsMaxed ? '#ffb300' : '#ddd'}">
          <span style="font-size:12px;font-weight:700;color:${dIsMaxed ? '#e65100' : '#555'}">${dIsMaxed ? '⭐ Al máximo' : '¿Lo tengo al máximo?'}</span>
          <label class="sw" onclick="event.stopPropagation()"><input type="checkbox" ${dIsMaxed ? 'checked' : ''} onchange="togMaxed('${albumId}',this.checked)"><span class="sl"></span></label>
        </div>
      </div>` : '';
    
    const dIsOpen = ST.expanded === albumId;
    const dInner = !isView ? `<div style="padding:8px 12px;font-size:11px;color:rgba(255,255,255,.8)">${r.fast} → ${r.charge}</div>${dToggles}` : `<div style="padding:8px 12px;font-size:11px;color:rgba(255,255,255,.8)">${r.fast} → ${r.charge}</div>`;
    
    const dTickHtml = `<div class="pk-ticks" title="${dIsMaxed ? 'Al máximo' : dIsOwned ? 'Lo tienes' : 'Pendiente'}"><span class="pk-tick${dIsOwned ? ' on' : ''}">✓</span><span class="pk-tick${dIsMaxed ? ' on' : ''}">✓</span></div>`;
    
    const rb = !isView ? `<button class="album-remove" onclick="event.stopPropagation();removeDmaxEntry('${albumId}')">✕</button>` : '';
    
    return `<div class="pk-card" id="c-${albumId}" style="background:${t.color}">
      <div class="pk-top" onclick="togCard('${albumId}')">
        <div style="flex-shrink:0"><div class="final-wrap"><img class="final-img" src="${si(r.img)}" onerror="this.style.opacity=.1"></div></div>
        <div class="pk-info">
          <div class="pk-name">${r.n.replace(/^[GD]-/, '')}</div>
          <div class="tags-row">${isG(r) ? '<span class="tag" style="background:#7b1fa2;color:#fff;font-size:9px">GMAX</span>' : '<span class="tag" style="background:#1565c0;color:#fff;font-size:9px">DMAX</span>'}</div>
          <div class="dps-wrap"><div class="dps-lbl"><span>Max Dmg</span><span>${r.dps.toFixed(1)}</span></div><div class="dps-bar"><div class="dps-fill" style="width:${Math.round(r.dps/maxD*100)}%"></div></div></div>
        </div>
        ${dTickHtml}${rb}
      </div>
      <div class="pk-body${dIsOpen ? ' open' : ''}">${dInner}</div>
    </div>`;
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

// Toggle functions
export function togOwned(id, v) {
  const p = gp(ST.cur);
  if (!p.pk[id]) p.pk[id] = {};
  p.pk[id].owned = v;
  if (!v && p.pk[id].maxed) p.pk[id].maxed = false;
  save();
  
  const card = document.getElementById('c-' + id);
  if (card) card.className = 'pk-card' + (v ? '' : ' not-owned');
  
  const pks = albumPks(ST.cur, ST.type);
  const ownedNow = pks.filter(pk => p?.pk?.[pk.id]?.owned).length;
  const hdr = document.getElementById('album-owned-count');
  if (hdr) hdr.textContent = ownedNow + '/6';
  
  if (ST.albumTab === 'dmax') renderAlbumDmax(); else renderAlbum();
  renderMain();
  renderRanking();
  renderProfiles();
}

export function togMaxed(id, v) {
  const p = gp(ST.cur);
  if (!p.pk[id]) p.pk[id] = {};
  p.pk[id].maxed = v;
  if (v) p.pk[id].owned = true;
  save();
  if (ST.albumTab === 'dmax') renderAlbumDmax(); else renderAlbum();
  renderMain();
  renderRanking();
  renderProfiles();
}

export function togLeg(id, v) { 
  const p = gp(ST.cur); 
  if (!p.pk[id]) p.pk[id] = {}; 
  p.pk[id].legacy = v; 
  save(); 
}

export function updIV(id, s, v) {
  const n = parseInt(v);
  const p = gp(ST.cur);
  if (!p.pk[id]) p.pk[id] = {};
  const bs = window.BASE_STATS?.[id] || [200, 150, 180];
  
  if (s === 'a') {
    p.pk[id].ivAtk = n;
    const pct = Math.round((bs[0] + n) / (bs[0] + 15) * 100);
    const el = document.getElementById('ia-' + id);
    if (el) el.innerHTML = n + '<span style="font-size:10px;color:#888;font-weight:400"> (' + pct + '%)</span>';
    
    const pk = window.PD?.find(x => x.id === id) || (p.custom && p.custom[id] ? { dps: p.custom[id].dps } : null);
    if (pk) {
      const realDps = pk.dps * (bs[0] + n) / (bs[0] + 15);
      const dpsEl = document.getElementById('dps-real-' + id);
      if (dpsEl) dpsEl.textContent = realDps.toFixed(2);
      const dpsBar = document.getElementById('dps-bar-' + id);
      if (dpsBar) dpsBar.textContent = realDps.toFixed(2);
    }
  }
  if (s === 'd') {
    p.pk[id].ivDef = n;
    const pct = Math.round((bs[1] + n) / (bs[1] + 15) * 100);
    const el = document.getElementById('id-' + id);
    if (el) el.innerHTML = n + '<span style="font-size:10px;color:#888;font-weight:400"> (' + pct + '%)</span>';
  }
  if (s === 'h') {
    p.pk[id].ivHp = n;
    const pct = Math.round((bs[2] + n) / (bs[2] + 15) * 100);
    const el = document.getElementById('ih-' + id);
    if (el) el.innerHTML = n + '<span style="font-size:10px;color:#888;font-weight:400"> (' + pct + '%)</span>';
  }
  save();
}

export function updDPS(id, v) { 
  const n = parseFloat(v); 
  const p = gp(ST.cur); 
  if (!p.pk[id]) p.pk[id] = {}; 
  p.pk[id].dps = isNaN(n) ? undefined : n; 
  save(); 
}

export function togCard(id) { 
  ST.expanded = ST.expanded === id ? null : id; 
  if (ST.albumTab === 'dmax') renderAlbumDmax(); else renderAlbum(); 
}

// Make globals
window.togOwned = togOwned;
window.togMaxed = togMaxed;
window.togLeg = togLeg;
window.updIV = updIV;
window.updDPS = updDPS;
window.togCard = togCard;
window.renderAlbum = renderAlbum;
window.renderAlbumDmax = renderAlbumDmax;
window.removeDmaxEntry = removeDmaxEntry;