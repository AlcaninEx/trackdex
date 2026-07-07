// Profile/Community/Navigation module - NEW ARCHITECTURE
// Community-first, identity per community, global user identity
import { ST } from './state.js';
import { 
  saveCommunityList, loadCommunityList,
  createCommunity, joinCommunity, leaveCommunity,
  globalLogin, globalRegister, globalLogout,
  verifyGlobalPassword, saveGlobalUser, loadGlobalUser,
  clearGlobalSession,
  loadCommunitiesFromFirebase
} from './storage.js';
import { renderMain, renderRanking, renderTypeNav, switchTab, switchAlbumTab, switchRankTab, expandCard, toggleMegaFilter } from './ui.js';
import { toggleDark, show, showToast } from './helpers.js';

// ============ GLOBAL AUTH STATE ============

export function initGlobalAuth() {
  // Load global user from localStorage (remember me)
  const saved = localStorage.getItem('pokeBCN_globalUser');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      ST.globalUserId = user.userId;
      ST.globalUserPassword = user.password;
      ST.rememberMe = true;
    } catch(e) {
      localStorage.removeItem('pokeBCN_globalUser');
    }
  }
  
  // Load communities list
  loadCommunityList();
}

// ============ GLOBAL LOGIN ============

export async function globalLoginHandler(e) {
  e.preventDefault();
  const userId = document.getElementById('global-user-id').value.trim().toLowerCase();
  const password = document.getElementById('global-user-password').value;
  const rememberMe = document.getElementById('remember-me').checked;
  
  if (!userId) { showToast('Escribe tu ID de usuario'); document.getElementById('global-user-id').focus(); return; }
  if (!password) { showToast('Escribe tu contraseña'); document.getElementById('global-user-password').focus(); return; }
  
  try {
    await globalLogin(userId, password);
    
    if (rememberMe) {
      localStorage.setItem('pokeBCN_globalUser', JSON.stringify({ userId, password }));
    } else {
      localStorage.removeItem('pokeBCN_globalUser');
    }
    
    ST.rememberMe = rememberMe;
    showToast(`¡Bienvenido, ${userId}! 🎉`);
    showCommunitySelection();
  } catch (err) {
    showToast(err.message || 'Error al iniciar sesión');
  }
}

export async function globalRegisterHandler(e) {
  e.preventDefault();
  const userId = document.getElementById('reg-global-user-id').value.trim().toLowerCase();
  const password = document.getElementById('reg-global-user-password').value;
  const confirm = document.getElementById('reg-global-user-confirm').value;
  
  if (!userId) { showToast('Escribe tu ID de usuario'); document.getElementById('reg-global-user-id').focus(); return; }
  if (!/^[a-z0-9_-]+$/.test(userId)) { showToast('Solo letras, números, guiones y guiones bajos'); document.getElementById('reg-global-user-id').focus(); return; }
  if (!password) { showToast('Escribe una contraseña'); document.getElementById('reg-global-user-password').focus(); return; }
  if (password.length < 4) { showToast('Mínimo 4 caracteres'); document.getElementById('reg-global-user-password').focus(); return; }
  if (password !== confirm) { showToast('Las contraseñas no coinciden'); document.getElementById('reg-global-user-confirm').focus(); return; }
  
  try {
    await globalRegister(userId, password);
    showToast(`¡Cuenta creada! Bienvenido, ${userId} 🎉`);
    showCommunitySelection();
  } catch (err) {
    showToast(err.message || 'Error al crear cuenta');
  }
}

export function globalLogoutHandler() {
  globalLogout();
  showToast('Sesión cerrada');
  showGlobalLogin();
}

// ============ SCREEN:COMMUNITY SELECTION ============

export function showGlobalLogin() {
  ST.authState = 'global_login';
  show('global-login-screen');
  document.getElementById('global-user-id').value = ST.globalUserId || '';
  document.getElementById('global-user-password').value = '';
  document.getElementById('remember-me').checked = ST.rememberMe || false;
  document.getElementById('global-user-id').focus();
}

export function showGlobalRegister() {
  ST.authState = 'global_register';
  show('global-register-screen');
  document.getElementById('reg-global-user-id').value = '';
  document.getElementById('reg-global-user-password').value = '';
  document.getElementById('reg-global-user-confirm').value = '';
  document.getElementById('reg-global-user-id').focus();
}

