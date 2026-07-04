// Firebase module - handles all Firestore operations
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Firebase config - use your actual config
const firebaseConfig = {
  apiKey: "AIzaSyCtcyf4J9V6Y7e8n7q3J8y5x6v4w2u1t0s",
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