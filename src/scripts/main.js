// Main entry point - loads data then initializes the app
import { init } from './app.js';

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

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Make init available globally for debugging
window.init = init;

// Debug: log when main.js runs
console.log('✅ main.js loaded and running');