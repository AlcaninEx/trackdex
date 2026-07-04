// Main App - UI logic, imports all modules
import { ST, gp, goc, defaultAlbum, getAlbum, getCurrentDpsForName, albumPks, countType } from './state.js';
import { save, load, loadFromFirebase } from './storage.js';
import { 
  getEff, inferTags, renderBadges, showToast, toggleDark, show, evoH, placeBalls, renderBalls,
  SP, si
} from './helpers.js';

// Make globals for backward compatibility with inline handlers
window.ST = ST;
window.gp = gp;
window.goc = goc;
window.getAlbum = getAlbum;
window.getCurrentDpsForName = getCurrentDpsForName;
window.albumPks = albumPks;
window.countType = countType;
window.save = save;
window.load = load;
window.showToast = showToast;
window.toggleDark = toggleDark;
window.show = show;
window.evoH = evoH;
window.inferTags = inferTags;
window.renderBadges = renderBadges;
window.si = si;
window.SP = SP;

// Helper function for renderProfiles
function countOwnedDesired(p) {
  if (!p || !p.album || !p.pk) return { owned: 0, total: 0 };
  let owned = 0, total = 0;
  for (const id in p.album) {
    if (p.album[id] !== true) continue;
    if (id.includes('-dmax-')) continue;
    total++;
    if (p.pk[id] && p.pk[id].owned) owned++;
  }
  return { owned, total };
}

// ============ PROFILE STATES & RENDERING ============

export function renderProfiles() {
  const el = document.getElementById('profiles-list');
  if (!el) return;
  
  if (!ST.profiles.length) {
    // Empty state handled by showOnboardingState()
    el.innerHTML = '';
    return;
  }
  
  el.innerHTML = ST.profiles.map((p, i) => {
    const ini = p.name.substring(0, 2).toUpperCase();
    const { owned, total } = countOwnedDesired(p);
    const hasData = (p.pk && Object.keys(p.pk).length > 0) || (p.album && Object.keys(p.album).length > 0);
    return `
      <li class="profile-row" role="listitem">
        <div class="avatar" aria-hidden="true">${ini}</div>
        <div class="profile-info" onclick="selProfileIdx(${i})" role="button" tabindex="0" onkeydown="event.key==='Enter'&&selProfileIdx(${i})">
          <div class="profile-name">${p.name}</div>
          <div class="profile-stat">${owned}/${total} Pokémon deseados obtenidos${hasData ? ' · Datos guardados' : ' · Nuevo'}</div>
        </div>
        <div class="profile-actions">
          <button class="view-btn" onclick="viewProfileIdx(${i})" aria-label="Ver perfil de ${p.name}">Ver</button>
          <button class="del-btn" onclick="delProfileIdx(${i}, event)" aria-label="Eliminar ${p.name}" title="Eliminar">✕</button>
        </div>
      </li>
    `;
  }).join('');
}

export function updateProfileCount() {
  const el = document.getElementById('profiles-count');
  if (el) {
    const count = ST.profiles.length;
    el.textContent = count === 1 ? '1 entrenador' : `${count} entrenadores`;
  }
}

// ============ STATE MANAGEMENT ============

export function showOnboardingState() {
  document.getElementById('onboarding-state').style.display = 'block';
  document.getElementById('profiles-state').style.display = 'none';
  document.getElementById('home-menu').style.display = 'none';
  document.getElementById('home-profile-section').style.display = 'block';
  document.getElementById('trainer-name-bar').textContent = 'Selecciona tu entrenador';
  updateProfileCount();
}

export function showProfilesState() {
  document.getElementById('onboarding-state').style.display = 'none';
  document.getElementById('profiles-state').style.display = 'block';
  document.getElementById('home-menu').style.display = 'none';
  document.getElementById('home-profile-section').style.display = 'block';
  document.getElementById('trainer-name-bar').textContent = 'Selecciona tu entrenador';
  renderProfiles();
  updateProfileCount();
}

export function showHomeMenu() {
  document.getElementById('onboarding-state').style.display = 'none';
  document.getElementById('profiles-state').style.display = 'none';
  document.getElementById('home-menu').style.display = 'block';
  document.getElementById('home-profile-section').style.display = 'none';
  document.getElementById('trainer-name-bar').textContent = '👋 ' + ST.cur;
}

// ============ PROFILE ACTIONS ============

export function createFirstProfile() {
  const inp = document.getElementById('onboarding-name');
  const name = inp.value.trim();
  if (!name) { showToast('Escribe tu nombre 👤'); inp.focus(); return; }
  if (ST.profiles.find(p => p.name === name)) { showToast('Ya existe ese perfil 👤'); return; }
  
  goc(name);
  inp.value = '';
  import('./firebase.js').then(({ fbSave }) => fbSave(name, { pk: {}, album: null, custom: null }));
  save();
  showToast(`¡Bienvenido, ${name}! 🎉`);
  showHomeMenu();
  updateHomeMenu();
}

