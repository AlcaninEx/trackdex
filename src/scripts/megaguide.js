// Mega Guide screen
import { show, showToast, si } from './helpers.js';
import { fbLoadMegaConfig, fbSaveMegaConfig } from './firebase.js';

const MEGA_LIST = [
  {id:'10033', name:'Venusaur'}, {id:'10034', name:'Charizard X'}, {id:'10035', name:'Charizard Y'},
  {id:'10036', name:'Blastoise'}, {id:'10037', name:'Alakazam'}, {id:'10038', name:'Gengar'},
  {id:'10039', name:'Kangaskhan'}, {id:'10040', name:'Pinsir'}, {id:'10041', name:'Gyarados'},
  {id:'10042', name:'Aerodactyl'}, {id:'10043', name:'Mewtwo X'}, {id:'10044', name:'Mewtwo Y'},
  {id:'10045', name:'Ampharos'}, {id:'10046', name:'Scizor'}, {id:'10047', name:'Heracross'},
  {id:'10048', name:'Houndoom'}, {id:'10049', name:'Tyranitar'}, {id:'10050', name:'Blaziken'},
  {id:'10051', name:'Gardevoir'}, {id:'10052', name:'Mawile'}, {id:'10053', name:'Aggron'},
  {id:'10054', name:'Medicham'}, {id:'10055', name:'Manectric'}, {id:'10056', name:'Banette'},
  {id:'10057', name:'Absol'}, {id:'10058', name:'Garchomp'}, {id:'10059', name:'Lucario'},
  {id:'10060', name:'Abomasnow'}, {id:'10062', name:'Latias'}, {id:'10063', name:'Latios'},
  {id:'10064', name:'Swampert'}, {id:'10065', name:'Sceptile'}, {id:'10066', name:'Sableye'},
  {id:'10067', name:'Altaria'}, {id:'10068', name:'Gallade'}, {id:'10069', name:'Audino'},
  {id:'10070', name:'Sharpedo'}, {id:'10071', name:'Slowbro'}, {id:'10072', name:'Steelix'},
  {id:'10073', name:'Pidgeot'}, {id:'10074', name:'Glalie'}, {id:'10075', name:'Diancie'},
  {id:'10076', name:'Metagross'}, {id:'10077', name:'Primal Kyogre'}, {id:'10079', name:'Rayquaza'},
  {id:'10087', name:'Camerupt'}, {id:'10088', name:'Lopunny'}, {id:'10089', name:'Salamence'},
  {id:'10090', name:'Beedrill'},
];

let _megaDevMode = false;
let _megaRotation = {
  raids: ['10069','10088','10046','10073'],
  activeNow: ['10069'],
  rotation: [],
  missions: []
};

function megaArt(id) {
  return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + id + '.png';
}

function megaIdByName(name) {
  const m = MEGA_LIST.find(x => x.name.toLowerCase() === name.toLowerCase());
  return m ? m.id : null;
}

function megaBall(name, size) {
  const id = megaIdByName(name);
  const s = size || 38;
  const img = id ? megaArt(id) : '';
  return `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:1px;margin:2px">
    <div style="width:${s}px;height:${s}px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border:2px solid #ddd">
      <img src="${img}" style="width:${s-8}px;height:${s-8}px;object-fit:contain" onerror="this.style.opacity=.1">
    </div>
    <div style="font-size:8px;font-weight:700;color:#666;text-align:center;max-width:${s+12}px;line-height:1.1">${name}</div>
  </div>`;
}

