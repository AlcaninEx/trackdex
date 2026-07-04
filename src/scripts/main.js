// Main entry point - loads data then initializes the app
import { loadAllData } from './data-loader.js';

// Load data first, then load the app logic
async function init() {
  try {
    await loadAllData();
    
    // Load the main app logic (which expects globals to be set)
    await import('./app.js');
    
    console.log('🚀 App initialized');
  } catch (e) {
    console.error('Failed to initialize app:', e);
    // Fallback: show error in UI
    document.body.innerHTML = '<div style="padding:20px;text-align:center;color:red">Error cargando la app: ' + e.message + '</div>';
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}