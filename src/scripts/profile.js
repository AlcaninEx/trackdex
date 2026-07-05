// Profile/Community flow module - UI logic for community-first architecture
import { ST, gp, goc, defaultAlbum, getAlbum, getCurrentDpsForName, albumPks, countType, getCommunityMembers, getCurrentUser, isCurrentUserOwner, setCurrentCommunity, setCurrentUser, clearCommunitySession } from './state.js';
import { save, load, loadFromFirebase, createCommunity, joinCommunity, loginToCommunity, leaveCommunity, setCurrentCommunity as storageSetCurrentCommunity, saveUserProfile, subscribeToCommunity } from './storage.js';
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

// ============ STATE RENDERING ============

// Show community selection screen
export function showCommunitySelection() {
  ST.authState = 'selecting_community';
  document.getElementById('community-selection-screen').style.display = 'block';
  document.getElementById('community-login-screen').style.display = 'none';
  document.getElementById('community-register-screen').style.display = 'none';
  document.getElementById('main-app-screen').style.display = 'none';
  document.getElementById('profile-screen').style.display = 'block';
  document.getElementById('home-profile-section').style.display = 'block';
  document.getElementById('home-menu').style.display = 'none';
  document.getElementById('trainer-name-bar').textContent = 'Elige tu comunidad';
  renderCommunityList();
}

// Show community login screen
export function showCommunityLogin(communityId) {
  ST.authState = 'logging_in';
  ST.pendingCommunityId = communityId;
  const community = ST.communities.find(c => c.id === communityId);
  
  document.getElementById('community-selection-screen').style.display = 'none';
  document.getElementById('community-login-screen').style.display = 'block';
  document.getElementById('community-register-screen').style.display = 'none';
  document.getElementById('main-app-screen').style.display = 'none';
  document.getElementById('profile-screen').style.display = 'block';
  document.getElementById('home-profile-section').style.display = 'block';
  document.getElementById('home-menu').style.display = 'none';
  document.getElementById('trainer-name-bar').textContent = `🔐 ${community?.id || communityId}`;
  
  document.getElementById('login-community-name').textContent = community?.id || communityId;
  document.getElementById('login-user-id').value = '';
  document.getElementById('login-user-password').value = '';
  document.getElementById('login-user-id').focus();
}

// Show community register screen (new user in community)
export function showCommunityRegister(communityId) {
  ST.authState = 'registering';
  ST.pendingCommunityId = communityId;
  const community = ST.communities.find(c => c.id === communityId);
  
  document.getElementById('community-selection-screen').style.display = 'none';
  document.getElementById('community-login-screen').style.display = 'none';
  document.getElementById('community-register-screen').style.display = 'block';
  document.getElementById('main-app-screen').style.display = 'none';
  document.getElementById('profile-screen').style.display = 'block';
  document.getElementById('home-profile-section').style.display = 'block';
  document.getElementById('home-menu').style.display = 'none';
  document.getElementById('trainer-name-bar').textContent = `✨ ${community?.id || communityId}`;
  
  document.getElementById('register-community-name').textContent = community?.id || communityId;
  document.getElementById('register-user-id').value = '';
  document.getElementById('register-user-password').value = '';
  document.getElementById('register-user-confirm').value = '';
  document.getElementById('register-display-name').value = '';
  document.getElementById('register-user-id').focus();
}

// Show main app (logged in)
export function showMainApp() {
  ST.authState = 'logged_in';
  document.getElementById('community-selection-screen').style.display = 'none';
  document.getElementById('community-login-screen').style.display = 'none';
  document.getElementById('community-register-screen').style.display = 'none';
  document.getElementById('main-app-screen').style.display = 'block';
  document.getElementById('profile-screen').style.display = 'block';
  document.getElementById('home-profile-section').style.display = 'none';
  document.getElementById('home-menu').style.display = 'block';
  document.getElementById('trainer-name-bar').textContent = `👋 ${ST.currentUserDisplayName} · 🏘️ ${ST.currentCommunity?.id}`;
  updateHomeMenu();
  
  // Subscribe to real-time updates
  if (!window._communityUnsub && ST.currentCommunityId && ST.currentUserId) {
    window._communityUnsub = subscribeToCommunity(
      ST.currentCommunityId,
      (community) => { if (community) { ST.currentCommunity = community; } },
      (members) => { ST.communityMembers = members; renderCommunityMembers(); },
      (profile) => { if (profile) { ST.userProfile = profile; ST.profiles = ST.profiles.map(p => p.userId === profile.userId ? profile : p); } }
    );
  }
}

// ============ COMMUNITY LIST ============