function renderMegaMissions() {
  const cap = document.getElementById('mega-capture-missions');
  const pw = document.getElementById('mega-powerup-missions');
  if (cap) {
    const rows = [
      {emoji:'🔥', tipo:'Fuego', megas:['Charizard X','Blaziken']},
      {emoji:'💧', tipo:'Agua', megas:['Blastoise','Swampert']},
      {emoji:'🌿', tipo:'Planta', megas:['Venusaur','Sceptile']},
      {emoji:'⭕', tipo:'Normal', megas:['Pidgeot']},
    ];
    cap.innerHTML = rows.map(r => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f3f3f3">
      <span style="font-size:13px;font-weight:700;color:#444;min-width:62px">${r.emoji} ${r.tipo}</span>
      <div style="display:flex;flex-wrap:wrap;gap:2px">${r.megas.map(n=>megaBall(n,38)).join('')}</div>
    </div>`).join('');
  }
  if (pw) {
    const rows = [
      {label:'Da poder 5 veces', sub:'10 Megaenergía (al azar)', megas:['Venusaur','Charizard X','Blastoise','Beedrill','Pidgeot','Aggron','Manectric']},
      {label:'Da poder 10 veces', sub:'20 Megaenergía', megas:['Alakazam','Slowbro']},
      {label:'Da poder 20 veces', sub:'20 Megaenergía · muy cotizada', megas:['Diancie']},
    ];
    pw.innerHTML = rows.map(r => `<div style="padding:8px 0;border-bottom:1px solid #f3f3f3">
      <div style="font-size:12px;font-weight:700;color:#444">⚡ ${r.label} <span style="font-size:10px;color:#999;font-weight:400">— ${r.sub}</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:4px">${r.megas.map(n=>megaBall(n,36)).join('')}</div>
    </div>`).join('');
  }
}

function renderMegaGrids() {
  const raidsGrid = document.getElementById('mega-raids-grid');
  if (!raidsGrid) return;
  const raids = _megaRotation.raids || [];
  const activeNow = _megaRotation.activeNow || [];

  if (_megaDevMode) {
    let html = '<div style="width:10"><p style="font-size:11px;font-weight:800;color:#5e35b1;margin-bottom:6px">1) Megas del mes (clic para añadir/quitar)</p>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:12px">';
    html += MEGA_LIST.map(m => {
      const on = raids.includes(m.id);
      return `<div onclick="toggleMegaInMonth('${m.id}')" style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer">
        <div style="width:44px;height:44px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border:2px solid ${on?'#5e35b1':'#ddd'};${on?'':'opacity:.35;filter:grayscale(.7)'}">
          <img src="${megaArt(m.id)}" style="width:36px;height:36px;object-fit:contain" onerror="this.style.opacity=.1">
        </div>
        <div style="font-size:8px;font-weight:700;text-align:center;color:${on?'#333':'#aaa'};max-width:50px;line-height:1.1">${m.name}</div>
      </div>`;
    }).join('');
    html += '</div>';
    if (raids.length) {
      html += '<p style="font-size:11px;font-weight:800;color:#CC0000;margin-bottom:6px">2) ¿Cuál está activa ahora? (clic para marcar)</p>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">';
      html += raids.map(id => {
        const m = MEGA_LIST.find(x => x.id === id); if (!m) return '';
        const act = activeNow.includes(id);
        return `<div onclick="toggleMegaActiveNow('${id}')" style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer">
          <div style="width:50px;height:50px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border:2px solid ${act?'#CC0000':'#bbb'};${act?'':'opacity:.4;filter:grayscale(.7)'}">
            <img src="${megaArt(m.id)}" style="width:42px;height:42px;object-fit:contain" onerror="this.style.opacity=.1">
          </div>
          <div style="font-size:8px;font-weight:700;text-align:center;color:${act?'#CC0000':'#999'};max-width:54px;line-height:1.1">${m.name}</div>
        </div>`;
      }).join('');
      html += '</div>';
    }
    html += '</div>';
    raidsGrid.innerHTML = html;
  } else {
    const monthMegas = raids.map(id => MEGA_LIST.find(m => m.id === id)).filter(Boolean);
    if (!monthMegas.length) { raidsGrid.innerHTML = '<p style="font-size:11px;color:#aaa;text-align:center;width:100%">Sin Megas marcadas este mes</p>'; return; }
    raidsGrid.innerHTML = monthMegas.map((m,i) => {
      const act = activeNow.includes(m.id);
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;position:relative">
        <div style="position:absolute;top:-4px;left:-4px;background:#5e35b1;color:#fff;font-size:9px;font-weight:800;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:2">${i+1}</div>
        <div style="width:54px;height:54px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border:2px solid ${act?'#CC0000':'#ddd'};${act?'':'opacity:.4;filter:grayscale(.7)'}">
          <img src="${megaArt(m.id)}" style="width:46px;height:46px;object-fit:contain" onerror="this.style.opacity=.1">
        </div>
        <div style="font-size:9px;font-weight:700;text-align:center;color:${act?'#333':'#999'};max-width:60px;line-height:1.2">${m.name}</div>
        ${act?'<div style="font-size:9px;background:#CC0000;color:#fff;border-radius:6px;padding:1px 4px;margin-top:2px;text-align:center">ACTIVA</div>':''}
      </div>`;
    }).join('');
  }
  renderMegaMissions();
}

export function toggleMegaInMonth(megaId) {
  if (!_megaDevMode) return;
  if (!_megaRotation.raids) _megaRotation.raids = [];
  const idx = _megaRotation.raids.indexOf(megaId);
  if (idx >= 0) {
    _megaRotation.raids.splice(idx, 1);
    if (_megaRotation.activeNow) {
      const ai = _megaRotation.activeNow.indexOf(megaId);
      if (ai >= 0) _megaRotation.activeNow.splice(ai, 1);
    }
  } else {
    _megaRotation.raids.push(megaId);
  }
  fbSaveMegaConfig(_megaRotation);
  renderMegaGrids();
}

export function toggleMegaActiveNow(megaId) {
  if (!_megaDevMode) return;
  if (!_megaRotation.activeNow) _megaRotation.activeNow = [];
  const idx = _megaRotation.activeNow.indexOf(megaId);
  if (idx >= 0) _megaRotation.activeNow.splice(idx, 1);
  else _megaRotation.activeNow.push(megaId);
  fbSaveMegaConfig(_megaRotation);
  renderMegaGrids();
}

export function toggleMegaDevMode(on) {
  _megaDevMode = on;
  renderMegaGrids();
}

export async function showMegaCandy() {
  show('megaguide-screen');
  const devBar = document.getElementById('mega-dev-bar');
  if (devBar) devBar.style.display = (window.ST?.cur === 'Alejandro') ? 'block' : 'none';
  const cfg = await fbLoadMegaConfig();
  if (cfg) _megaRotation = {raids: cfg.raids||[], activeNow: cfg.activeNow||[], rotation: cfg.rotation||[], missions: cfg.missions||[]};
  renderMegaGrids();
}

window.toggleMegaInMonth = toggleMegaInMonth;
window.toggleMegaActiveNow = toggleMegaActiveNow;
window.toggleMegaDevMode = toggleMegaDevMode;
window.showMegaCandy = showMegaCandy;