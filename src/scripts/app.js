// Main App entry point - exports init function for main.js to call
// NEW ARCHITECTURE: Global user -> Communities -> Profiles per community
import { loadAllData } from './data-loader.js';
import { loadFromFirebase, loadCommunityList, initGlobalAuth } from './storage.js';
import { showCommunitySelection, showGlobalLogin, showMainApp } from './profile.js';
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

    // Initialize global auth (loads remembered user)
    initGlobalAuth();

    // Load data FIRST (needed for countType, albumPks, etc.)
    await loadAllData();

    // Load community list and try to restore session from Firebase
    const firebaseLoaded = await loadFromFirebase();
    if (!firebaseLoaded) {
      load(); // fallback to localStorage (loads community list)
    }

    // Check if we have a valid session to restore
    if (ST.authState === 'logged_in' && ST.currentCommunityId && ST.globalUserId) {
      // Try to restore the community session
      try {
        const community = ST.communities.find(c => c.id === ST.currentCommunityId);
        if (community) {
          await loadFromFirebase(); // This will restore the full session
          if (ST.authState === 'logged_in' && ST.currentCommunityId === ST.currentCommunityId) {
            showMainApp();
            show('profile-screen');
            window.scrollTo(0, 0);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to restore session:', e);
      }
    }

    // Check if we have a global user (remember me)
    if (ST.globalUserId) {
      // Show community selection
      showCommunitySelection();
      show('community-selection-screen');
      window.scrollTo(0, 0);
      return;
    }

    // No global user - show global login
    showGlobalLogin();
    show('global-login-screen');
    window.scrollTo(0, 0);
  } catch (e) {
    console.error('Boot error:', e);
    // Fallback
    load();
    showGlobalLogin();
    show('global-login-screen');
    window.scrollTo(0, 0);
  }
}

// DO NOT auto-run init - let main.js control initialization