export function renderCommunityList() {
  const el = document.getElementById('community-list');
  if (!el) return;
  
  if (!ST.communities.length) {
    el.innerHTML = `
      <div class="community-empty">
        <div class="community-empty-icon">🏘️</div>
        <h3>No hay comunidades aún</h3>
        <p>Sé el primero en crear una comunidad para tu grupo de raid</p>
      </div>
    `;
    return;
  }
  
  el.innerHTML = ST.communities.map(c => {
    const memberCount = c.members ? Object.keys(c.members).length : (c.memberCount || 0);
    const isMember = ST.currentUserId && c.members && c.members[ST.currentUserId];
    return `
      <div class="community-card ${isMember ? 'joined' : ''}" onclick="handleCommunityClick('${c.id}')">
        <div class="community-card-header">
          <div class="community-icon">🏘️</div>
          <div class="community-info">
            <div class="community-name">${c.id}${isMember ? ' <span class="member-badge">Miembro</span>' : ''}</div>
            <div class="community-meta">${memberCount} miembro${memberCount !== 1 ? 's' : ''}</div>
          </div>
        </div>
        ${isMember 
          ? `<button class="community-enter-btn" onclick="event.stopPropagation(); enterCommunity('${c.id}')">Entrar</button>`
          : `<button class="community-join-btn" onclick="event.stopPropagation(); showCommunityLogin('${c.id}')">Unirse</button>`
        }
      </div>
    `;
  }).join('');
}

// ============ COMMUNITY MEMBERS VIEW ============

export function renderCommunityMembers() {
  const el = document.getElementById('community-members-list');
  if (!el || !ST.currentCommunity) return;
  
  const members = getCommunityMembers();
  const isOwner = isCurrentUserOwner();
  
  el.innerHTML = members.map((member, index) => {
    const isMe = member.userId === ST.currentUserId;
    const displayName = member.displayName || member.userId;
    const initials = displayName.substring(0, 2).toUpperCase();
    const isMemberOwner = member.isOwner;
    
    return `
      <li class="member-row ${isMe ? 'me' : ''} ${!isMe ? 'readonly' : ''}" data-member="${member.userId}">
        <div class="member-avatar" style="${isMemberOwner ? 'background: linear-gradient(135deg, #7B1FA2, #AB47BC);' : ''}">${initials}</div>
        <div class="member-info">
          <div class="member-name-row">
            <span class="member-display-name">${displayName}${isMe ? ' <span class="you-badge">(Tú)</span>' : ''}${isMemberOwner ? ' <span class="crown-badge">👑</span>' : ''}</span>
            <span class="member-username">@${member.userId}</span>
          </div>
          <div class="member-meta">
            <span>Miembro desde ${new Date(member.joinedAt).toLocaleDateString('es-ES')}</span>
            ${isMe ? '<span class="edit-mode-badge">Modo edición</span>' : '<span class="view-mode-badge">Modo vista</span>'}
          </div>
        </div>
        <div class="member-actions">
          ${isMe 
            ? '<span class="current-user-indicator">Tu perfil</span>'
            : `<button class="view-member-btn" onclick="viewMemberProfile('${member.userId}')" aria-label="Ver perfil de ${displayName}">Ver</button>`
          }
          ${isOwner && !isMe ? `<button class="kick-member-btn" onclick="kickMember('${member.userId}', event)" aria-label="Expulsar a ${displayName}">✕</button>` : ''}
        </div>
      </li>
    `;
  }).join('');
}

export function showCommunityMembersView() {
  document.getElementById('main-app-screen').style.display = 'none';
  document.getElementById('community-members-screen').style.display = 'block';
  document.getElementById('trainer-name-bar').textContent = `🏘️ ${ST.currentCommunity?.id} · Miembros`;
  renderCommunityMembers();
}

export function showCommunityProfileView(userId, isReadOnly) {
  ST.view = userId;
  ST.viewReadOnly = isReadOnly;
  show('main-screen');
  renderMain();
}

// ============ COMMUNITY ACTIONS ============

export async function handleCommunityClick(communityId) {
  const community = ST.communities.find(c => c.id === communityId);
  if (!community) return;
  
  const isMember = ST.currentUserId && community.members && community.members[ST.currentUserId];
  
  if (isMember) {
    // Already a member - enter community
    await enterCommunity(communityId);
  } else {
    // Not a member - show login
    showCommunityLogin(communityId);
  }
}

export async function enterCommunity(communityId) {
  const community = ST.communities.find(c => c.id === communityId);
  if (!community) { showToast('Comunidad no encontrada'); return; }
  
  try {
    // If we have a saved userId for this community, try login
    if (ST.currentUserId && community.members && community.members[ST.currentUserId]) {
      // We need the user's password - for now just verify community password
      // In a real app, you'd have stored the user's password hash
      const result = await storageSetCurrentCommunity(communityId);
      if (result) {
        showMainApp();
      }
    } else {
      // Need to login
      showCommunityLogin(communityId);
    }
  } catch (err) {
    showToast(err.message || 'Error al entrar a la comunidad');
    showCommunityLogin(communityId);
  }
}

