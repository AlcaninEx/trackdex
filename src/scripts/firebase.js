// Firebase module - handles all Firestore operations
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Firebase config
const firebaseConfig = {
  apiKey: "«reda...»",
  authDomain: "pokebestbcn.firebaseapp.com",
  projectId: "pokebestbcn",
  storageBucket: "pokebestbcn.firebasestorage.app",
  messagingSenderId: "38103788359",
  appId: "1:38103788359:web:142c0d9c0e1cb91047ba62"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection references
const communitiesCol = collection(db, 'communities');
const configCol = collection(db, 'config');

// ============ COMMUNITIES ============

export async function fbLoadCommunities() {
  try {
    const snap = await getDocs(communitiesCol);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('Firebase load communities error:', e.code);
    return null;
  }
}

export async function fbSaveCommunity(communityId, data) {
  try {
    await setDoc(doc(communitiesCol, communityId), data);
  } catch (e) {
    console.warn('Firebase save community error:', e.code);
    throw e;
  }
}

export async function fbDeleteCommunity(communityId) {
  try {
    await deleteDoc(doc(communitiesCol, communityId));
  } catch (e) {
    console.warn('Firebase delete community error:', e.code);
    throw e;
  }
}

export async function fbCreateCommunity(communityId, password, ownerId, displayName) {
  const communityRef = doc(communitiesCol, communityId);
  try {
    const snap = await getDocs(query(communitiesCol, where('__name__', '==', communityId)));
    if (!snap.empty) throw new Error('El nombre de comunidad ya existe');
    
    const community = {
      id: communityId,
      password: password, // In production, hash this
      ownerId: ownerId,
      members: {
        [ownerId]: {
          displayName: displayName || ownerId,
          joinedAt: Date.now(),
          isOwner: true
        }
      },
      createdAt: Date.now()
    };
    
    await setDoc(communityRef, community);
    return community;
  } catch (e) {
    console.warn('Firebase create community error:', e);
    throw e;
  }
}

export async function fbJoinCommunity(communityId, userId, displayName) {
  const communityRef = doc(communitiesCol, communityId);
  try {
    const snap = await getDocs(query(communitiesCol, where('__name__', '==', communityId)));
    if (snap.empty) throw new Error('Comunidad no encontrada');
    
    const community = { id: snap.docs[0].id, ...snap.docs[0].data() };
    
    if (!community.members) community.members = {};
    if (community.members[userId]) throw new Error('Ya eres miembro de esta comunidad');
    
    community.members[userId] = {
      displayName: displayName || userId,
      joinedAt: Date.now(),
      isOwner: false
    };
    
    await setDoc(communityRef, community);
    return community;
  } catch (e) {
    console.warn('Firebase join community error:', e.code);
    throw e;
  }
}

export async function fbVerifyCommunityPassword(communityId, password) {
  try {
    const snap = await getDocs(query(communitiesCol, where('__name__', '==', communityId)));
    if (snap.empty) return { valid: false, error: 'Comunidad no encontrada' };
    const community = { id: snap.docs[0].id, ...snap.docs[0].data() };
    return { valid: community.password === password, community: community };
  } catch (e) {
    console.warn('Firebase verify password error:', e.code);
    return { valid: false, error: e.message };
  }
}

// Get community with members
export async function fbLoadCommunity(communityId) {
  try {
    const snap = await getDocs(query(communitiesCol, where('__name__', '==', communityId)));
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (e) {
    console.warn('Firebase load community error:', e.code);
    return null;
  }
}

export async function fbLoadCommunityMembers(communityId) {
  const community = await fbLoadCommunity(communityId);
  if (!community?.members) return [];
  return Object.entries(community.members).map(([userId, data]) => ({
    userId,
    displayName: data.displayName || userId,
    joinedAt: data.joinedAt,
    isOwner: data.isOwner || false
  }));
}

export async function fbDeleteMember(communityId, userId) {
  const community = await fbLoadCommunity(communityId);
  if (!community?.members?.[userId]) return;
  
  delete community.members[userId];
  await fbSaveCommunity(communityId, community);
}

export async function fbUpdateMember(communityId, userId, data) {
  const community = await fbLoadCommunity(communityId);
  if (!community?.members?.[userId]) return;
  
  community.members[userId] = { ...community.members[userId], ...data };
  await fbSaveCommunity(communityId, community);
}

// Real-time subscriptions
export function fbSubscribeCommunity(communityId, callback) {
  const communityRef = doc(communitiesCol, communityId);
  return onSnapshot(communityRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    console.warn('Community subscription error:', error.code);
    callback(null);
  });
}

export function fbSubscribeCommunityMembers(communityId, callback) {
  const communityRef = doc(communitiesCol, communityId);
  return onSnapshot(communityRef, (doc) => {
    if (doc.exists()) {
      const community = { id: doc.id, ...doc.data() };
      const members = community.members ? Object.entries(community.members).map(([userId, data]) => ({
        userId,
        displayName: data.displayName || userId,
        joinedAt: data.joinedAt,
        isOwner: data.isOwner || false
      })) : [];
      callback(members);
    } else {
      callback([]);
    }
  }, (error) => {
    console.warn('Members subscription error:', error.code);
    callback([]);
  });
}

// ============ USER PROFILES (scoped to community) ============

function getUserProfilesCol(communityId) {
  return collection(db, 'communities', communityId, 'profiles');
}

export async function fbLoadAllProfiles(communityId) {
  try {
    const col = getUserProfilesCol(communityId);
    const snap = await getDocs(col);
    return snap.docs.map(d => ({ userId: d.id, ...d.data() }));
  } catch (e) {
    console.warn('Firebase load all profiles error:', e.code);
    return [];
  }
}

export async function fbLoadUserProfile(communityId, userId) {
  try {
    const col = getUserProfilesCol(communityId);
    const snap = await getDocs(query(col, where('__name__', '==', userId)));
    if (snap.empty) return null;
    return { userId: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (e) {
    console.warn('Firebase load user profile error:', e.code);
    return null;
  }
}

export async function fbSaveUserProfile(communityId, userId, data) {
  try {
    const col = getUserProfilesCol(communityId);
    await setDoc(doc(col, userId), data);
  } catch (e) {
    console.warn('Firebase save user profile error:', e.code);
    throw e;
  }
}

export async function fbDeleteUserProfile(communityId, userId) {
  try {
    const col = getUserProfilesCol(communityId);
    await deleteDoc(doc(col, userId));
  } catch (e) {
    console.warn('Firebase delete user profile error:', e.code);
    throw e;
  }
}

export function fbSubscribeUserProfile(communityId, userId, callback) {
  const col = getUserProfilesCol(communityId);
  const docRef = doc(col, userId);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback({ userId: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    console.warn('Profile subscription error:', error.code);
    callback(null);
  });
}

// ============ MEGA CONFIG ============

export async function fbLoadMegaConfig() {
  try {
    const q = query(configCol, where('__name__', '==', 'megaRotation'));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].data();
  } catch (e) {
    console.warn('Mega config load error:', e.code);
  }
  return null;
}

export async function fbSaveMegaConfig(config) {
  try {
    await setDoc(doc(configCol, 'megaRotation'), config);
  } catch (e) {
    console.warn('Mega config save error:', e.code);
  }
}