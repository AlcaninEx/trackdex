// Firebase module - handles all Firestore operations
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Firebase config - use your actual config
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
const profilesCol = collection(db, 'profiles');
const communitiesCol = collection(db, 'communities');
const configCol = collection(db, 'config');

export async function fbLoadProfiles() {
  try {
    const snap = await getDocs(profilesCol);
    return snap.docs.map(d => ({ name: d.id, ...d.data() }));
  } catch (e) {
    console.warn('Firebase load error:', e.code, '— using localStorage');
    return null;
  }
}

export async function fbSave(name, data) {
  try {
    await setDoc(doc(profilesCol, name), data);
  } catch (e) {
    console.warn('Firebase save error:', e.code);
  }
}

export async function fbDelete(name) {
  try {
    await deleteDoc(doc(profilesCol, name));
  } catch (e) {
    console.warn('Firebase delete error:', e.code);
  }
}

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

// Join a community (add user to members)
export async function fbJoinCommunity(communityId, userName, displayName) {
  const communityRef = doc(communitiesCol, communityId);
  try {
    // Use transaction or direct update - for simplicity, read-modify-write
    const snap = await getDocs(query(communitiesCol, where('__name__', '==', communityId)));
    if (snap.empty) throw new Error('Comunidad no encontrada');
    const community = { id: snap.docs[0].id, ...snap.docs[0].data() };
    
    if (!community.members) community.members = {};
    if (community.members[userName]) throw new Error('Ya eres miembro de esta comunidad');
    
    community.members[userName] = {
      displayName: displayName || userName,
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

// Create a new community
export async function fbCreateCommunity(communityId, password, ownerName, displayName) {
  const communityRef = doc(communitiesCol, communityId);
  try {
    // Check if exists
    const snap = await getDocs(query(communitiesCol, where('__name__', '==', communityId)));
    if (!snap.empty) throw new Error('El nombre de comunidad ya existe');
    
    const community = {
      id: communityId,
      password: password, // In production, should be hashed
      owner: ownerName,
      members: {
        [ownerName]: {
          displayName: displayName || ownerName,
          joinedAt: Date.now(),
          isOwner: true
        }
      },
      createdAt: Date.now()
    };
    
    await setDoc(communityRef, community);
    return community;
  } catch (e) {
    console.warn('Firebase create community error:', e.code);
    throw e;
  }
}

// Verify community password
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

// Subscribe to community changes (real-time)
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