export function showCommunitySelection() {
  if (!ST.globalUserId) { showGlobalLogin(); return; }

  ST.authState = 'community_selection';
  show('community-selection-screen');
  
  // Load fresh communities from Firebase
  loadCommunitiesFromFirebase().then(() => {
    renderCommunityList();
  });
  
  document.getElementById('trainer-name-bar').textContent = `👤 ${ST.globalUserId}`;
}

export function renderCommunityList() {
  const el = document.getElementById('community-list');
  const countEl = document.getElementById('community-count');
  
  if (!ST.communities.length) {
    el.innerHTML = `
      <div class="community-empty">
        <div class="community-empty-icon">🏘️</div>
        <h3>No hay comunidades aún</h3>
        <p>Únete a una existente o crea la tuya</p>
      </div>
    `;
    if (countEl) countEl.textContent = '0 disponibles';
    return;
  }
  
  if (countEl) countEl.textContent = `${ST.communities.length} disponible${ST.communities.length !== 1 ? 's' : ''}`;
  
  el.innerHTML = ST.communities.map(c => {
    const isMember = ST.globalUserId && c.members && c.members[ST.globalUserId];
    const displayName = c.displayName || c.name || c.id;
    const memberCount = c.members ? Object.keys(c.members).length : (c.memberCount || 0);
    
    return `
      <div class="community-card ${isMember ? 'joined' : ''}" onclick="handleCommunityClick('${c.id}')">
        <div class="community-card-info">
          <div class="community-card-name">${displayName}</div>
          <div class="community-card-meta">${memberCount} miembro${memberCount !== 1 ? 's' : ''}</div>
        </div>
        <div class="community-card-actions">
          ${isMember 
            ? `<button class="btn-enter" onclick="event.stopPropagation(); enterCommunity('${c.id}')">Entrar</button>`
            : `<button class="btn-join" onclick="event.stopPropagation(); showCommunityJoin('${c.id}')">Unirse</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

// ============ COMMUNITY ACTIONS ============

export async function handleCommunityClick(communityId) {
  const community = ST.communities.find(c => c.id === communityId);
  if (!community) return;
  
  const isMember = ST.globalUserId && community.members && community.members[ST.globalUserId];
  
  if (isMember) {
    await enterCommunity(communityId);
  } else {
    showCommunityJoin(communityId);
  }
}

export async function enterCommunity(communityId) {
  const community = ST.communities.find(c => c.id === communityId);
  if (!community) { showToast('Comunidad no encontrada'); return; }
  
  // Check if we have a saved profile for this community
  const savedProfile = community.members?.[ST.globalUserId];
  if (savedProfile) {
    // Direct entry with saved alias
    ST.currentCommunityId = communityId;
    ST.currentCommunity = community;
    ST.currentCommunityAlias = savedProfile.alias;
    ST.isOwner = savedProfile.isOwner || false;
    ST.communityMembers = Object.entries(community.members || {}).map(([uid, data]) => ({
      userId: uid,
      alias: data.alias,
      isOwner: data.isOwner || false,
      joinedAt: data.joinedAt
    }));
    
    await loadCommunityProfiles(communityId);
    showMainApp();
  } else {
    // Need to join/login to this community
    showCommunityJoin(communityId);
  }
}

export function showCommunityJoin(communityId) {
  ST.authState = 'community_join';
  ST.pendingCommunityId = communityId;
  const community = ST.communities.find(c => c.id === communityId);
  const displayName = community?.displayName || community?.name || communityId;
  
  show('community-join-screen');
  document.getElementById('join-community-name').textContent = displayName;
  document.getElementById('join-community-password').value = '';
  document.getElementById('join-user-alias').value = '';
  document.getElementById('join-community-password').focus();
}

export async function joinCommunityHandler(e) {
  e.preventDefault();
  const communityId = ST.pendingCommunityId;
  const password = document.getElementById('join-community-password').value;
  const alias = document.getElementById('join-user-alias').value.trim();
  
  if (!password) { showToast('Escribe la contraseña de la comunidad'); document.getElementById('join-community-password').focus(); return; }
  if (!alias) { showToast('Escribe tu alias'); document.getElementById('join-user-alias').focus(); return; }
  
  try {
    await joinCommunity(communityId, password, alias);
    showToast(`¡Bienvenido a la comunidad! 🎉`);
    showMainApp();
  } catch (err) {
    showToast(err.message || 'Error al unirse a la comunidad');
  }
}

export function showCommunityRegister(communityId) {
  ST.authState = 'community_register';
  ST.pendingCommunityId = communityId;
  const community = ST.communities.find(c => c.id === communityId);
  const displayName = community?.displayName || community?.name || communityId;
  
  show('community-register-screen');
  document.getElementById('register-community-name').textContent = displayName;
  document.getElementById('register-user-alias').value = '';
  document.getElementById('register-community-password').value = '';
  document.getElementById('register-user-alias').focus();
}

export async function registerCommunityHandler(e) {
  e.preventDefault();
  const communityId = ST.pendingCommunityId;
  const password = document.getElementById('register-community-password').value;
  const alias = document.getElementById('register-user-alias').value.trim();
  
  if (!password) { showToast('Escribe la contraseña de la comunidad'); document.getElementById('register-community-password').focus(); return; }
  if (!alias) { showToast('Escribe tu alias'); document.getElementById('register-user-alias').focus(); return; }
  
  try {
    await joinCommunity(communityId, password, alias);
    showToast(`¡Perfil creado! Bienvenido, ${alias} 🎉`);
    showMainApp();
  } catch (err) {
    showToast(err.message || 'Error al crear perfil en la comunidad');
  }
}

export function showCreateCommunityForm() {
  document.getElementById('community-list').style.display = 'none';
  document.getElementById('create-community-form').style.display = 'block';
  document.getElementById('new-community-name').focus();
}

export function hideCreateCommunityForm() {
  document.getElementById('community-list').style.display = 'block';
  document.getElementById('create-community-form').style.display = 'none';
  document.getElementById('new-community-name').value = '';
  document.getElementById('new-community-password').value = '';
  document.getElementById('new-community-confirm').value = '';
}

export async function createCommunityHandler(e) {
  e.preventDefault();
  const name = document.getElementById('new-community-name').value.trim();
  const password = document.getElementById('new-community-password').value;
  const confirm = document.getElementById('new-community-confirm').value;
  
  if (!name) { showToast('Escribe el nombre de la comunidad'); document.getElementById('new-community-name').focus(); return; }
  if (!password) { showToast('Escribe contraseña de comunidad'); document.getElementById('new-community-password').focus(); return; }
  if (password.length < 4) { showToast('Mínimo 4 caracteres'); document.getElementById('new-community-password').focus(); return; }
  if (password !== confirm) { showToast('Las contraseñas no coinciden'); document.getElementById('new-community-confirm').focus(); return; }
  
  try {
    await createCommunity(name, password, ST.globalUserId);
    hideCreateCommunityForm();
    showToast(`¡Comunidad "${name}" creada! 🎉`);
    // createCommunity already calls showMainApp() internally
  } catch (err) {
    showToast(err.message || 'Error al crear comunidad');
  }
}

export async function leaveCommunityHandler() {
  if (!confirm('¿Salir de la comunidad? Perderás acceso a los perfiles de los demás miembros.')) return;
  
  if (window._communityUnsub) {
    window._communityUnsub();
    window._communityUnsub = null;
  }
  
  await leaveCommunity();
  showToast('Has salido de la comunidad');
  showCommunitySelection();
}

// ============ MAIN APP NAVIGATION ============

export function showMainApp() {
  console.log('🔍 showMainApp called');
  ST.authState = 'logged_in';
  const el = document.getElementById('main-app-screen');
  console.log('🔍 showMainApp - main-app-screen element:', el ? 'found' : 'NOT FOUND');
  show('main-app-screen');
  console.log('🔍 showMainApp - after show(), element display:', el ? el.style.display : 'NOT FOUND');
  console.log('🔍 showMainApp - after show(), computed display:', el ? window.getComputedStyle(el).display : 'NOT FOUND');
  updateHomeMenu();
  document.getElementById('current-community-name').textContent = ST.currentCommunity?.displayName || ST.currentCommunity?.name || ST.currentCommunity?.id || '';
  
  // Subscribe to real-time updates
  if (!window._communityUnsub && ST.currentCommunityId && ST.globalUserId) {
    window._communityUnsub = subscribeToCommunity(
      ST.currentCommunityId,
      (community) => { if (community) { ST.currentCommunity = community; } },
      (members) => { ST.communityMembers = members; renderCommunityMembers(); },
      (profile) => { if (profile) { ST.userProfile = profile; ST.profiles = ST.profiles.map(p => p.userId === profile.userId ? profile : p); } }
    );
  }
}

export function showCommunityMembersView() {
  document.getElementById('main-app-screen').style.display = 'none';
  document.getElementById('community-members-screen').style.display = 'block';
  document.getElementById('members-community-name').textContent = ST.currentCommunity?.displayName || ST.currentCommunity?.name || ST.currentCommunity?.id || '';
  renderCommunityMembers();
}

export function backToMainApp() {
  document.getElementById('community-members-screen').style.display = 'none';
  document.getElementById('main-app-screen').style.display = 'block';
}

export function backToHome() {
  show('main-app-screen');
  document.getElementById('home-menu').style.display = 'block';
  updateHomeMenu();
}

export function goProfiles() {
  ST.currentCommunityId = null;
  ST.currentCommunity = null;
  ST.currentCommunityAlias = null;
  ST.communityMembers = [];
  ST.profiles = [];
  ST.userProfile = null;
  showCommunitySelection();
}

export function goToTypes() {
  show('main-screen');
  renderMain();
}

export function goToFireRanking() {
  if (!ST.globalUserId) { showToast('Selecciona un entrenador primero'); return; }
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

export function showTypeChart() {
  show('typechart-screen');
  renderTypeChart();
}

export function showMegaCandy() {
  show('megaguide-screen');
  renderMegaCandy();
}

export function showLegacyGuide() {
  show('legacyguide-screen');
  renderLegacyGuide();
}

export function openGuia() {
  show('guia-screen');
}

export function openInfo() {
  show('info-screen');
}

export function openObjetivo() {
  show('objetivo-screen');
  renderObjetivo();
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

export function goBack() { 
  ST.expanded = null; 
  show('main-screen'); 
  renderMain(); 
}

export function updateHomeMenu() {
  const p = ST.userProfile || ST.profiles.find(x => x.userId === ST.globalUserId);
  if (!p) return;
  
  const raidOwned = Object.values(p.pk || {}).filter(x => x.owned && !x.dmax).length;
  const dmaxOwned = Object.values(p.pk || {}).filter(x => x.dmax).length;
  
  const hmRaidCount = document.getElementById('hm-raid-count');
  const hmRaidBar = document.getElementById('hm-raid-bar');
  const hmDmaxCount = document.getElementById('hm-dmax-count');
  const hmDmaxBar = document.getElementById('hm-dmax-bar');
  
  if (hmRaidCount) hmRaidCount.textContent = raidOwned;
  if (hmRaidBar) hmRaidBar.style.width = Math.min(100, (raidOwned / 102) * 100) + '%';
  if (hmDmaxCount) hmDmaxCount.textContent = dmaxOwned;
  if (hmDmaxBar) hmDmaxBar.style.width = Math.min(100, (dmaxOwned / 51) * 100) + '%';
}

// ============ GLOBAL EXPORTS ============

window.handleCommunityClick = handleCommunityClick;
window.enterCommunity = enterCommunity;
window.showCommunityJoin = showCommunityJoin;
window.joinCommunityHandler = joinCommunityHandler;
window.showCommunityRegister = showCommunityRegister;
window.registerCommunityHandler = registerCommunityHandler;
window.showCommunitySelection = showCommunitySelection;
window.showCreateCommunityForm = showCreateCommunityForm;
window.hideCreateCommunityForm = hideCreateCommunityForm;
window.createCommunityHandler = createCommunityHandler;
window.leaveCommunityHandler = leaveCommunityHandler;
window.showGlobalLogin = showGlobalLogin;
window.showGlobalRegister = showGlobalRegister;
window.globalLoginHandler = globalLoginHandler;
window.globalRegisterHandler = globalRegisterHandler;
window.globalLogoutHandler = globalLogoutHandler;
window.goProfiles = goProfiles;
window.goToTypes = goToTypes;
window.goToFireRanking = goToFireRanking;
window.backToHome = backToHome;
window.goBack = goBack;
window.showTypeChart = showTypeChart;
window.showMegaCandy = showMegaCandy;
window.showLegacyGuide = showLegacyGuide;
window.openGuia = openGuia;
window.openInfo = openInfo;
window.openObjetivo = openObjetivo;
window.openDiarias = openDiarias;
window.openLegacy = openLegacy;
window.openPokeparadas = openPokeparadas;
window.openNovedades = openNovedades;
window.toggleDark = toggleDark;
window.showCommunityMembersView = showCommunityMembersView;
window.backToMainApp = backToMainApp;
window.showMainApp = showMainApp;

// Profile/Album functions (from ui.js)
window.switchTab = switchTab;
window.switchAlbumTab = switchAlbumTab;
window.switchRankTab = switchRankTab;
window.expandCard = expandCard;
window.toggleMegaFilter = toggleMegaFilter;