// Ranking rendering - Ranking DPS
import { ST, gp, getAlbum, albumPks, countType } from './state.js';
import { showToast, save } from './storage.js';
import { renderBadges, inferTags, show, si } from './helpers.js';

export function renderRanking() {
  const profile = ST.view || ST.cur;
  const isView = !!ST.view;
  const t = window.TM?.[ST.type];
  if (!t) return;
  
  const rawRank = window.RANKINGS?.[ST.type] || [];
  const allPks = (window.PD || []).filter(p => p.type === ST.type);
  const userAlbum = getAlbum(profile);
  
  const albumIds = new Set([
    ...allPks.filter(p => userAlbum[p.id]).map(p => p.id),
    ...Object.keys(userAlbum).filter(id => userAlbum[id] === true && 
      !(window.PD || []).find(p => p.id === id) && 
      (id.startsWith(ST.type + '-ext-') || allPks.find(p => p.id === id)))
  ]);
  
  const pp2 = gp(profile);
  const albumCount = (() => {
    if (!pp2 || pp2.album === undefined || pp2.album === null) return 0;
    const pdC = (window.PD || []).filter(x => pp2.album[x.id] === true && x.type === ST.type && !x.id.includes('-dmax-')).length;
    const custC = pp2.custom ? Object.values(pp2.custom).filter(d => {
      const k = Object.keys(pp2.custom).find(kk => pp2.custom[kk] === d);
      return d.type === ST.type && pp2.album?.[k] === true && !k.includes('-dmax-');
    }).length : 0;
    return pdC + custC;
  })();
  
  const ownedIds = new Set();
  const pp = gp(profile);
  if (pp) allPks.forEach(pk => { if (pp.pk?.[pk.id]?.owned) ownedIds.add(pk.id); });
  
  const aidDps = {};
  allPks.forEach(pk => {
    const saved = pp?.pk?.[pk.id]?.dps !== undefined ? pp.pk[pk.id].dps : null;
    aidDps[pk.id] = saved !== null ? saved : pk.dps;
  });
  
  const combined = [...rawRank];
  allPks.forEach(pk => {
    const pkBase = pk.name.toLowerCase().replace(/^shadow /, '').replace(/^mega /, '').replace(/^primal /, '');
    const alreadyIn = combined.some(r => r.aid === pk.id || 
      r.n.toLowerCase().replace(/^shadow /, '').replace(/^mega /, '').replace(/^primal /, '') === pkBase);
    if (!alreadyIn) combined.push({ 
      n: pk.name, dps: aidDps[pk.id], fast: pk.fast?.replace('*', ''), fastL: pk.fast?.endsWith('*'), 
      charge: pk.charge?.replace('*', ''), chargeL: pk.charge?.endsWith('*'), img: pk.img, aid: pk.id 
    });
  });
  
  const rankExtra = combined.slice(rawRank.length);
  rankExtra.sort((a, b) => b.dps - a.dps);
  
  const fixedCombined = [
    ...rawRank.map(r => combined.find(c => (c.aid && r.aid && c.aid === r.aid) || c.n === r.n) || r),
    ...rankExtra
  ];
  
  const pp4 = gp(profile);
  const hasMegaTeam = hasMegaInTeam(pp4, ST.type);
  const megaFilterOn = !!ST._megaFilter?.[ST.type];
  
  const toggleHtml = hasMegaTeam ? `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 14px 4px;background:#fff8e1;border-bottom:1px solid #ffe082">
      <span style="font-size:11px;color:#795548;font-weight:600">🔴 Tienes un Mega — ocultar Megas del ranking</span>
      <label class="sw" style="flex-shrink:0"><input type="checkbox" ${megaFilterOn ? 'checked' : ''} onchange="toggleMegaFilter('${ST.type}')"><span class="sl"></span></label>
    </div>` : '';
  
  document.getElementById('rank-mega-toggle').innerHTML = toggleHtml;
  
  const filtered = megaFilterOn && hasMegaTeam
    ? fixedCombined.filter(r => {
        const rid = r.aid || (ST.type + '-ext-' + r.n.toLowerCase().replace(/[^a-z0-9]/g, '-'));
        const pe = (window.PD || []).find(x => x.id === rid);
        const tags = inferTags(r.n, r.fastL, r.chargeL, pe?.tags || []);
        return !tags.includes('mega');
      })
    : fixedCombined;
  
  const vis = filtered.slice(0, 50);
  const maxD = vis.length ? Math.max(...vis.map(v => v.dps)) : 1;
  
  document.getElementById('rank-list').innerHTML = vis.map((r, i) => {
    const isA = r.aid && albumIds.has(r.aid);
    const isO = r.aid && ownedIds.has(r.aid);
    const bw = Math.round(r.dps / maxD * 100);
    const nameCol = isA ? t.color : '#222';
    const rowBg = isA ? t.bg : '#fff';
    const ft = (r.fast || '') + (r.fastL ? '⭐' : '');
    const ct = (r.charge || '') + (r.chargeL ? '⭐' : '');
    const isFull = !isView && r.aid && !isA && albumCount >= 6;
    
    if (!ST._rankCache) ST._rankCache = {};
    const rid = r.aid || (ST.type + '-ext-' + r.n.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    const pe3 = (window.PD || []).find(x => x.id === rid);
    const rt3 = inferTags(r.n, r.fastL, r.chargeL, pe3?.tags || []);
    ST._rankCache[rid] = { n: r.n, dps: r.dps, img: r.img, fast: r.fast || '', fastL: r.fastL || false, charge: r.charge || '', chargeL: r.chargeL || false, type: ST.type, tags: rt3 };
    
    const addBtn = !isView ? '<button class="rank-add-btn" onclick="event.stopPropagation();addFromRanking(\\'' + rid + '\\')" title="Añadir a Mis Pokémon">+</button>' : '';
    
    return `<div class="rank-row${isA ? ' ours' : ''}" style="background:${rowBg};--tc:${t.color}">
      <span class="rank-num">#${i + 1}</span>
      <img class="rank-img" src="${si(r.img)}" onerror="this.style.opacity=.1">
      <div class="rank-info">
        <div class="rank-name" style="color:${nameCol}">${r.n.replace(' (Shadow)', '')}${(() => {
          const pe = (window.PD || []).find(x => x.id === rid);
          const rt = inferTags(r.n, r.fastL, r.chargeL, pe?.tags || []);
          return renderBadges(rt) + (isO ? '<span class="badge" style="background:' + t.color + '">TUYO</span>' : '');
        })()}</div>
        <div class="rank-move">${ft} / ${ct}</div>
        <div class="dps-minibar"><div class="dps-minifill" style="width:${bw}%;background:${t.color}"></div></div>
      </div>
      <div class="rank-dps" style="color:${nameCol}">${r.dps.toFixed(2)}</div>
      ${addBtn}
    </div>`;
  }).join('');
}

export function hasMegaInTeam(p, type) {
  if (!p || !p.album) return false;
  for (const id in p.album) {
    if (p.album[id] !== true) continue;
    let tags = [];
    if (p.custom && p.custom[id]) {
      const d = p.custom[id];
      if ((d.type || type) !== type) continue;
      const pdRef = d.pdRef ? (window.PD || []).find(x => x.id === d.pdRef) : null;
      tags = pdRef ? pdRef.tags : (d.tags || inferTags(d.n, false, false, []));
    } else {
      const pd = (window.PD || []).find(x => x.id === id);
      if (!pd || pd.type !== type) continue;
      tags = pd.tags || [];
    }
    if (tags.includes('mega')) return true;
  }
  return false;
}

export function toggleMegaFilter(type) {
  ST._megaFilter = ST._megaFilter || {};
  ST._megaFilter[type] = !ST._megaFilter[type];
  renderRanking();
}

export function addFromRanking(id) {
  if (!ST.cur) return;
  const data = (ST._rankCache && ST._rankCache[id]) || {};
  const type = data.type || ST.type;
  const p = gp(ST.cur);
  if (!p.album) p.album = {};
  if (!p.custom) p.custom = {};
  
  const pdE = (window.PD || []).find(x => x.id === id);
  const isDmaxEntry = id.includes('-dmax-');
  
  if (isDmaxEntry) {
    const dmaxCount = Object.keys(p.album).filter(k => p.album[k] === true && k.startsWith(type + '-dmax-')).length;
    if (dmaxCount >= 6) { showToast('Ya tienes 6 Pokémon Dynamax en este tipo\\nElimina uno primero ⚡'); return; }
    if (dmaxCount === 3) { showToast('⚠️ El equipo óptimo Dynamax es de 3 Pokémon'); }
  } else {
    const typeCount = countType(p, type);
    if (typeCount >= 6) { showToast('Ya tienes 6 Pokémon en este tipo\\nElimina uno primero ⚔️'); return; }
  }
  
  const isMega = (pdE?.tags?.includes('mega')) || (data.n && (data.n.toLowerCase().startsWith('mega ') || data.n.toLowerCase().startsWith('primal ')));
  if (isMega && hasMegaInTeam(p, type)) { showToast('Solo un Mega por equipo\\nSustituye el actual primero 🔴'); return; }
  
  let newId = id;
  let n = 1;
  while (p.album[newId] === true) { newId = id + '-' + n; n++; }
  p.album[newId] = true;
  
  if (pdE) {
    p.custom[newId] = {
      n: pdE.name, dps: pdE.dps, img: pdE.img, fast: pdE.fast, charge: pdE.charge,
      type: pdE.type, pdRef: id,
      tags: inferTags(pdE.name, pdE.fast.endsWith('*'), pdE.charge.endsWith('*'), pdE.tags || [])
    };
  } else if (data.n) {
    const ft = data.fastL && data.fast ? data.fast + '*' : data.fast || '';
    const ct = data.chargeL && data.charge ? data.charge + '*' : data.charge || '';
    const tt = inferTags(data.n, data.fastL, data.chargeL, data.tags || []);
    if (isDmaxEntry && !tt.includes('dynamax')) tt.push('dynamax');
    p.custom[newId] = { n: data.n, dps: data.dps || 0, img: data.img || '', fast: ft, charge: ct, type: type, tags: tt, isDmax: isDmaxEntry };
  }
  
  save();
  import('./album.js').then(m => { m.renderAlbum(); m.renderAlbumDmax(); });
  renderRanking();
  renderMain();
  
  if (isDmaxEntry) {
    const dmaxNow = Object.keys(p.album).filter(k => p.album[k] === true && k.startsWith(type + '-dmax-')).length;
    const dmaxLeft = 6 - dmaxNow;
    showToast(dmaxLeft === 0 ? '⚡ Equipo Dynamax completo (' + dmaxNow + '/6)' : '⚡ Añadido · ' + dmaxLeft + ' hueco' + (dmaxLeft === 1 ? '' : 's') + ' libre' + (dmaxLeft === 1 ? '' : 's') + ' (' + dmaxNow + '/6)');
  } else {
    const raidNow = countType(p, type);
    const raidLeft = 6 - raidNow;
    showToast(raidLeft === 0 ? '⚔️ Equipo completo (' + raidNow + '/6)' : '⚔️ Añadido · ' + raidLeft + ' hueco' + (raidLeft === 1 ? '' : 's') + ' libre' + (raidLeft === 1 ? '' : 's') + ' (' + raidNow + '/6)');
    if (raidNow === 6 && !hasMegaInTeam(p, type)) showMegaWarning();
  }
}

export function removeRankEntry(id, type) {
  if (!ST.cur) return;
  const p = gp(ST.cur);
  if (p.album === undefined || p.album === null) p.album = Object.assign({}, (p.album || {}));
  delete p.album[id];
  if (p.custom) delete p.custom[id];
  ST.expanded = null;
  save();
  import('./album.js').then(m => { m.renderAlbum(); m.renderAlbumDmax(); });
  renderRanking();
  renderMain();
}

export function renderDmaxRanking() {
  const t = window.TM?.[ST.type];
  const rows = window.DMAX?.[ST.type] || [];
  const el = document.getElementById('rank-list-dmax');
  if (!el) return;
  if (!rows.length) { el.innerHTML = '<p style="text-align:center;padding:20px;color:#aaa">Sin datos Dynamax.</p>'; return; }
  const maxD = rows[0].dps;
  const isG = r => r.charge?.startsWith('G-Max') || ['Drum Solo','Vine Lash','Cannonade','Hydrosnipe','Foam Burst','Fireball','Wildfire','Stun Shock','Befuddle','Terror','Snooze','Resonance','Chi Strike','Behemoth'].some(x => r.charge?.includes(x));
  const isView = !!ST.view;
  
  el.innerHTML = rows.map((r, i) => {
    const dname = r.n.replace(/^[GD]-/, '');
    const badge = isG(r) ? '<span style="font-size:9px;background:#7b1fa2;color:#fff;padding:1px 5px;border-radius:6px;margin-left:4px">GMAX</span>' : '<span style="font-size:9px;background:#1565c0;color:#fff;padding:1px 5px;border-radius:6px;margin-left:4px">DMAX</span>';
    const bw = Math.round(r.dps / maxD * 100);
    const did = ST.type + '-dmax-' + r.n.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (!ST._rankCache) ST._rankCache = {};
        ST._rankCache[did] = { n: dname, dps: r.dps, img: r.img, fast: r.fast, charge: r.charge, type: ST.type };
        const addBtn = !isView ? '<button class="rank-add-btn" onclick="event.stopPropagation();addFromRanking(\\'' + did + '\\')" title="Añadir a Mis Pokémon">+</button>' : '';
    return '<div class="rank-row" style="background:#fff"><span class="rank-num">#' + i + '</span><img class="rank-img" src="' + si(r.img) + '" onerror="this.style.opacity=.1"><div class="rank-info"><div class="rank-name" style="color:#222">' + dname + badge + '</div><div class="rank-move" style="color:#888">' + r.fast + ' / ' + r.charge + '</div><div class="dps-minibar"><div class="dps-minifill" style="width:' + bw + '%;background:' + t.color + '"></div></div></div><div class="rank-dps" style="color:#222">' + r.dps.toFixed(1) + '</div>' + addBtn + '</div>';
  }).join('');
}

// Make globals
window.renderRanking = renderRanking;
window.renderDmaxRanking = renderDmaxRanking;
window.addFromRanking = addFromRanking;
window.removeRankEntry = removeRankEntry;
window.toggleMegaFilter = toggleMegaFilter;
window.hasMegaInTeam = hasMegaInTeam;