export async function loginCommunityHandler(e) {
  if (e) e.preventDefault();
  const communityId = ST.pendingCommunityId;
  const userId = document.getElementById('login-user-id').value.trim().toLowerCase();
  const password = document.getElementById('login-user-password').value;
  
  if (!userId) { showToast('Escribe tu ID de usuario'); document.getElementById('login-user-id').focus(); return; }
  if (!password) { showToast('Escribe tu contraseña'); document.getElementById('login-user-password').focus(); return; }
  
  try {
    await loginToCommunity(communityId, userId, password);
    showToast(`¡Bienvenido, ${ST.currentUserDisplayName}! 🎉`);
    showMainApp();
  } catch (err) {
    showToast(err.message || 'Error al iniciar sesión');
  }
}

export async function registerCommunityHandler(e) {
  if (e) e.preventDefault();
  const communityId = ST.pendingCommunityId;
  const userId = document.getElementById('register-user-id').value.trim().toLowerCase();
  const password = document.getElementById('register-user-password').value;
  const confirm = document.getElementById('register-user-confirm').value;
  const displayName = document.getElementById('register-display-name').value.trim() || userId;
  
  if (!userId) { showToast('Escribe tu ID de usuario'); document.getElementById('register-user-id').focus(); return; }
  if (!password) { showToast('Escribe una contraseña'); document.getElementById('register-user-password').focus(); return; }
  if (password.length < 4) { showToast('La contraseña debe tener al menos 4 caracteres'); document.getElementById('register-user-password').focus(); return; }
  if (password !== confirm) { showToast('Las contraseñas no coinciden'); document.getElementById('register-user-confirm').focus(); return; }
  if (!/^[a-z0-9_-]+$/.test(userId)) { showToast('El ID solo puede tener letras, números, guiones y guiones bajos'); document.getElementById('register-user-id').focus(); return; }
  
  try {
    await joinCommunity(communityId, communityId, userId, displayName); // community password = communityId for now
    showToast(`¡Cuenta creada! Bienvenido, ${displayName} 🎉`);
    showMainApp();
  } catch (err) {
    showToast(err.message || 'Error al crear cuenta');
  }
}

export async function createCommunityHandler(e) {
  if (e) e.preventDefault();
  const communityId = document.getElementById('new-community-id').value.trim().toLowerCase().replace(/\s+/g, '-');
  const password = document.getElementById('new-community-password').value;
  const confirm = document.getElementById('new-community-confirm').value;
  const userId = document.getElementById('new-community-user-id').value.trim().toLowerCase();
  const userPassword = document.getElementById('new-community-user-password').value;
  const userConfirm = document.getElementById('new-community-user-confirm').value;
  const displayName = document.getElementById('new-community-display-name').value.trim() || userId;
  
  if (!communityId) { showToast('Escribe un nombre para la comunidad'); document.getElementById('new-community-id').focus(); return; }
  if (!/^[a-z0-9_-]+$/.test(communityId)) { showToast('Solo letras, números, guiones y guiones bajos'); document.getElementById('new-community-id').focus(); return; }
  if (!password) { showToast('Escribe contraseña de comunidad'); document.getElementById('new-community-password').focus(); return; }
  if (password.length < 4) { showToast('Mínimo 4 caracteres'); document.getElementById('new-community-password').focus(); return; }
  if (password !== confirm) { showToast('Las contraseñas no coinciden'); document.getElementById('new-community-confirm').focus(); return; }
  if (!userId) { showToast('Escribe tu ID de usuario'); document.getElementById('new-community-user-id').focus(); return; }
  if (!/^[a-z0-9_-]+$/.test(userId)) { showToast('Solo letras, números, guiones y guiones bajos'); document.getElementById('new-community-user-id').focus(); return; }
  if (!userPassword) { showToast('Escribe tu contraseña personal'); document.getElementById('new-community-user-password').focus(); return; }
  if (userPassword.length < 4) { showToast('Mínimo 4 caracteres'); document.getElementById('new-community-user-password').focus(); return; }
  if (userPassword !== userConfirm) { showToast('Las contraseñas no coinciden'); document.getElementById('new-community-user-confirm').focus(); return; }
  
  try {
    await createCommunity(communityId, password, userId, displayName);
    showToast(`¡Comunidad "${communityId}" creada! 🎉`);
    showMainApp();
  } catch (err) {
    showToast(err.message || 'Error al crear comunidad');
  }
}

