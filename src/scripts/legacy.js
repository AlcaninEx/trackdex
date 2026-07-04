// Legacy Guide screen
import { show } from './helpers.js';

const LEGACY_SPRITES = {
  'Rillaboom':'812','Grookey':'810','Ninetales':'38','Ninetales Alola':'10100',
  'Cinderace':'815','Scorbunny':'813','Tinkaton':'959','Tinkatink':'957',
  'Oinkologne':'916','Lechonk':'915','Frigibax':'996','Baxcalibur':'998',
  'Arctibax':'997','Mewtwo':'150','Nickit':'827','Yamper':'835',
  'Fidough':'926','Tadbulb':'938',
};

function legacyBall(name, size) {
  const id = LEGACY_SPRITES[name];
  const s = size || 40;
  const img = id ? 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png' : '';
  return `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:1px;margin:2px">
    <div style="width:${s}px;height:${s}px;border-radius:50%;background:#e0f2f1;display:flex;align-items:center;justify-content:center;border:2px solid #4db6ac">
      <img src="${img}" style="width:${s-8}px;height:${s-8}px;object-fit:contain" onerror="this.style.opacity=.1">
    </div>
    <div style="font-size:8px;font-weight:700;color:#00695c;text-align:center;max-width:${s+14}px;line-height:1.1">${name}</div>
  </div>`;
}

export function openLegacy() {
  const tbl = document.getElementById('lg-thisyear');
  if (tbl) {
    const rows = [
      {mes:'Enero', evt:'Día Comunidad', pkm:['Grookey','Rillaboom'], atk:'Planta Feroz (Frenzy Plant)'},
      {mes:'Febrero', evt:'Día Comunidad', pkm:['Ninetales','Ninetales Alola'], atk:'Bola Energía / Meteorobola'},
      {mes:'Marzo', evt:'Día Comunidad', pkm:['Scorbunny','Cinderace'], atk:'Anillo Ígneo (Blast Burn)'},
      {mes:'Abril', evt:'Día Comunidad', pkm:['Tinkatink','Tinkaton'], atk:'Martillo Gigante (Gigaton Hammer)'},
      {mes:'Mayo', evt:'Día Comunidad', pkm:['Lechonk','Oinkologne'], atk:'Bofetón Lodo (Mud Slap)'},
    ];
    tbl.innerHTML = rows.map(r => `<div class="lg-row">
      <div style="display:flex;gap:2px;flex-shrink:0">${r.pkm.map(n=>legacyBall(n,40)).join('')}</div>
      <div class="lg-row-info"><div class="lg-month">${r.mes}</div><div style="font-weight:700;color:#333">${r.pkm[r.pkm.length-1]}</div><div class="lg-attack">${r.atk}</div></div>
    </div>`).join('');
  }
  const up = document.getElementById('lg-upcoming');
  if (up) {
    const rows = [
      {fecha:'Sáb 20 jun 2026', pkm:['Frigibax','Baxcalibur'], atk:'Asalto Glaive (Glaive Rush)', extra:'14:00-17:00 · evolucionar hasta 21:00-22:00'},
      {fecha:'11-12 jul 2026', pkm:['Mewtwo'], atk:'GO Fest: Mega-Mewtwo X e Y · Onda Mental + Contraataque', extra:'Se obtiene al capturar, no evolucionando'},
      {fecha:'Sáb 4 jul 2026', pkm:[], atk:'Día Comunidad de Julio — por anunciar', extra:''},
      {fecha:'Dom 16 ago 2026', pkm:['Nickit','Yamper','Fidough','Tadbulb'], atk:'Día Comunidad de Agosto — ganador de la votación', extra:'Saldrá uno de estos 4'},
    ];
    up.innerHTML = rows.map(r => `<div class="lg-row">
      ${r.pkm.length?`<div style="display:flex;gap:2px;flex-shrink:0;flex-wrap:wrap;max-width:130px">${r.pkm.map(n=>legacyBall(n,38)).join('')}</div>`:'<div style="width:44px;flex-shrink:0;text-align:center;font-size:20px">❓</div>'}
      <div class="lg-row-info"><div class="lg-month">${r.fecha}</div><div class="lg-attack">${r.atk}</div>${r.extra?`<div style="font-size:10px;color:#999;margin-top:2px">${r.extra}</div>`:''}</div>
    </div>`).join('');
  }
  show('legacy-screen');
  document.getElementById('home-menu').style.display = 'none';
  window.scrollTo(0, 0);
}

export function closeLegacy() {
  show('profile-screen');
  document.getElementById('home-menu').style.display = 'block';
  document.getElementById('home-profile-section').style.display = 'none';
  document.getElementById('trainer-name-bar').textContent = '👋 ' + window.ST?.cur;
  import('./main-screen.js').then(m => m.updateHomeMenu());
  window.scrollTo(0, 0);
}

export function showLegacyGuide() { openLegacy(); }

window.openLegacy = openLegacy;
window.closeLegacy = closeLegacy;
window.showLegacyGuide = showLegacyGuide;