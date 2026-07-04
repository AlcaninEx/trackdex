// Type Chart screen
import { show } from './helpers.js';

let TC_SELECTED = [];

export function renderTypeGrid() {
  const grid = document.getElementById('tc-type-grid');
  if (!grid) return;
  const NORMAL_TC = { key: 'normal', name: 'Normal', color: '#A8A878', icon: '⬜' };
  const ALL_TC = [NORMAL_TC, ...(window.TYPES || [])];
  grid.innerHTML = ALL_TC.map(t => {
    const isSel = TC_SELECTED.includes(t.key);
    const onclick = "tcToggleType('" + t.key + "')";
    return '<button class="tc-type-btn' + (isSel ? ' selected' : '') + '" onclick="' + onclick + '" style="background:' + (isSel ? t.color + '22' : '#fff') + '">'
      + '<span class="type-icon">' + t.icon + '</span>'
      + '<span style="color:' + (isSel ? t.color : '#333') + '">' + t.name + '</span></button>';
  }).join('');
}

export function tcToggleType(key) {
  const idx = TC_SELECTED.indexOf(key);
  if (idx >= 0) TC_SELECTED.splice(idx, 1);
  else { if (TC_SELECTED.length >= 2) TC_SELECTED.shift(); TC_SELECTED.push(key); }
  renderTypeGrid();
  renderTypeChart();
}

export function placeBalls(types) {
  const order = [1, 4, 7, 10, 2, 5, 8, 11, 0, 3, 6, 9];
  const cells = Array(12).fill(null);
  types.slice(0, 12).forEach((t, i) => { cells[order[i]] = t; });
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
    return '<div class="tc-ball" style="background:' + (tm ? tm.color + '33' : '#eee') + '">' + (tm ? '<span class="type-icon">' + tm.icon + '</span>' : '') + '</div>';
  }).join('');
}

export function renderTypeChart() {
  const ALL = ['normal', ...(window.TYPES || []).map(t => t.key)];
  if (!TC_SELECTED.length) {
    ['tc-atk-resisted', 'tc-atk-neutral', 'tc-atk-super', 'tc-def-immune', 'tc-def-resisted', 'tc-def-super', 'tc-def-double']
      .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });
    return;
  }
  const atkResisted = [], atkNeutral = [], atkSuper = [];
  ALL.forEach(defType => {
    const eff = TC_SELECTED.reduce((acc, atk) => acc * getEff(atk, defType), 1);
    if (eff >= 1.55) atkSuper.push(defType);
    else if (eff <= 0.64) atkResisted.push(defType);
    else atkNeutral.push(defType);
  });
  renderBalls('tc-atk-resisted', atkResisted);
  renderBalls('tc-atk-super', atkSuper);
  
  const defImmune = [], defResisted = [], defSuper = [], defDouble = [];
  ALL.forEach(atkType => {
    let m = 1;
    TC_SELECTED.forEach(defT => { m *= getEff(atkType, defT); });
    if (m <= 0.4) defImmune.push(atkType);
    else if (m <= 0.64) defResisted.push(atkType);
    else if (m >= 2.4) defDouble.push(atkType);
    else if (m >= 1.55) defSuper.push(atkType);
  });
  renderBalls('tc-def-immune', defImmune);
  renderBalls('tc-def-resisted', defResisted);
  renderBalls('tc-def-super', defSuper);
  renderBalls('tc-def-double', defDouble);
}

export function showTypeChart() {
  TC_SELECTED.length = 0;
  show('typechart-screen');
  renderTypeGrid();
  renderTypeChart();
}

window.renderTypeGrid = renderTypeGrid;
window.tcToggleType = tcToggleType;
window.renderTypeChart = renderTypeChart;
window.showTypeChart = showTypeChart;