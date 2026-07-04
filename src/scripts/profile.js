// Main App - UI logic, imports all modules
import { ST, gp, goc, defaultAlbum, getAlbum, getCurrentDpsForName, albumPks, countType, getCommunityMembers, getMyRoleInCommunity, isCommunityOwner, setCommunity, clearCommunity } from './state.js';
import { save, load, loadFromFirebase, createCommunity, joinCommunity, leaveCommunity, setCurrentCommunity } from './storage.js';
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

// ============ COMMUNITY STATES & RENDERING ============

export function showCommunitySelection() {
  // Show community selection screen (replaces onboarding)
  document.getElementById('onboarding-state').style.display = 'none';
  document.getElementById('profiles-state').style.display = 'none';
  document.getElementById('community-state').style.display = 'block';
  document.getElementById('home-menu').style.display = 'none';
  document.getElementById('home-profile-section').style.display = 'block';
  document.getElementById('trainer-name-bar').textContent = 'Comunidad';
  renderAvailableCommunities();
  updateProfileCount();
}

export function showCommunityCreateForm() {
  document.getElementById('community-list').style.display = 'none';
  document.getElementById('community-create-form').style.display = 'block';
  document.getElementById('community-join-form').style.display = 'none';
  document.getElementById('new-community-name').focus();
}

export function hideCommunityCreateForm() {
  document.getElementById('community-list').style.display = 'block';
  document.getElementById('community-create-form').style.display = 'none';
  document.getElementById('community-join-form').style.display = 'none';
  document.getElementById('new-community-name').value = '';
  document.getElementById('new-community-password').value = '';
  document.getElementById('new-community-confirm').value = '';
}

export function showCommunityJoinForm(communityId) {
  document.getElementById('community-list').style.display = 'none';
  document.getElementById('community-create-form').style.display = 'none';
  document.getElementById('community-join-form').style.display = 'block';
  document.getElementById('join-community-id').value = communityId;
  document.getElementById('join-community-password').value = '';
  document.getElementById('join-community-displayName').value = ST.cur || '';
  document.getElementById('join-community-password').focus();
}

export function hideCommunityJoinForm() {
  document.getElementById('community-list').style.display = 'block';
  document.getElementById('community-create-form').style.display = 'none';
  document.getElementById('community-join-form').style.display = 'none';
}

export function renderAvailableCommunities() {
  const el = document.getElementById('community-list');
  if (!el) return;
  
  const communities = ST.availableCommunities || [];
  
  if (communities.length === 0) {
    el.innerHTML = `
      <div class="community-empty">
        <div class="community-empty-icon">🏘️</div>
        <h3>No hay comunidades aún</h3>
        <p>Sé el primero en crear una comunidad para tu grupo de raid</p>
      </div>
    `;
    return;
  }
  
  el.innerHTML = communities.map(c => {
    const memberCount = c.members ? Object.keys(c.members).length : 0;
    const amMember = ST.cur && c.members && c.members[ST.cur];
    const isOwner = amMember?.isOwner;
    return `
      <div class="community-card ${amMember ? 'joined' : ''}" onclick="${amMember ? `enterCommunity('${c.id}')` : `showCommunityJoinForm('${c.id}')`}">
        <div class="community-card-header">
          <div class="community-icon">🏘️</div>
          <div class="community-info">
            <div class="community-name">${c.id}${isOwner ? ' <span class="owner-badge">Owner</span>' : ''}${amMember && !isOwner ? ' <span class="member-badge">Miembro</span>' : ''}</div>
            <div class="community-meta">${memberCount} miembro${memberCount !== 1 ? 's' : ''} · ${isOwner ? 'Tu comunidad' : amMember ? 'Eres miembro' : 'Privada'}</div>
          </div>
        </div>
        ${amMember 
          ? `<button class="community-enter-btn" onclick="event.stopPropagation(); enterCommunity('${c.id}')">Entrar</button>`
          : `<button class="community-join-btn" onclick="event.stopPropagation(); showCommunityJoinForm('${c.id}')">Unirse</button>`
        }
      </div>
    `;
  }).join('');
}

