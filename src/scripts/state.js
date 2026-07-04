// State management - single source of truth
// NEW ARCHITECTURE: Community-first, identity per community

export const ST = {
  // Community state
  communities: [],           // List of available communities {id, name, memberCount}
  currentCommunity: null,    // Active community {id, name, ownerId, settings}
  communityMembers: [],      // Members of current community [{userId, displayName, isOwner, joinedAt}]
  
  // User identity within current community
  currentUserId: null,       // User's ID in current community
  currentUserDisplayName: null,
  isOwner: false,
  isLoggedIn: false,
  
  // App state (scoped to current community + user)
  cur: null,                 // current view/profile context
  view: null,                // viewing another user's profile (read-only)
  type: null,                // current type (fire, water, etc.)
  expanded: null,            // expanded card id
  tab: 'album',              // 'album' or 'ranking'
  rankTab: 'raid',           // 'raid' or 'dmax'
  albumTab: 'raid',          // 'raid' or 'dmax'
  _pendingSave: null,
  _rankCache: {},
  _megaFilter: {},
  
  // Community-scoped data (loaded per community)
  profiles: [],              // All members' profiles in this community
  userProfile: null,         // Current user's profile data
  
  // Auth state
  authState: 'idle',         // 'idle' | 'selecting_community' | 'logging_in' | 'registering' | 'logged_in'
  pendingCommunityId: null,  // Community user is trying to join
};

// Helpers
export function gp(userId) { return ST.profiles.find(p => p.userId === userId); }

export function goc(userId) { 
  let p = gp(userId); 
  if (!p) { 
    p = { userId, pk: {}, album: null, custom: null, candyProgress: {}, tradeAnyDay: {}, ppPinned: {} }; 
    ST.profiles.push(p); 
  } 
  return p; 
}

export function defaultAlbum() { return {}; }

export function getAlbum(userId) {
  const p = gp(userId);
  if (!p) return defaultAlbum();
  if (p.album === undefined || p.album === null) return defaultAlbum();
  return p.album;
}

export function getCurrentDpsForName(name, type) {
  const rows = window.RANKINGS?.[type];
  if (!rows) return null;
  const cleanName = name.replace(' (Shadow)', '').trim();
  const row = rows.find(r => r.n === cleanName);
  return row ? row.dps : null;
}

export function albumPks(userId, type) {
  const a = getAlbum(userId);
  const p = gp(userId);
  const customIds = new Set(p?.custom ? Object.keys(p.custom) : []);
  
  // PD entries in album (not overridden by custom)
  const pdPks = (window.PD || []).filter(pk => 
    pk.type === type && a[pk.id] && !customIds.has(pk.id) && !pk.id.includes('-dmax-')
  );
  
  // Custom entries in album
  const customPks = [];
  if (p?.custom) {
    Object.entries(p.custom).forEach(([id, d]) => {
      if (d.type === type && a[id] === true && !id.includes('-dmax-') && !d.isDmax) {
        const pdRef = d.pdRef ? (window.PD || []).find(x => x.id === d.pdRef) : null;
        const liveDps = getCurrentDpsForName(d.n, type);
        customPks.push({
          id, name: d.n, type: d.type, img: d.img || (pdRef ? pdRef.img : ''),
          dps: (liveDps !== null ? liveDps : d.dps), fast: d.fast, charge: d.charge,
          tags: pdRef ? pdRef.tags : (d.tags || inferTags(d.n, d.fast?.endsWith('*'), d.charge?.endsWith('*'), [])),
          evo: pdRef ? pdRef.evo : null, isCustom: true
        });
      }
    });
  }
  
  return [...pdPks, ...customPks].sort((a, b) => b.dps - a.dps);
}

export function countType(userId, type) {
  const p = gp(userId);
  const pks = albumPks(userId, type);
  const owned = pks.filter(pk => p?.pk?.[pk.id]?.owned).length;
  return { o: owned, t: 6 };
}

// Community helpers
export function getCurrentCommunity() {
  return ST.currentCommunity;
}

export function getCommunityMembers() {
  return ST.communityMembers || [];
}

export function getCurrentUser() {
  if (!ST.currentUserId) return null;
  return ST.communityMembers.find(m => m.userId === ST.currentUserId) || null;
}

export function isCurrentUserOwner() {
  return ST.isOwner === true;
}

export function setCurrentCommunity(community) {
  ST.currentCommunity = community;
  ST.currentCommunityId = community?.id || null;
}

export function setCurrentUser(userId, displayName, isOwner = false) {
  ST.currentUserId = userId;
  ST.currentUserDisplayName = displayName;
  ST.isOwner = isOwner;
  ST.isLoggedIn = true;
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

export function inferTags(name, isFastLegacy, isChargeLegacy, evo) {
  const tags = [];
  if (isFastLegacy || isChargeLegacy) tags.push({ type: 'legacy', label: 'Legacy' });
  return tags;
}