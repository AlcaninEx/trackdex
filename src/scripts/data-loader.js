// Data Loader - Carga todos los JSONs de datos de forma asíncrona
export async function loadAllData() {
  const base = 'src/data/';
  const files = [
    'types.json',
    'rankings.json',
    'dmax.json',
    'pd.json',
    'base_stats.json',
    'pokedex.json',
    'name_to_id.json',
    'mega_list.json',
    'pp_data.json',
    'legacy_sprites.json',
    'filtro_suffixes.json',
    'type_eff.json',
    'dmax_names.json'
  ];

  const data = {};
  
  await Promise.all(files.map(async (file) => {
    const key = file.replace('.json', '');
    try {
      const res = await fetch(base + file);
      if (!res.ok) throw new Error(`${file}: ${res.status}`);
      data[key] = await res.json();
    } catch (e) {
      console.error(`Error loading ${file}:`, e);
      data[key] = null;
    }
  }));

  // Make available globally for backward compatibility
  window.TYPES = data.types;
  window.RANKINGS = data.rankings;
  window.DMAX = data.dmax;
  window.PD = data.pd;
  window.BASE_STATS = data.base_stats;
  window.POKEDEX = data.pokedex;
  window.NAME_TO_ID = data.name_to_id;
  window.MEGA_LIST = data.mega_list;
  window.PP_DATA = data.pp_data;
  window.LEGACY_SPRITES = data.legacy_sprites;
  window.FILTRO_SUFFIXES = data.filtro_suffixes;
  window.TYPE_EFF = data.type_eff;
  window.DMAX_NAMES = new Set(data.dmax_names);

  // Build TM lookup
  window.TM = {};
  if (data.types) {
    data.types.forEach(t => window.TM[t.key] = t);
  }

  // SP and si helpers
  window.SP = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';
  window.si = n => window.SP + n + '.png';

  console.log('✅ All data loaded:', Object.keys(data).filter(k => data[k]).join(', '));
  return data;
}