export function renderCommunityMembers() {
  const el = document.getElementById('community-members-list');
  if (!el || !ST.community) return;
  
  const members = getCommunityMembers();
  const isOwner = isCommunityOwner();
  
  el.innerHTML = members.map((member, index) => {
    const isMe = member.name === ST.cur;
    const displayName = member.displayName || member.name;
    const initials = displayName.substring(0, 2).toUpperCase();
    const isMemberOwner = member.isOwner;
    
    return `
      <li class="member-row ${isMe ? 'me' : ''} ${!isMe ? 'readonly' : ''}" data-member="${member.name}">
        <div class="member-avatar" style="${isMemberOwner ? 'background: linear-gradient(135deg, #7B1FA2, #AB47BC);' : ''}">${initials}</div>
        <div class="member-info">
          <div class="member-name-row">
            <span class="member-display-name">${displayName}${isMe ? ' <span class="you-badge">(Tú)</span>' : ''}${isMemberOwner ? ' <span class="crown-badge">👑</span>' : ''}</span>
            <span class="member-username">@${member.name}</span>
          </div>
          <div class="member-meta">
            <span>Miembro desde ${new Date(member.joinedAt).toLocaleDateString('es-ES')}</span>
            ${isMe ? '<span class="edit-mode-badge">Modo edición</span>' : '<span class="view-mode-badge">Modo vista</span>'}
          </div>
        </div>
        <div class="member-actions">
          ${isMe 
            ? '<span class="current-user-indicator">Tu perfil</span>'
            : `<button class="view-member-btn" onclick="viewMemberProfile('${member.name}')" aria-label="Ver perfil de ${displayName}">Ver</button>`
          }
          ${isOwner && !isMe ? `<button class="kick-member-btn" onclick="kickMember('${member.name}', event)" aria-label="Expulsar a ${displayName}">✕</button>` : ''}
        </div>
      </li>
    `;
  }).join('');
}

export function showCommunityMembersView() {
  document.getElementById('community-state').style.display = 'none';
  document.getElementById('community-members-state').style.display = 'block';
  document.getElementById('home-menu').style.display = 'none';
  document.getElementById('home-profile-section').style.display = 'block';
  document.getElementById('trainer-name-bar').textContent = ST.community ? `🏘️ ${ST.community.id}` : 'Comunidad';
  renderCommunityMembers();
}

export function showCommunityProfileView(memberName, isReadOnly) {
  ST.view = memberName;
  ST.viewReadOnly = isReadOnly;
  show('main-screen');
  renderMain();
}

// ============ STATE MANAGEMENT ============

export function showOnboardingState() {
  // Check if user has communities
  if (ST.availableCommunities && ST.availableCommunities.length > 0) {
    showCommunitySelection();
  } else {
    document.getElementById('onboarding-state').style.display = 'block';
    document.getElementById('profiles-state').style.display = 'none';
    document.getElementById('community-state').style.display = 'none';
    document.getElementById('community-members-state').style.display = 'none';
    document.getElementById('home-menu').style.display = 'none';
    document.getElementById('home-profile-section').style.display = 'block';
    document.getElementById('trainer-name-bar').textContent = 'Selecciona tu entrenador';
    updateProfileCount();
  }
}

export function showProfilesState() {
  document.getElementById('onboarding-state').style.display = 'none';
  document.getElementById('profiles-state').style.display = 'block';
  document.getElementById('community-state').style.display = 'none';
  document.getElementById('community-members-state').style.display = 'none';
  document.getElementById('home-menu').style.display = 'none';
  document.getElementById('home-profile-section').style.display = 'block';
  document.getElementById('trainer-name-bar').textContent = 'Selecciona tu entrenador';
  renderProfiles();
  updateProfileCount();
}

export function showHomeMenu() {
  document.getElementById('onboarding-state').style.display = 'none';
  document.getElementById('profiles-state').style.display = 'none';
  document.getElementById('community-state').style.display = 'none';
  document.getElementById('community-members-state').style.display = 'none';
  document.getElementById('home-menu').style.display = 'block';
  document.getElementById('home-profile-section').style.display = 'none';
  document.getElementById('trainer-name-bar').textContent = '👋 ' + ST.cur;
}

export function showCommunityMembersState() {
  document.getElementById('onboarding-state').style.display = 'none';
  document.getElementById('profiles-state').style.display = 'none';
  document.getElementById('community-state').style.display = 'none';
  document.getElementById('community-members-state').style.display = 'block';
  document.getElementById('home-menu').style.display = 'none';
  document.getElementById('home-profile-section').style.display = 'block';
  document.getElementById('trainer-name-bar').textContent = ST.community ? `🏘️ ${ST.community.id}` : 'Comunidad';
  renderCommunityMembers();
}

// ============ COMMUNITY ACTIONS ============

