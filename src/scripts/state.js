// State management - single source of truth
export const ST = {
  profiles: [],
  cur: null,        // current profile name
  view: null,       // viewing another profile (read-only)
  type: null,       // current type (fire, water, etc.)
  expanded: null,   // expanded card id
  tab: 'album',     // 'album' or 'ranking'
  rankTab: 'raid',  // 'raid' or 'dmax'
  albumTab: 'raid', // 'raid' or 'dmax'
  _pendingSave: null,
  _rankCache: {},
  _megaFilter: {}
};

export function gp(n) { return ST.profiles.find(p => p.name === n); }

export function goc(n) { 
  let p = gp(n); 
  if (!p) { p = { name: n, pk: {} }; ST.profiles.push(p); } 
  return p; 
}

export function defaultAlbum() { return {}; }

export function getAlbum(n) {
  const p = gp(n);
  if (!p) return defaultAlbum();
  if (p.album === undefined || p.album === null) return defaultAlbum();
  return p.album;
}

export function getCurrentDpsForName(name, type) {
  const rows = window.RANKINGS?.[type];
  if (!rows) return null;
  const cleanName = name.replace(' (Shadow)', '').trim();
  const row = rows.find(r => r.n === cleanName);
  return row ? row.dps : null;
}

export function albumPks(n, type) {
  const a = getAlbum(n);
  const p = gp(n);
  const customIds = new Set(p?.custom ? Object.keys(p.custom) : []);
  
  // PD entries in album (not overridden by custom)
  const pdPks = (window.PD || []).filter(pk => 
    pk.type === type && a[pk.id] && !customIds.has(pk.id) && !pk.id.includes('-dmax-')
  );
  
  // Custom entries in album
  const customPks = [];
  if (p?.custom) {
    Object.entries(p.custom).forEach(([id, d]) => {
      if (d.type === type && a[id] === true && !id.includes('-dmax-') && !d.isDmax) {
        const pdRef = d.pdRef ? (window.PD || []).find(x => x.id === d.pdRef) : null;
        const liveDps = getCurrentDpsForName(d.n, type);
        customPks.push({
          id, name: d.n, type: d.type, img: d.img || (pdRef ? pdRef.img : ''),
          dps: (liveDps !== null ? liveDps : d.dps), fast: d.fast, charge: d.charge,
          tags: pdRef ? pdRef.tags : (d.tags || inferTags(d.n, d.fast?.endsWith('*'), d.charge?.endsWith('*'), [])),
          evo: pdRef ? pdRef.evo : null, isCustom: true
        });
      }
    });
  }
  
  return [...pdPks, ...customPks].sort((a, b) => b.dps - a.dps);
}

export function countType(n, type) {
  const p = gp(n);
  const pks = albumPks(n, type);
  const owned = pks.filter(pk => p?.pk?.[pk.id]?.owned).length;
  return { o: owned, t: 6 };
}