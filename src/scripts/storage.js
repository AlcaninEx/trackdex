// Storage module - localStorage + Firebase sync
// NEW ARCHITECTURE: Community-first, scoped data
import { ST } from './state.js';
import { 
  fbLoadCommunities, fbSaveCommunity, fbVerifyCommunityPassword, fbCreateCommunity,
  fbJoinCommunity, fbLoadCommunityMembers, fbUpdateMember, fbDeleteMember,
  fbLoadUserProfile, fbLoadAllProfiles, fbSaveUserProfile, fbDeleteUserProfile,
  fbSubscribeCommunity, fbSubscribeCommunityMembers, fbSubscribeUserProfile,
  fbLoadMegaConfig, fbSaveMegaConfig
} from './firebase.js';

const STORAGE_KEY = 'pokeBCN_v2';

// ============ LOCALSTORAGE ============

export function saveCommunityList() {
  try {
    const data = { 
      communities: ST.communities,
      lastCommunityId: ST.currentCommunityId,
      lastUserId: ST.currentUserId
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
      ST.currentUserId = d.lastUserId || null;
    } 
  } catch(e) { 
    ST.communities = []; 
    ST.currentCommunityId = null;
    ST.currentUserId = null;
  }
}

// ============ FIREBASE SYNC ============

export async function loadFromFirebase() {
  try {
    // Load communities list
    const fbCommunities = await fbLoadCommunities();
    if (fbCommunities !== null) {
      ST.communities = fbCommunities;
    }
    
    // Restore last community if any
    if (ST.currentCommunityId) {
      const community = ST.communities.find(c => c.id === ST.currentCommunityId);
      if (community) {
        await enterCommunity(community.id);
      }
    }
    
    saveCommunityList();
    return true;
  } catch (e) {
    console.warn('Firebase load failed, using localStorage:', e);
    return false;
  }
}

// Alias for backward compatibility
export const load = loadFromFirebase;

// ============ COMMUNITY ACTIONS ============

export async function createCommunity(communityId, password, userId, displayName) {
  // Create community in Firebase (already adds owner as member)
  await fbCreateCommunity(communityId, password, userId, displayName);
  
  // Update local state
  const community = { id: communityId, password, ownerId: userId, createdAt: Date.now() };
  ST.currentCommunity = community;
  ST.currentCommunityId = communityId;
  ST.communityMembers = [{
    userId,
    displayName,
    isOwner: true,
    joinedAt: Date.now()
  }];
  ST.currentUserId = userId;
  ST.currentUserDisplayName = displayName;
  ST.isOwner = true;
  ST.isLoggedIn = true;
  ST.authState = 'logged_in';
  
  // Create empty profile for owner
  ST.profiles = [{ userId, pk: {}, album: null, custom: null, candyProgress: {}, tradeAnyDay: {}, ppPinned: {} }];
  ST.userProfile = ST.profiles[0];
  
  // Add to communities list
  if (!ST.communities.find(c => c.id === communityId)) {
    ST.communities.push({ id: communityId, memberCount: 1 });
  }
  
  saveCommunityList();
  return community;
}

export async function joinCommunity(communityId, password, userId, displayName) {
  // Verify password
  const result = await fbVerifyCommunityPassword(communityId, password);
  if (!result.valid) {
    throw new Error(result.error || 'Contraseña incorrecta');
  }
  
  // Join community (add to members)
  await fbJoinCommunity(communityId, userId, displayName);
  
  // Load members
  const members = await fbLoadCommunityMembers(communityId) || [];
  
  // Load or create user profile
  let profile = await fbLoadUserProfile(communityId, userId);
  if (!profile) {
    profile = { userId, pk: {}, album: null, custom: null, candyProgress: {}, tradeAnyDay: {}, ppPinned: {} };
    await fbSaveUserProfile(communityId, userId, profile);
  }
  
  // Load all profiles in community
  const allProfiles = await fbLoadAllProfiles(communityId) || [];
  
  // Update local state
  ST.currentCommunity = result.community;
  ST.currentCommunityId = communityId;
  ST.communityMembers = members;
  ST.currentUserId = userId;
  ST.currentUserDisplayName = displayName;
  ST.isOwner = members.find(m => m.userId === userId)?.isOwner || false;
  ST.isLoggedIn = true;
  ST.authState = 'logged_in';
  ST.profiles = allProfiles;
  ST.userProfile = profile;
  
  // Add to communities list
  if (!ST.communities.find(c => c.id === communityId)) {
    ST.communities.push(result.community);
  }
  
  saveCommunityList();
  return result.community;
}