export function leaveCommunityHandler() {
  if (!confirm('¿Salir de la comunidad? Perderás acceso a los perfiles de los demás miembros.')) return;
  
  if (window._communityUnsub) {
    window._communityUnsub();
    window._communityUnsub = null;
  }
  
  leaveCommunity();
  showToast('Has salido de la comunidad');
  
  // Force show community selection screen
  document.getElementById('community-selection-screen').style.display = 'block';
  document.getElementById('main-app-screen').style.display = 'none';
  document.getElementById('community-members-screen').style.display = 'none';
  document.getElementById('home-menu').style.display = 'none';
  document.getElementById('home-profile-section').style.display = 'block';
  document.getElementById('trainer-name-bar').textContent = 'Comunidades';
  renderCommunityList();
}

export function showCreateCommunityForm() {
  document.getElementById('community-list').style.display = 'none';
  document.getElementById('create-community-form').style.display = 'block';
  document.getElementById('new-community-id').focus();
}

export function hideCreateCommunityForm() {
  document.getElementById('community-list').style.display = 'block';
  document.getElementById('create-community-form').style.display = 'none';
  document.getElementById('new-community-id').value = '';
  document.getElementById('new-community-password').value = '';
  document.getElementById('new-community-confirm').value = '';
  document.getElementById('new-community-user-id').value = '';
  document.getElementById('new-community-user-password').value = '';
  document.getElementById('new-community-user-confirm').value = '';
  document.getElementById('new-community-display-name').value = '';
}

export function kickMember(userId, e) {
  e.stopPropagation();
  if (!isCurrentUserOwner()) { showToast('Solo el owner puede expulsar'); return; }
  if (userId === ST.currentUserId) { showToast('No puedes expulsarte a ti mismo'); return; }
  if (!confirm(`¿Expulsar a ${userId} de la comunidad?`)) return;
  
  // In Firebase, remove member
  // For now just local update
  ST.communityMembers = ST.communityMembers.filter(m => m.userId !== userId);
  ST.profiles = ST.profiles.filter(p => p.userId !== userId);
  renderCommunityMembers();
  showToast(`${userId} expulsado de la comunidad`);
}

export function viewMemberProfile(userId) {
  const member = ST.communityMembers.find(m => m.userId === userId);
  if (!member) return;
  // View in read-only mode
  ST.view = userId;
  ST.viewReadOnly = true;
  show('main-screen');
  renderMain();
}

export function backToCommunityMembers() {
  if (ST.view) {
    ST.view = null;
    ST.viewReadOnly = false;
    showCommunityMembersView();
  }
}

// ============ APP NAVIGATION ============

export function goProfiles() {
  ST.cur = null;
  ST.view = null;
  ST.viewReadOnly = false;
  show('profile-screen');
  document.getElementById('home-menu').style.display = 'none';
  document.getElementById('home-profile-section').style.display = 'block';
  document.getElementById('trainer-name-bar').textContent = `👋 ${ST.currentUserDisplayName} · 🏘️ ${ST.currentCommunity?.id}`;
  
  if (ST.isLoggedIn) {
    showMainApp();
  } else {
    showCommunitySelection();
  }
}

export function goToTypes() {
  show('main-screen');
  renderMain();
}

export function goToFireRanking() {
  if (!ST.currentUserId) { showToast('Selecciona un entrenador primero'); return; }
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
  document.getElementById('trainer-name-bar').textContent = `👋 ${ST.currentUserDisplayName} · 🏘️ ${ST.currentCommunity?.id}`;
  updateHomeMenu();
}

export function goBack() { 
  ST.expanded = null; 
  show('main-screen'); 
  renderMain(); 
}

export function updateHomeMenu() {
  // Update progress bars in home menu
  const p = ST.userProfile || ST.profiles.find(x => x.userId === ST.currentUserId);
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

// Make functions globally available for inline onclick handlers
window.handleCommunityClick = handleCommunityClick;
window.enterCommunity = enterCommunity;
window.loginCommunityHandler = loginCommunityHandler;
window.registerCommunityHandler = registerCommunityHandler;
window.createCommunityHandler = createCommunityHandler;
window.leaveCommunityHandler = leaveCommunityHandler;
window.kickMember = kickMember;
window.viewMemberProfile = viewMemberProfile;
window.backToCommunityMembers = backToCommunityMembers;
window.showCommunityLogin = showCommunityLogin;
window.showCommunityRegister = showCommunityRegister;
window.showCommunitySelection = showCommunitySelection;
window.showCreateCommunityForm = showCreateCommunityForm;
window.hideCreateCommunityForm = hideCreateCommunityForm;
window.goProfiles = goProfiles;
window.goToTypes = goToTypes;
window.goToFireRanking = goToFireRanking;
window.backToHome = backToHome;
window.goBack = goBack;