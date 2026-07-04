// Diarias screen
import { show } from './helpers.js';

export function openDiarias() {
  show('diarias-screen');
  document.getElementById('home-menu').style.display = 'none';
  window.scrollTo(0, 0);
}

export function closeDiarias() {
  show('profile-screen');
  document.getElementById('home-menu').style.display = 'block';
  document.getElementById('home-profile-section').style.display = 'none';
  document.getElementById('trainer-name-bar').textContent = '👋 ' + window.ST?.cur;
  import('./main-screen.js').then(m => m.updateHomeMenu());
  window.scrollTo(0, 0);
}

window.openDiarias = openDiarias;
window.closeDiarias = closeDiarias;