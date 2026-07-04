// Perfil screen
import { show, showToast } from './helpers.js';
import { save } from './storage.js';

export function openPerfilScreen() {
  if (!window.ST?.cur) { showToast('Selecciona un entrenador primero'); return; }
  document.getElementById('perfil-name-label').textContent = window.ST.cur;
  show('perfil-screen');
  document.getElementById('home-menu').style.display = 'none';
  window.scrollTo(0, 0);
}

export function closePerfilScreen() {
  show('profile-screen');
  document.getElementById('home-menu').style.display = 'block';
  document.getElementById('home-profile-section').style.display = 'none';
  document.getElementById('trainer-name-bar').textContent = '👋 ' + window.ST?.cur;
  import('./main-screen.js').then(m => m.updateHomeMenu());
  window.scrollTo(0, 0);
}

export function confirmDeleteRaidTeam() {
  if (!confirm('¿Estás seguro? Esto borrará TODOS tus Pokémon de Incursión de todos los tipos. Esta acción no se puede deshacer.')) return;
  const p = window.gp?.(window.ST?.cur);
  if (!p?.album) return;
  Object.keys(p.album).forEach(id => {
    if (!id.includes('-dmax-')) {
      delete p.album[id];
      if (p.custom) delete p.custom[id];
      if (p.pk) delete p.pk[id];
    }
  });
  save();
  showToast('🗑️ Pokémon de Incursión borrados');
  import('./main-screen.js').then(m => m.updateHomeMenu());
}

export function confirmDeleteDmaxTeam() {
  if (!confirm('¿Estás seguro? Esto borrará TODOS tus Pokémon Dynamax de todos los tipos. Esta acción no se puede deshacer.')) return;
  const p = window.gp?.(window.ST?.cur);
  if (!p?.album) return;
  Object.keys(p.album).forEach(id => {
    if (id.includes('-dmax-')) {
      delete p.album[id];
      if (p.custom) delete p.custom[id];
      if (p.pk) delete p.pk[id];
    }
  });
  save();
  showToast('🗑️ Pokémon Dynamax borrados');
  import('./main-screen.js').then(m => m.updateHomeMenu());
}

window.openPerfilScreen = openPerfilScreen;
window.closePerfilScreen = closePerfilScreen;
window.confirmDeleteRaidTeam = confirmDeleteRaidTeam;
window.confirmDeleteDmaxTeam = confirmDeleteDmaxTeam;