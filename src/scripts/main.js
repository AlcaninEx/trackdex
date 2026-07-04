// Main entry point - loads data then initializes the app
import { loadAllData } from './data-loader.js';
import { loadFromFirebase, load } from './storage.js';
import { renderProfiles } from './profile.js';
import { show } from './helpers.js';

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

// Main initialization
async function init() {
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
    
    renderProfiles();
    show('profile-screen');
    window.scrollTo(0, 0);
  } catch (e) {
    console.error('Boot error:', e);
    // Fallback to localStorage
    load();
    renderProfiles();
    show('profile-screen');
    window.scrollTo(0, 0);
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.init = init;