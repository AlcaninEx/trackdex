// Main screen rendering
import { ST, gp, countType, albumPks } from './state.js';
import { save, showToast } from './storage.js';
import { toggleDark, show, si } from './helpers.js';

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

export function openType(k) {
  ST.type = k;
  ST.expanded = null;
  ST.tab = 'album';
  ST.rankTab = 'raid';
  ST.albumTab = 'raid';
  
  const t = window.TM?.[k];
  if (t) {
    document.getElementById('detail-title').innerHTML = 
      '<span style="display:inline-flex;align-items:center;gap:6px;color:#fff">' +
      '<span style="width:20px;height:20px;display:inline-flex;align-items:center">' + t.icon + '</span>' + t.name + '</span>';
  }
  
  document.getElementById('tab-a').className = 'tab active';
  document.getElementById('tab-r').className = 'tab';
  document.getElementById('album-panel').style.display = '';
  document.getElementById('ranking-panel').style.display = 'none';
  document.getElementById('atab-raid').className = 'album-subtab active';
  document.getElementById('atab-dmax').className = 'album-subtab';
  document.getElementById('apanel-raid').style.display = '';
  document.getElementById('apanel-dmax').style.display = 'none';
  document.getElementById('rtab-raid').className = 'tab active';
  document.getElementById('rtab-dmax').className = 'tab';
  document.getElementById('rpanel-raid').style.display = '';
  document.getElementById('rpanel-dmax').style.display = 'none';
  
  const vb = document.getElementById('view-badge-wrap');
  if (ST.view) { vb.style.display = 'flex'; document.getElementById('view-name').textContent = ST.view; } 
  else vb.style.display = 'none';
  
  import('./album.js').then(m => m.renderAlbum());
  import('./ranking.js').then(m => m.renderRanking());
  show('detail-screen');
  renderTypeNav();
  renderMain();
}

export function renderTypeNav() {
  const strip = document.getElementById('type-nav-strip');
  if (!strip) return;
  strip.innerHTML = (window.TYPES || []).map(t => 
    `<button class="tn-btn${ST.type === t.key ? ' active' : ''}" style="background:${t.color}" onclick="navToType('${t.key}')">${t.name}</button>`
  ).join('');
}

export function navToType(key) {
  ST.type = key;
  ST.expanded = null;
  const t = window.TM?.[key];
  if (t) document.getElementById('detail-title').innerHTML = 
    '<span style="display:inline-flex;align-items:center;gap:6px;color:#fff">' +
    '<span style="width:20px;height:20px;display:inline-flex;align-items:center">' + t.icon + '</span>' + t.name + '</span>';
  renderTypeNav();
  import('./album.js').then(m => m.renderAlbum());
  import('./ranking.js').then(m => m.renderRanking());
  import('./album.js').then(m => m.renderAlbumDmaxAlbumDmax());
  if (ST.rankTab === 'dmax') import('./ranking.js').then(m => m.renderDmaxRanking());
  renderMain();
}

export function switchTab(t) {
  ST.tab = t;
  document.getElementById('tab-a').className = 'tab' + (t === 'album' ? ' active' : '');
  document.getElementById('tab-r').className = 'tab' + (t === 'ranking' ? ' active' : '');
  document.getElementById('album-panel').style.display = t === 'album' ? '' : 'none';
  document.getElementById('ranking-panel').style.display = t === 'ranking' ? '' : 'none';
  
  const sharedMode = (t === 'ranking') ? ST.albumTab : ST.rankTab;
  if (t === 'ranking') switchRankTab(sharedMode);
  if (t === 'album') switchAlbumTab(sharedMode);
}

export function switchAlbumTab(tab) {
  ST.albumTab = tab;
  document.getElementById('atab-raid').className = 'album-subtab' + (tab === 'raid' ? ' active' : '');
  document.getElementById('atab-dmax').className = 'album-subtab' + (tab === 'dmax' ? ' active' : '');
  document.getElementById('apanel-raid').style.display = tab === 'raid' ? '' : 'none';
  document.getElementById('apanel-dmax').style.display = tab === 'dmax' ? '' : 'none';
  if (tab === 'dmax') import('./album.js').then(m => m.renderAlbumDmax());
  renderTypeNav();
}

export function switchRankTab(tab) {
  ST.rankTab = tab;
  renderTypeNav();
  document.getElementById('rtab-raid').className = 'tab' + (tab === 'raid' ? ' active' : '');
  document.getElementById('rtab-dmax').className = 'tab' + (tab === 'dmax' ? ' active' : '');
  document.getElementById('rpanel-raid').style.display = tab === 'raid' ? '' : 'none';
  document.getElementById('rpanel-dmax').style.display = tab === 'dmax' ? '' : 'none';
  if (tab === 'dmax') import('./ranking.js').then(m => m.renderDmaxRanking());
}

export function updateHomeMenu() {
  const p = gp(ST.cur);
  if (!p) return;
  let raidCount = 0;
  let dmaxCount = 0;
  const album = p.album || {};
  Object.keys(album).forEach(id => {
    if (album[id] === true) {
      if (id.includes('-dmax-')) dmaxCount++;
      else raidCount++;
    }
  });
  const raidMax = 102;
  const dmaxMax = 51;
  document.getElementById('hm-raid-count').textContent = raidCount;
  document.getElementById('hm-dmax-count').textContent = dmaxCount;
  document.getElementById('hm-raid-bar').style.width = Math.min(100, Math.round(raidCount / raidMax * 100)) + '%';
  document.getElementById('hm-dmax-bar').style.width = Math.min(100, Math.round(dmaxCount / dmaxMax * 100)) + '%';
}

// Make globals
window.openType = openType;
window.navToType = navToType;
window.switchTab = switchTab;
window.switchAlbumTab = switchAlbumTab;
window.switchRankTab = switchRankTab;
window.renderTypeNav = renderTypeNav;
window.renderMain = renderMain;
window.updateHomeMenu = updateHomeMenu;