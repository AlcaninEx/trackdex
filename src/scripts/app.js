// Main App entry point - exports init function for main.js to call
import { loadAllData } from './data-loader.js';
import { loadFromFirebase, load, setCurrentCommunity } from './storage.js';
import { renderProfiles, showOnboardingState, showProfilesState, showHomeMenu, showCommunitySelection } from './profile.js';
import { show, ST } from './helpers.js';

// Initialize dark mode from localStorage
if (localStorage.getItem('darkMode') === '1') {
  document.body.classList.add('dark');
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#dark-btn,#dark-btn2,#dark-btn-home').forEach(b => { if (b) b.textContent = '☀️'; });
  });
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Export init function for main.js to call
export async function init() {
  try {
    // Show loading state
    document.getElementById('profile-screen').style.display = 'block';
    window.scrollTo(0, 0);
    const el = document.getElementById('profiles-list');
    if (el) el.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px">⏳ Cargando...</p>';

    // Load data FIRST (needed for countType, albumPks, etc.)
    await loadAllData();

    // Load profiles from Firebase or localStorage
    const firebaseLoaded = await loadFromFirebase();
    if (!firebaseLoaded) {
      load(); // fallback to localStorage
    }
    
    // Restore current community if we have one saved
    if (ST.communityId) {
      const community = ST.availableCommunities.find(c => c.id === ST.communityId);
      if (community) {
        setCurrentCommunity(ST.communityId);
      }
    }
    
    // Show appropriate state based on profiles and community
    if (ST.profiles.length === 0) {
      showOnboardingState();
    } else if (!ST.communityId && ST.availableCommunities && ST.availableCommunities.length > 0) {
      // Has profiles but no community selected - show community selection
      showCommunitySelection();
    } else if (ST.communityId && ST.community) {
      // Has community selected - go to members view
      import('./profile.js').then(m => m.showCommunityMembersState());
    } else {
      // Has profiles but no communities available - show profiles state
      showProfilesState();
    }
    show('profile-screen');
    window.scrollTo(0, 0);
  } catch (e) {
    console.error('Boot error:', e);
    // Fallback to localStorage
    load();
    if (ST.profiles.length === 0) {
      showOnboardingState();
    } else if (!ST.communityId && ST.availableCommunities && ST.availableCommunities.length > 0) {
      showCommunitySelection();
    } else if (ST.communityId && ST.community) {
      import('./profile.js').then(m => m.showCommunityMembersState());
    } else {
      showProfilesState();
    }
    show('profile-screen');
    window.scrollTo(0, 0);
  }
}

// DO NOT auto-run init - let main.js control initialization