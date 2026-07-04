// Helpers & utilities
export const SP = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';
export const si = n => SP + n + '.png';

export { ST } from './state.js';

export const TYPE_EFF = {
  normal:   {rock:0.625,ghost:0.390625,steel:0.625},
  fire:     {fire:0.625,water:0.625,grass:1.6,ice:1.6,bug:1.6,rock:0.625,dragon:0.625,steel:1.6},
  water:    {fire:1.6,water:0.625,grass:0.625,ground:1.6,rock:1.6,dragon:0.625},
  electric: {water:1.6,electric:0.625,grass:0.625,ground:0.390625,flying:1.6,dragon:0.625},
  grass:    {fire:0.625,water:1.6,grass:0.625,poison:0.625,ground:1.6,flying:0.625,bug:0.625,rock:1.6,dragon:0.625,steel:0.625},
  ice:      {fire:0.625,water:0.625,grass:1.6,ice:0.625,ground:1.6,flying:1.6,dragon:1.6,steel:0.625},
  fighting: {normal:1.6,ice:1.6,poison:0.625,flying:0.625,psychic:0.625,bug:0.625,rock:1.6,ghost:0.390625,dark:1.6,steel:1.6,fairy:0.625},
  poison:   {grass:1.6,poison:0.625,ground:0.625,rock:0.625,ghost:0.625,steel:0.390625,fairy:1.6},
  ground:   {fire:1.6,electric:1.6,grass:0.625,poison:1.6,flying:0.390625,bug:0.625,rock:1.6,steel:1.6},
  flying:   {electric:0.625,grass:1.6,fighting:1.6,bug:1.6,rock:0.625,steel:0.625},
  psychic:  {fighting:1.6,poison:1.6,psychic:0.625,dark:0.390625,steel:0.625},
  bug:      {fire:0.625,grass:1.6,fighting:0.625,poison:0.625,flying:0.625,psychic:1.6,ghost:0.625,dark:1.6,steel:0.625,fairy:0.625},
  rock:     {fire:1.6,ice:1.6,fighting:0.625,ground:0.625,flying:1.6,bug:1.6,steel:0.625},
  ghost:    {normal:0.390625,psychic:1.6,ghost:1.6,dark:0.625},
  dragon:   {dragon:1.6,steel:0.625,fairy:0.390625},
  dark:     {fighting:0.625,psychic:1.6,ghost:1.6,dark:0.625,fairy:0.625},
  steel:    {fire:0.625,water:0.625,electric:0.625,ice:1.6,rock:1.6,steel:0.625,fairy:1.6},
  fairy:    {fire:0.625,fighting:1.6,poison:0.625,dragon:1.6,dark:1.6,steel:0.625}
};

export function getEff(atk, def) { return (TYPE_EFF[atk] && TYPE_EFF[atk][def]) || 1; }

export function inferTags(name, fastL, chargeL, pdTags) {
  const tags = new Set(pdTags || []);
  const nl = (name || '').toLowerCase();
  if (nl.includes('(shadow)') || nl.startsWith('shadow ')) tags.add('shadow');
  if (nl.startsWith('mega ') || nl.startsWith('primal ')) tags.add('mega');
  if (fastL || chargeL) tags.add('legacy');
  const base = nl.replace(/\(shadow\)/g, '').replace(/^shadow /, '')
    .replace(/^mega /, '').replace(/^primal /, '')
    .replace(/^galarian /, '').replace(/^alolan /, '')
    .replace(/^hisuian /, '').replace(/^paldean /, '')
    .replace(/ standard$/, '').replace(/ zen$/, '')
    .replace(/ sky$/, '').replace(/ ordinary$/, '')
    .replace(/ resolute$/, '').replace(/ therian$/, '')
    .replace(/ incarnate$/, '').replace(/ crowned.*$/, '')
    .replace(/ hero.*$/, '').replace(/ white$/, '')
    .replace(/ black$/, '').replace(/ origin$/, '')
    .replace(/ rapid.*$/, '').replace(/ single.*$/, '')
    .replace(/ amped$/, '').replace(/ low key$/, '')
    .replace(/ curly$/, '').replace(/ droopy$/, '')
    .replace(/ stretchy$/, '').replace(/ masterpiece$/, '')
    .replace(/ antique$/, '').replace(/ phony$/, '')
    .replace(/ [xyz]$/, '').replace(/ \(.*\)$/, '').trim();
  if (window.DMAX_NAMES?.has(base)) tags.add('dynamax');
  else { for (const w of base.split(' ')) { if (window.DMAX_NAMES?.has(w)) { tags.add('dynamax'); break; } } }
  if (tags.has('shadow')) tags.delete('dynamax');
  return [...tags];
}

export function renderBadges(tags) {
  return (tags || []).map(tg => {
    if (tg === 'shadow') return '<span class="badge" style="background:#6a1b9a;color:#fff">Shadow</span>';
    if (tg === 'mega')   return '<span class="badge" style="background:#CC0000;color:#fff">Mega</span>';
    if (tg === 'legacy') return '<span class="badge" style="background:#e65100;color:#fff">Legacy ⭐</span>';
    if (tg === 'dynamax')return '<span class="badge" style="background:#ad1565c0;color:#fff">DMAX</span>';
    if (tg === 'mission')return '<span class="badge" style="background:#2e7d32;color:#fff">Misión</span>';
    return '';
  }).join('');
}

export function showToast(msg, type = 'warn') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show toast-' + type;
  if (window._toastTimer) clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { el.className = ''; }, 3200);
}

export function toggleDark() {
  const d = document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', d ? '1' : '0');
  document.querySelectorAll('#dark-btn,#dark-btn2,#dark-btn-home').forEach(b => { if (b) b.textContent = d ? '☀️' : '🌙'; });
}

export function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  document.getElementById(id).style.display = 'block';
}

export function evoH(evo, img, shadow) {
  const sb = shadow ? '<img src="shadow_icon.png" class="shadow-badge" alt="">' : '';
  if (!evo || evo.length <= 1) return `<div class="final-wrap">${sb}<img class="final-img" src="${si(img)}" onerror="this.style.opacity=.1"></div>`;
  return `<div class="evo-chain"><img class="evo-sm" src="${si(evo[0])}" onerror="this.style.opacity=.1"><span class="evo-arr">▶</span><div class="final-wrap">${sb}<img class="final-img" src="${si(img)}" style="width:40px;height:40px" onerror="this.style.opacity=.1"></div></div>`;
}

export function placeBalls(types) {
  const order = [1,4,7,10,2,5,8,11,0,3,6,9];
  const cells = Array(12).fill(null);
  types.slice(0,12).forEach((t,i) => { cells[order[i]] = t; });
  return cells;
}

export function renderBalls(id, types) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!types.length) { el.innerHTML = ''; return; }
  const cells = placeBalls(types);
  el.innerHTML = cells.map(t => {
    if (!t) return '<div></div>';
    const tm = window.TM?.[t];
    return `<div class="tc-ball" style="background:${tm ? tm.color + '33' : '#eee'}">${tm ? '<span class="type-icon">' + tm.icon + '</span>' : ''}</div>`;
  }).join('');
}