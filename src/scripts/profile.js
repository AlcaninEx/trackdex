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

// Profile functions
export function addProfile() {
  const inp = document.getElementById('new-name');
  const n = inp.value.trim();
  if (!n) return;
  if (ST.profiles.find(p => p.name === n)) { showToast('Ya existe ese perfil 👤'); return; }
  goc(n);
  inp.value = '';
  import('./firebase.js').then(({ fbSave }) => fbSave(n, { pk: {}, album: null, custom: null }));
  save();
  renderProfiles();
}

export function delProfile(n, e) { 
  e.stopPropagation(); 
  if (!confirm('¿Eliminar a ' + n + '?')) return; 
  ST.profiles = ST.profiles.filter(p => p.name !== n); 
  import('./firebase.js').then(({ fbDelete }) => fbDelete(n)); 
  save(); 
  renderProfiles(); 
}

export function selProfileIdx(i) {
  const p = ST.profiles[i];
  if (!p) return;
  ST.cur = p.name;
  ST.view = null;
  document.getElementById('home-profile-section').style.display = 'none';
  const menu = document.getElementById('home-menu');
  menu.style.display = 'block';
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

export function delProfileIdx(i, e) { 
  const p = ST.profiles[i]; 
  if (p) delProfile(p.name, e); 
}

export function goProfiles() {
  ST.cur = null;
  ST.view = null;
  show('profile-screen');
  document.getElementById('home-menu').style.display = 'none';
  document.getElementById('home-profile-section').style.display = '';
  document.getElementById('trainer-name-bar').textContent = 'Selecciona tu entrenador';
  renderProfiles();
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