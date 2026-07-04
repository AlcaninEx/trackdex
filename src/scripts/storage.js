// Storage module - localStorage + Firebase sync
import { ST } from './state.js';
import { fbSave, fbDelete, fbLoadProfiles } from './firebase.js';

export function save() {
  // Save to localStorage as backup
  try { 
    localStorage.setItem('pokeBCN', JSON.stringify({ profiles: ST.profiles })); 
  } catch(e) {}
  
  // Debounced Firebase save
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
  }, 500);
}

export function load() {
  try { 
    const s = localStorage.getItem('pokeBCN'); 
    if (s) { 
      const d = JSON.parse(s); 
      ST.profiles = d.profiles || []; 
    } 
  } catch(e) { 
    ST.profiles = []; 
  }
}

export async function loadFromFirebase() {
  try {
    const fbProfiles = await fbLoadProfiles();
    if (fbProfiles !== null && fbProfiles.length >= 0) {
      ST.profiles = fbProfiles.sort((a, b) => a.name.localeCompare(b.name));
      try { localStorage.setItem('pokeBCN', JSON.stringify({ profiles: ST.profiles })); } catch(e) {}
      return true;
    }
  } catch (e) {
    console.warn('Firebase load failed, using localStorage:', e);
  }
  return false;
}