export function addProfile(e) {
  if (e) e.preventDefault();
  const inp = document.getElementById('new-name');
  const n = inp.value.trim();
  if (!n) return;
  if (ST.profiles.find(p => p.name === n)) { showToast('Ya existe ese perfil 👤'); return; }
  goc(n);
  inp.value = '';
  hideAddProfileForm();
  import('./firebase.js').then(({ fbSave }) => fbSave(n, { pk: {}, album: null, custom: null }));
  save();
  renderProfiles();
  updateProfileCount();
  showToast(`Perfil "${n}" creado 👤`);
}

export function showAddProfileForm() {
  document.querySelector('.btn-add-profile').style.display = 'none';
  document.getElementById('add-profile-form').style.display = 'block';
  document.getElementById('new-name').focus();
}

export function hideAddProfileForm() {
  document.querySelector('.btn-add-profile').style.display = 'flex';
  document.getElementById('add-profile-form').style.display = 'none';
  document.getElementById('new-name').value = '';
}

export function delProfile(n, e) { 
  e.stopPropagation(); 
  if (!confirm('¿Eliminar a ' + n + '?')) return; 
  ST.profiles = ST.profiles.filter(p => p.name !== n); 
  import('./firebase.js').then(({ fbDelete }) => fbDelete(n)); 
  save(); 
  renderProfiles();
  updateProfileCount();
  showToast('Perfil eliminado 🗑️');
  
  // If no profiles left, show onboarding
  if (!ST.profiles.length) {
    showOnboardingState();
  }
}

export function delProfileIdx(i, e) { 
  const p = ST.profiles[i]; 
  if (p) delProfile(p.name, e); 
}

export function selProfileIdx(i) {
  const p = ST.profiles[i];
  if (!p) return;
  ST.cur = p.name;
  ST.view = null;
  showHomeMenu();
  document.getElementById('home-menu').style.display = 'block';
  document.getElementById('home-profile-section').style.display = 'none';
  document.getElementById('trainer-name-bar').textContent = '👋 ' + p.name;
  updateHomeMenu();
}

export function viewProfileIdx(i) { 
  const p = ST.profiles[i]; 
  if (!p) return; 
  if (!ST.cur) { showToast('Primero selecciona tu perfil 👤'); return; }
  ST.view = p.name;
  show('main-screen');
  renderMain();
}

export function goProfiles() {
  ST.cur = null;
  ST.view = null;
  show('profile-screen');
  document.getElementById('home-menu').style.display = 'none';
  document.getElementById('home-profile-section').style.display = '';
  document.getElementById('trainer-name-bar').textContent = 'Selecciona tu entrenador';
  
  if (ST.profiles.length === 0) {
    showOnboardingState();
  } else {
    showProfilesState();
  }
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

export function backToHome() {
  show('profile-screen');
  document.getElementById('home-profile-section').style.display = 'none';
  const menu = document.getElementById('home-menu');
  menu.style.display = 'block';
  document.getElementById('trainer-name-bar').textContent = '👋 ' + ST.cur;
  updateHomeMenu();
}

export function goBack() { 
  ST.expanded = null; 
  show('main-screen'); 
  renderMain(); 
}

export function updateHomeMenu() {
  // Update progress bars in home menu
  const p = ST.profiles.find(x => x.name === ST.cur);
  if (!p) return;
  
  const raidOwned = Object.values(p.pk || {}).filter(x => x.owned && !x.dmax).length;
  const dmaxOwned = Object.values(p.pk || {}).filter(x => x.dmax).length;
  
  document.getElementById('hm-raid-count').textContent = raidOwned;
  document.getElementById('hm-raid-bar').style.width = Math.min(100, (raidOwned / 102) * 100) + '%';
  document.getElementById('hm-dmax-count').textContent = dmaxOwned;
  document.getElementById('hm-dmax-bar').style.width = Math.min(100, (dmaxOwned / 51) * 100) + '%';
}

// Make functions globally available for inline onclick handlers
window.addProfile = addProfile;
window.delProfile = delProfile;
window.selProfileIdx = selProfileIdx;
window.viewProfileIdx = viewProfileIdx;
window.delProfileIdx = delProfileIdx;
window.goProfiles = goProfiles;
window.goToTypes = goToTypes;
window.goToFireRanking = goToFireRanking;
window.backToHome = backToHome;
window.goBack = goBack;
window.showAddProfileForm = showAddProfileForm;
window.hideAddProfileForm = hideAddProfileForm;
window.createFirstProfile = createFirstProfile;