export async function loginToCommunity(communityId, userId, password) {
  // Verify community password first
  const result = await fbVerifyCommunityPassword(communityId, password);
  if (!result.valid) {
    throw new Error(result.error || 'Contraseña de comunidad incorrecta');
  }
  
  // Verify user exists in community
  const members = await fbLoadCommunityMembers(communityId) || [];
  console.log('🔍 Members loaded for login:', JSON.stringify(members, null, 2));
  console.log('🔍 Looking for userId:', userId);
  
  const member = members.find(m => m.userId === userId);
  console.log('🔍 Member found:', member);
  
  if (!member) {
    console.log('🔍 All member IDs:', members.map(m => m.userId));
    throw new Error('Usuario no encontrado en esta comunidad');
  }
  
  // Verify user password (in production, use proper auth)
  // For now, we trust the community password + userId combo
  
  // Load user profile
  const profile = await fbLoadUserProfile(communityId, userId) || { userId, pk: {}, album: null, custom: null, candyProgress: {}, tradeAnyDay: {}, ppPinned: {} };
  
  // Load all profiles
  const allProfiles = await fbLoadAllProfiles(communityId) || [];
  
  // Update state
  ST.currentCommunity = result.community;
  ST.currentCommunityId = communityId;
  ST.communityMembers = members;
  ST.currentUserId = userId;
  ST.currentUserDisplayName = member.displayName;
  ST.isOwner = member.isOwner || false;
    ST.isLoggedIn = true;
    ST.authState = 'logged_in';
    ST.profiles = allProfiles;
    ST.userProfile = profile;
  saveCommunityList();
  return result.community;
}

export async function leaveCommunity() {
  if (!ST.currentCommunityId || !ST.currentUserId) return;
  
  // Could remove member from Firebase here if desired
  // For now just clear local state
  
  clearCommunitySession();
  saveCommunityList();
}

export function clearCommunitySession() {
  ST.currentCommunity = null;
  ST.currentCommunityId = null;
  ST.communityMembers = [];
  ST.currentUserId = null;
  ST.currentUserDisplayName = null;
  ST.isOwner = false;
  ST.isLoggedIn = false;
  ST.profiles = [];
  ST.userProfile = null;
  ST.authState = 'idle';
  ST.pendingCommunityId = null;
}

export async function setCurrentCommunity(communityId) {
  ST.currentCommunityId = communityId;
  const community = ST.communities.find(c => c.id === communityId);
  if (community) {
    ST.currentCommunity = community;
    // Load members
    const members = await fbLoadCommunityMembers(communityId) || [];
    ST.communityMembers = members;
  }
  saveCommunityList();
}

// ============ USER PROFILE SYNC ============

export async function saveUserProfile() {
  if (!ST.currentCommunityId || !ST.currentUserId || !ST.userProfile) return;
  
  try {
    await fbSaveUserProfile(ST.currentCommunityId, ST.currentUserId, ST.userProfile);
  } catch(e) { console.warn('Profile save failed:', e); }
}

// Debounced save
export function save() {
  if (ST._pendingSave) clearTimeout(ST._pendingSave);
  ST._pendingSave = setTimeout(async () => {
    await saveUserProfile();
  }, 500);
}

// ============ MEGA CONFIG ============

export async function loadMegaConfig() {
  return await fbLoadMegaConfig();
}

export async function saveMegaConfig(config) {
  await fbSaveMegaConfig(config);
}

// ============ REAL-TIME SUBSCRIPTIONS ============

export function subscribeToCommunity(communityId, onCommunityChange, onMembersChange, onProfileChange) {
  const unsubCommunity = fbSubscribeCommunity(communityId, onCommunityChange);
  const unsubMembers = fbSubscribeCommunityMembers(communityId, onMembersChange);
  const unsubProfile = fbSubscribeUserProfile(communityId, ST.currentUserId, onProfileChange);
  
  return () => {
    unsubCommunity();
    unsubMembers();
    unsubProfile();
  };
}