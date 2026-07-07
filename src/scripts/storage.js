// Storage module - localStorage + Firebase sync
// NEW ARCHITECTURE: Global user -> Communities -> Profiles per community
import { ST } from './state.js';
import { 
  fbLoadCommunities, fbSaveCommunity, fbVerifyCommunityPassword, fbCreateCommunity,
  fbJoinCommunity, fbLoadCommunityMembers, fbUpdateMember, fbDeleteMember,
  fbLoadUserProfile, fbLoadAllProfiles, fbSaveUserProfile, fbDeleteUserProfile,
  fbSubscribeCommunity, fbSubscribeCommunityMembers, fbSubscribeUserProfile,
  fbLoadMegaConfig, fbSaveMegaConfig,
  fbLoadGlobalUser, fbSaveGlobalUser, fbVerifyGlobalPassword
} from './firebase.js';

const STORAGE_KEY = 'pokeBCN_v3';
const GLOBAL_USER_KEY = 'pokeBCN_globalUser_v1';

// ============ LOCALSTORAGE ============

export function saveCommunityList() {
  try {
    const data = { 
      communities: ST.communities,
      lastCommunityId: ST.currentCommunityId
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); 
  } catch(e) { console.warn('localStorage save failed:', e); }
}

export function loadCommunityList() {
  try { 
    const s = localStorage.getItem(STORAGE_KEY); 
    if (s) { 
      const d = JSON.parse(s); 
      ST.communities = d.communities || []; 
      ST.currentCommunityId = d.lastCommunityId || null;
    } 
  } catch(e) { 
    ST.communities = []; 
    ST.currentCommunityId = null;
  }
}

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

// ============ COMMUNITY LIST SYNC ============

export async function loadCommunitiesFromFirebase() {
  if (!ST.globalUserId) return;
  
  try {
    const communities = await fbLoadCommunities();
    if (!communities) return;
    
    // Filter communities where this user is a member
    const userCommunities = communities.filter(c => c.members && c.members[ST.globalUserId]);
    
    // Merge with localStorage (Firebase wins for fresh data)
    const localIds = new Set(ST.communities.map(c => c.id));
    let changed = false;
    
    for (const fc of userCommunities) {
      const localIdx = ST.communities.findIndex(c => c.id === fc.id);
      if (localIdx >= 0) {
        // Update existing with fresh Firebase data
        ST.communities[localIdx] = fc;
        changed = true;
      } else {
        // New community from Firebase
        ST.communities.push(fc);
        changed = true;
      }
    }
    
    if (changed) {
      saveCommunityList();
    }
  } catch (e) {
    console.warn('Failed to load communities from Firebase:', e);
  }
}

export async function globalLogin(userId, password) {
  const user = await fbVerifyGlobalPassword(userId, password);
  if (!user) throw new Error('ID o contraseña incorrectos');
  
  ST.globalUserId = userId;
  ST.globalUserPassword = password;
  ST.globalUser = user;
  return user;
}

export async function globalRegister(userId, password) {
  // Check if user exists
  const existing = await fbLoadGlobalUser(userId);
  if (existing) throw new Error('El ID de usuario ya existe');
  
  // Create global user
  const user = { userId, password, createdAt: Date.now() };
  await fbSaveGlobalUser(userId, user);
  
  ST.globalUserId = userId;
  ST.globalUserPassword = password;
  ST.globalUser = user;
  return user;
}

export function globalLogout() {
  ST.globalUserId = null;
  ST.globalUserPassword = null;
  ST.globalUser = null;
  ST.rememberMe = false;
  clearCommunitySession();
  localStorage.removeItem('pokeBCN_globalUser');
}

export function clearGlobalSession() {
  globalLogout();
}

export async function loadGlobalUser(userId) {
  return await fbLoadGlobalUser(userId);
}

export async function saveGlobalUser(userId, data) {
  return await fbSaveGlobalUser(userId, data);
}

export async function verifyGlobalPassword(userId, password) {
  return await fbVerifyGlobalPassword(userId, password);
}

// ============ COMMUNITY ACTIONS ============

export async function createCommunity(name, password, ownerGlobalUserId) {
  // Generate community ID from name
  const communityId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  
  // Check if exists
  const existing = ST.communities.find(c => c.id === communityId);
  if (existing) throw new Error('Ya existe una comunidad con ese nombre');
  
  console.log('🔍 createCommunity - ST.globalUserId:', ST.globalUserId);
  console.log('🔍 createCommunity - ownerGlobalUserId:', ownerGlobalUserId);
  
  // Create in Firebase
  const community = await fbCreateCommunity(communityId, password, ownerGlobalUserId, ST.globalUserId, name);
  
  // Update local state
  ST.communities.push({ 
    id: communityId, 
    name, 
    displayName: name,
    password,
    ownerId: ownerGlobalUserId,
    members: {
      [ownerGlobalUserId]: {
        alias: ST.globalUserId,
        isOwner: true,
        joinedAt: Date.now()
      }
    },
    memberCount: 1,
    createdAt: Date.now()
  });
  
  console.log('🔍 createCommunity - ST.communities after push:', ST.communities.map(c => ({id: c.id, members: Object.keys(c.members || {})})));
  
  ST.currentCommunityId = communityId;
  ST.currentCommunity = ST.communities[ST.communities.length - 1];
  ST.currentCommunityAlias = ST.globalUserId;
  ST.isOwner = true;
  
  console.log('🔍 createCommunity - calling loadCommunityProfiles...');
  await loadCommunityProfiles(communityId);
  console.log('🔍 createCommunity - loadCommunityProfiles done, calling showMainApp...');
  console.log('🔍 typeof window.showMainApp:', typeof window.showMainApp);
  window.showMainApp();
  console.log('🔍 showMainApp returned');
  
  saveCommunityList();
  return community;
}