export async function createCommunityHandler(e) {
  if (e) e.preventDefault();
  const nameInput = document.getElementById('new-community-name');
  const passInput = document.getElementById('new-community-password');
  const confirmInput = document.getElementById('new-community-confirm');
  const displayNameInput = document.getElementById('new-community-displayName');
  
  const communityId = nameInput.value.trim().toLowerCase().replace(/\s+/g, '-');
  const password = passInput.value;
  const confirm = confirmInput.value;
  const displayName = displayNameInput.value.trim() || ST.cur;
  
  if (!communityId) { showToast('Escribe un nombre para la comunidad'); nameInput.focus(); return; }
  if (!password) { showToast('Escribe una contraseña'); passInput.focus(); return; }
  if (password.length < 4) { showToast('La contraseña debe tener al menos 4 caracteres'); passInput.focus(); return; }
  if (password !== confirm) { showToast('Las contraseñas no coinciden'); confirmInput.focus(); return; }
  if (!ST.cur) { showToast('Primero selecciona tu entrenador'); return; }
  
  try {
    await createCommunity(communityId, password, ST.cur, displayName);
    showToast(`¡Comunidad "${communityId}" creada! 🎉`);
    hideCommunityCreateForm();
    showCommunityMembersState();
  } catch (err) {
    showToast(err.message || 'Error al crear comunidad');
  }
}

export async function joinCommunityHandler(e) {
  if (e) e.preventDefault();
  const communityId = document.getElementById('join-community-id').value;
  const password = document.getElementById('join-community-password').value;
  const displayName = document.getElementById('join-community-displayName').value.trim() || ST.cur;
  
  if (!password) { showToast('Escribe la contraseña'); document.getElementById('join-community-password').focus(); return; }
  if (!ST.cur) { showToast('Primero selecciona tu entrenador'); return; }
  
  try {
    await joinCommunity(communityId, password, ST.cur, displayName);
    showToast(`¡Te uniste a "${communityId}"! 🎉`);
    hideCommunityJoinForm();
    showCommunityMembersState();
  } catch (err) {
    showToast(err.message || 'Error al unirte a la comunidad');
  }
}

export function enterCommunity(communityId) {
  const community = ST.availableCommunities.find(c => c.id === communityId);
  if (!community) { showToast('Comunidad no encontrada'); return; }
  
  setCurrentCommunity(communityId);
  showCommunityMembersState();
}

export function leaveCommunityHandler() {
  if (!confirm('¿Salir de la comunidad? Perderás acceso a los perfiles de los demás miembros.')) return;
  leaveCommunity();
  showToast('Has salido de la comunidad');
  showCommunitySelection();
}

export function kickMember(memberName, e) {
  e.stopPropagation();
  if (!isCommunityOwner()) { showToast('Solo el owner puede expulsar'); return; }
  if (memberName === ST.cur) { showToast('No puedes expulsarte a ti mismo'); return; }
  if (!confirm(`¿Expulsar a ${memberName} de la comunidad?`)) return;
  
  if (ST.community?.members?.[memberName]) {
    delete ST.community.members[memberName];
    save();
    renderCommunityMembers();
    showToast(`${memberName} expulsado de la comunidad`);
  }
}

export function viewMemberProfile(memberName) {
  const member = ST.community?.members?.[memberName];
  if (!member) return;
  // View in read-only mode
  ST.view = memberName;
  ST.viewReadOnly = true;
  show('main-screen');
  renderMain();
}

export function backToCommunityMembers() {
  if (ST.view) {
    ST.view = null;
    ST.viewReadOnly = false;
    showCommunityMembersState();
  }
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
  
  // After creating first profile, go to community selection
  if (ST.availableCommunities && ST.availableCommunities.length > 0) {
    showCommunitySelection();
  } else {
    showCommunitySelection(); // Will show empty state with create option
  }
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
  ST.viewReadOnly = false;
  
  // If user has communities, go to community selection
  if (ST.availableCommunities && ST.availableCommunities.length > 0) {
    showCommunitySelection();
  } else {
    showHomeMenu();
    document.getElementById('home-menu').style.display = 'block';
    document.getElementById('home-profile-section').style.display = 'none';
    document.getElementById('trainer-name-bar').textContent = '👋 ' + p.name;
    updateHomeMenu();
  }
}

export function viewProfileIdx(i) { 
  const p = ST.profiles[i]; 
  if (!p) return; 
  if (!ST.cur) { showToast('Primero selecciona tu perfil 👤'); return; }
  ST.view = p.name;
  ST.viewReadOnly = false;
  show('main-screen');
  renderMain();
}

export function goProfiles() {
  ST.cur = null;
  ST.view = null;
  ST.viewReadOnly = false;
  clearCommunity();
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

// Community functions
window.createCommunityHandler = createCommunityHandler;
window.joinCommunityHandler = joinCommunityHandler;
window.enterCommunity = enterCommunity;
window.leaveCommunityHandler = leaveCommunityHandler;
window.kickMember = kickMember;
window.viewMemberProfile = viewMemberProfile;
window.backToCommunityMembers = backToCommunityMembers;
window.showCommunityCreateForm = showCommunityCreateForm;
window.hideCommunityCreateForm = hideCommunityCreateForm;
window.showCommunityJoinForm = showCommunityJoinForm;
window.hideCommunityJoinForm = hideCommunityJoinForm;