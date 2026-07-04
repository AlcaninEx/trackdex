// Main App entry point - exports init function for main.js to call
// NEW ARCHITECTURE: Community-first
import { loadAllData } from './data-loader.js';
import { loadFromFirebase, load, loadCommunityList } from './storage.js';
import { showCommunitySelection, showMainApp, showCommunityLogin, showCommunityRegister } from './profile.js';
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

    // Load data FIRST (needed for countType, albumPks, etc.)
    await loadAllData();

    // Load community list and try to restore session
    const firebaseLoaded = await loadFromFirebase();
    if (!firebaseLoaded) {
      load(); // fallback to localStorage (loads community list)
    }

    // Check if we have a valid session to restore
    if (ST.isLoggedIn && ST.currentCommunityId && ST.currentUserId) {
      // Try to restore the community session
      try {
        const community = ST.communities.find(c => c.id === ST.currentCommunityId);
        if (community) {
          await loadFromFirebase(); // This will restore the full session
          if (ST.isLoggedIn && ST.currentCommunityId === ST.currentCommunityId) {
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

    // No valid session - show community selection
    showCommunitySelection();
    show('profile-screen');
    window.scrollTo(0, 0);
  } catch (e) {
    console.error('Boot error:', e);
    // Fallback
    load();
    showCommunitySelection();
    show('profile-screen');
    window.scrollTo(0, 0);
  }
}

// DO NOT auto-run init - let main.js control initialization