export async function joinCommunity(communityId, password, alias) {
  // Verify community password
  const result = await fbVerifyCommunityPassword(communityId, password);
  if (!result.valid) throw new Error(result.error || 'Contraseña incorrecta');
  
  const community = result.community;
  
  // Check if already member
  if (community.members?.[ST.globalUserId]) {
    throw new Error('Ya eres miembro de esta comunidad');
  }
  
  // Join community (add member)
  await fbJoinCommunity(communityId, ST.globalUserId, alias);
  
  // Update local state
  community.members = community.members || {};
  community.members[ST.globalUserId] = {
    alias,
    isOwner: false,
    joinedAt: Date.now()
  };
  community.memberCount = Object.keys(community.members).length;
  
  // Update local communities list
  const localComm = ST.communities.find(c => c.id === communityId);
  if (localComm) {
    localComm.members = community.members;
    localComm.memberCount = community.memberCount;
  }
  
  // Set current community
  ST.currentCommunityId = communityId;
  ST.currentCommunity = community;
  ST.currentCommunityAlias = alias;
  ST.isOwner = false;
  
  // Load profiles
  await loadCommunityProfiles(communityId);
  
  saveCommunityList();
  return community;
}

export async function leaveCommunity() {
  if (!ST.currentCommunityId || !ST.globalUserId) return;
  
  // Remove from Firebase community members
  await fbDeleteMember(ST.currentCommunityId, ST.globalUserId);
  
  // Update local state
  const community = ST.communities.find(c => c.id === ST.currentCommunityId);
  if (community) {
    delete community.members[ST.globalUserId];
    community.memberCount = Object.keys(community.members).length;
  }
  
  clearCommunitySession();
  saveCommunityList();
}

export function clearCommunitySession() {
  ST.currentCommunity = null;
  ST.currentCommunityId = null;
  ST.communityMembers = [];
  ST.currentCommunityAlias = null;
  ST.isOwner = false;
  ST.profiles = [];
  ST.userProfile = null;
  ST.authState = 'community_selection';
  ST.pendingCommunityId = null;
}

// ============ PROFILE SYNC ============

export async function loadCommunityProfiles(communityId) {
  // Load all profiles in community
  const allProfiles = await fbLoadAllProfiles(communityId) || [];
  ST.profiles = allProfiles;
  
  // Load current user's profile
  const profile = await fbLoadUserProfile(communityId, ST.globalUserId);
  if (profile) {
    ST.userProfile = profile;
  } else {
    ST.userProfile = { userId: ST.globalUserId, pk: {}, album: null, custom: null, candyProgress: {}, tradeAnyDay: {}, ppPinned: {} };
    await fbSaveUserProfile(communityId, ST.globalUserId, ST.userProfile);
  }
}

// Debounced save
export function save() {
  if (ST._pendingSave) clearTimeout(ST._pendingSave);
  ST._pendingSave = setTimeout(async () => {
    await saveUserProfile();
  }, 500);
}

export async function saveUserProfile() {
  if (!ST.currentCommunityId || !ST.globalUserId || !ST.userProfile) return;
  
  try {
    await fbSaveUserProfile(ST.currentCommunityId, ST.globalUserId, ST.userProfile);
  } catch(e) { console.warn('Profile save failed:', e); }
}

// ============ MEGA CONFIG ============

export async function loadMegaConfig() {
  return await fbLoadMegaConfig();
}

export async function saveMegaConfig(config) {
  return await fbSaveMegaConfig(config);
}

// ============ REAL-TIME SUBSCRIPTIONS ============

export function subscribeToCommunity(communityId, onCommunityChange, onMembersChange, onProfileChange) {
  const unsubCommunity = fbSubscribeCommunity(communityId, onCommunityChange);
  const unsubMembers = fbSubscribeCommunityMembers(communityId, onMembersChange);
  const unsubProfile = fbSubscribeUserProfile(communityId, ST.globalUserId, onProfileChange);
  
  return () => {
    unsubCommunity();
    unsubMembers();
    unsubProfile();
  };
}

export const load = loadCommunityList;

export async function loadFromFirebase() {
  try {
    const communities = await fbLoadCommunities();
    if (communities) {
      ST.communities = communities;
      saveCommunityList();
      return true;
    }
  } catch (e) {
    console.warn('Firebase load failed:', e);
  }
  return false;
}