// Storage module - localStorage + Firebase sync
import { ST } from './state.js';
import { fbSave, fbDelete, fbLoadProfiles, fbLoadCommunities, fbSaveCommunity, fbJoinCommunity, fbCreateCommunity, fbVerifyCommunityPassword } from './firebase.js';

const STORAGE_KEY = 'pokeBCN';

export function save() {
  // Save to localStorage as backup (includes community data)
  try {
    const data = { 
      profiles: ST.profiles,
      currentCommunityId: ST.communityId,
      availableCommunities: ST.availableCommunities
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); 
  } catch(e) { console.warn('localStorage save failed:', e); }
  
  // Debounced Firebase save for profiles
  if (ST._pendingSave) {
    clearTimeout(ST._pendingSave);
  }
  ST._pendingSave = setTimeout(async () => {
    for (const p of ST.profiles) {
      await fbSave(p.name, {
        pk: p.pk || {},
        album: p.album || null,
        custom: p.custom || null,
        candyProgress: p.candyProgress || {},
        tradeAnyDay: p.tradeAnyDay || {},
        ppPinned: p.ppPinned || {}
      });
    }
    // Save community data if in a community
    if (ST.communityId && ST.community) {
      await fbSaveCommunity(ST.communityId, ST.community);
    }
  }, 500);
}

export function load() {
  try { 
    const s = localStorage.getItem(STORAGE_KEY); 
    if (s) { 
      const d = JSON.parse(s); 
      ST.profiles = d.profiles || []; 
      ST.communityId = d.currentCommunityId || null;
      ST.availableCommunities = d.availableCommunities || [];
    } 
  } catch(e) { 
    ST.profiles = []; 
    ST.communityId = null;
    ST.availableCommunities = [];
  }
}

export async function loadFromFirebase() {
  try {
    // Load profiles
    const fbProfiles = await fbLoadProfiles();
    if (fbProfiles !== null && fbProfiles.length >= 0) {
      ST.profiles = fbProfiles.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // Load communities
    const fbCommunities = await fbLoadCommunities();
    if (fbCommunities !== null) {
      ST.availableCommunities = fbCommunities;
    }
    
    // Restore current community if we have one
    if (ST.communityId) {
      const community = ST.availableCommunities.find(c => c.id === ST.communityId);
      if (community) {
        ST.community = community;
        if (community.members && ST.cur) {
          ST.myMemberData = community.members[ST.cur] || null;
          ST.communityRole = ST.myMemberData?.isOwner ? 'owner' : 'member';
        }
      }
    }
    
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
      profiles: ST.profiles,
      currentCommunityId: ST.communityId,
      availableCommunities: ST.availableCommunities
    })); } catch(e) {}
    return true;
  } catch (e) {
    console.warn('Firebase load failed, using localStorage:', e);
    return false;
  }
}

// Community-specific storage functions
export async function createCommunity(communityId, password, ownerName, displayName) {
  const community = await fbCreateCommunity(communityId, password, ownerName, displayName);
  ST.community = community;
  ST.communityId = communityId;
  ST.communityRole = 'owner';
  ST.myMemberData = community.members[ownerName];
  
  // Add to available communities
  if (!ST.availableCommunities.find(c => c.id === communityId)) {
    ST.availableCommunities.push(community);
  }
  
  save();
  return community;
}

export async function joinCommunity(communityId, password, userName, displayName) {
  const result = await fbVerifyCommunityPassword(communityId, password);
  if (!result.valid) {
    throw new Error(result.error || 'Contraseña incorrecta');
  }
  
  const community = await fbJoinCommunity(communityId, userName, displayName);
  ST.community = community;
  ST.communityId = communityId;
  ST.communityRole = 'member';
  ST.myMemberData = community.members[userName];
  
  // Add to available communities
  if (!ST.availableCommunities.find(c => c.id === communityId)) {
    ST.availableCommunities.push(community);
  }
  
  save();
  return community;
}

export async function leaveCommunity() {
  if (!ST.communityId || !ST.cur) return;
  
  // Remove user from community members
  if (ST.community?.members?.[ST.cur]) {
    delete ST.community.members[ST.cur];
    await fbSaveCommunity(ST.communityId, ST.community);
  }
  
  clearCommunity();
  save();
}

export function clearCommunity() {
  ST.community = null;
  ST.communityId = null;
  ST.communityRole = null;
  ST.myMemberData = null;
}

export function setCurrentCommunity(communityId) {
  ST.communityId = communityId;
  const community = ST.availableCommunities.find(c => c.id === communityId);
  if (community) {
    ST.community = community;
    if (community.members && ST.cur) {
      ST.myMemberData = community.members[ST.cur] || null;
      ST.communityRole = ST.myMemberData?.isOwner ? 'owner' : 'member';
    }
  }
  save();
}