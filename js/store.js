/**
 * Wrestling Roster Organizer — Browser-Local Store
 * Replaces api.js entirely. All data lives in localStorage.
 * Seed data loaded from seed-data.json on first visit.
 */
const Store = (() => {

  const KEY = 'wrestling_roster_data';
  const ID_KEY = 'wrestling_roster_ids';
  const VER_KEY = 'wrestling_roster_version';
  const VER = 1;

  // ── In-memory state ──
  let data = {};
  let ids = {};

  let readyPromise = null;

  // ── Init ──
  function init() {
    const stored = localStorage.getItem(KEY);
    if (stored && localStorage.getItem(VER_KEY) == VER) {
      data = JSON.parse(stored);
      ids = JSON.parse(localStorage.getItem(ID_KEY) || '{}');
      return Promise.resolve(false);
    }
    // First visit — load seed data
    readyPromise = fetch('js/seed-data.json').then(r => {
      if (!r.ok) throw new Error('Seed data not found');
      return r.json();
    }).then(json => {
      data = json;
    }).catch(() => {
      data = { games:[], brands:[], wrestlers:[], tag_teams:[], stables:[], stable_members:[], championships:[], championship_reigns:[] };
    }).then(() => {
      // Reindex: find max id per table
      ids = {};
      for (const [table, rows] of Object.entries(data)) {
        let max = 0;
        for (const r of rows) {
          if (r.id !== undefined && r.id > max) max = r.id;
        }
        ids[table] = max + 1;
      }
      ids.stable_members = 1;
      ids.championship_reigns = ids.championship_reigns || 1;
      persist();
      return true;
    });
    return readyPromise;
  }

  function ready() { return readyPromise || init(); }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      localStorage.setItem(ID_KEY, JSON.stringify(ids));
      localStorage.setItem(VER_KEY, String(VER));
    } catch (e) {
      console.error('Store: persist failed', e);
    }
  }

  // ── Helpers ──
  function nextId(table) {
    // stable_members uses composite key, no auto-inc
    if (table === 'stable_members') return null;
    const id = ids[table] || 1;
    ids[table] = id + 1;
    return id;
  }

  function findRows(table, filter) {
    const rows = data[table] || [];
    if (!filter) return rows;
    return rows.filter(r => {
      for (const [k, v] of Object.entries(filter)) {
        if (r[k] === undefined || r[k] == null) {
          if (v !== undefined && v !== null) return false;
        } else if (Array.isArray(v)) {
          if (!v.includes(r[k])) return false;
        } else if (r[k] != v) { // loose compare for string/number
          return false;
        }
      }
      return true;
    });
  }

  function findRow(table, id) {
    const rows = data[table] || [];
    return rows.find(r => r.id == id);
  }

  function getAutoId(table) { return ids[table] || 1; }

  // ── Public API ──

  /** Clear all data and re-init with seed */
  function resetToSeed() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(ID_KEY);
    localStorage.removeItem(VER_KEY);
    data = {};
    ids = {};
    return init();
  }

  async function getGames() {
    const games = data.games || [];
    return games.map(g => ({
      ...g,
      brand_count: (data.brands || []).filter(b => b.game_id == g.id).length,
      wrestler_count: (data.wrestlers || []).filter(w => w.game_id == g.id).length,
    }));
  }

  async function getBrands(gameId) {
    let rows = data.brands || [];
    if (gameId) rows = rows.filter(b => b.game_id == gameId);
    return rows.map(b => ({
      ...b,
      wrestler_count: (data.wrestlers || []).filter(w => w.brand_id == b.id).length,
      championship_count: (data.championships || []).filter(c => c.brand_id == b.id).length,
    }));
  }

  async function getWrestlers(params = {}) {
    let rows = data.wrestlers || [];
    if (params.game_id) rows = rows.filter(w => w.game_id == params.game_id);
    if (params.brand_id) rows = rows.filter(w => w.brand_id == params.brand_id);
    if (params.gender) rows = rows.filter(w => w.gender == params.gender);
    if (params.alignment) rows = rows.filter(w => w.alignment == params.alignment);
    if (params.status) rows = rows.filter(w => w.status == params.status);
    if (params.search) {
      const q = params.search.toLowerCase();
      rows = rows.filter(w => w.name.toLowerCase().includes(q));
    }
    // Sort
    const sortBy = params.sort_by || 'name';
    const sortDir = params.sort_dir || 'asc';
    rows.sort((a, b) => {
      const va = (a[sortBy] || '').toString().toLowerCase();
      const vb = (b[sortBy] || '').toString().toLowerCase();
      if (sortDir === 'desc') return vb.localeCompare(va);
      return va.localeCompare(vb);
    });
    // Enrich with brand/game names
    return rows.map(w => {
      const brand = findRow('brands', w.brand_id);
      const game = findRow('games', w.game_id);
      return { ...w, brand_name: brand ? brand.name : null, game_name: game ? game.name : null };
    });
  }

  async function createWrestler(dataIn) {
    const row = { id: nextId('wrestlers'), ...dataIn };
    data.wrestlers.push(row);
    persist();
    const brand = findRow('brands', row.brand_id);
    const game = findRow('games', row.game_id);
    return { ...row, brand_name: brand ? brand.name : null, game_name: game ? game.name : null };
  }

  async function updateWrestler(id, dataIn) {
    const idx = data.wrestlers.findIndex(w => w.id == id);
    if (idx === -1) throw new Error('Wrestler not found');
    data.wrestlers[idx] = { ...data.wrestlers[idx], ...dataIn };
    persist();
    const brand = findRow('brands', data.wrestlers[idx].brand_id);
    const game = findRow('games', data.wrestlers[idx].game_id);
    return { ...data.wrestlers[idx], brand_name: brand ? brand.name : null, game_name: game ? game.name : null };
  }

  async function deleteWrestler(id) {
    data.wrestlers = data.wrestlers.filter(w => w.id != id);
    persist();
    return { success: true };
  }

  async function createBrand(dataIn) {
    const row = { id: nextId('brands'), ...dataIn };
    data.brands.push(row);
    persist();
    return row;
  }

  async function updateBrand(id, dataIn) {
    const idx = data.brands.findIndex(b => b.id == id);
    if (idx === -1) throw new Error('Brand not found');
    data.brands[idx] = { ...data.brands[idx], ...dataIn };
    persist();
    return data.brands[idx];
  }

  async function deleteBrand(id) {
    // Reassign wrestlers to no brand
    data.wrestlers.forEach(w => { if (w.brand_id == id) w.brand_id = null; });
    data.brands = data.brands.filter(b => b.id != id);
    persist();
    return { success: true };
  }

  async function getTagTeams(params = {}) {
    let rows = data.tag_teams || [];
    if (params.game_id) rows = rows.filter(t => t.game_id == params.game_id);
    if (params.brand_id) rows = rows.filter(t => t.brand_id == params.brand_id);
    return rows.map(t => {
      const m1 = findRow('wrestlers', t.member1_id);
      const m2 = findRow('wrestlers', t.member2_id);
      const brand = findRow('brands', t.brand_id);
      const game = findRow('games', t.game_id);
      return {
        ...t,
        member1_name: m1 ? m1.name : null,
        member2_name: m2 ? m2.name : null,
        brand_name: brand ? brand.name : null,
        game_name: game ? game.name : null,
      };
    });
  }

  async function createTagTeam(dataIn) {
    const row = { id: nextId('tag_teams'), ...dataIn };
    data.tag_teams.push(row);
    persist();
    const m1 = findRow('wrestlers', row.member1_id);
    const m2 = findRow('wrestlers', row.member2_id);
    const brand = findRow('brands', row.brand_id);
    const game = findRow('games', row.game_id);
    return { ...row, member1_name: m1 ? m1.name : null, member2_name: m2 ? m2.name : null, brand_name: brand ? brand.name : null, game_name: game ? game.name : null };
  }

  async function updateTagTeam(id, dataIn) {
    const idx = data.tag_teams.findIndex(t => t.id == id);
    if (idx === -1) throw new Error('Tag team not found');
    data.tag_teams[idx] = { ...data.tag_teams[idx], ...dataIn };
    persist();
    const row = data.tag_teams[idx];
    const m1 = findRow('wrestlers', row.member1_id);
    const m2 = findRow('wrestlers', row.member2_id);
    const brand = findRow('brands', row.brand_id);
    const game = findRow('games', row.game_id);
    return { ...row, member1_name: m1 ? m1.name : null, member2_name: m2 ? m2.name : null, brand_name: brand ? brand.name : null, game_name: game ? game.name : null };
  }

  async function deleteTagTeam(id) {
    data.tag_teams = data.tag_teams.filter(t => t.id != id);
    persist();
    return { success: true };
  }

  async function getStables(params = {}) {
    let rows = data.stables || [];
    if (params.game_id) rows = rows.filter(s => s.game_id == params.game_id);
    if (params.brand_id) rows = rows.filter(s => s.brand_id == params.brand_id);
    return rows.map(s => {
      const members = (data.stable_members || []).filter(sm => sm.stable_id == s.id).map(sm => {
        const w = findRow('wrestlers', sm.wrestler_id);
        return w ? w.name : `Wrestler #${sm.wrestler_id}`;
      });
      const brand = findRow('brands', s.brand_id);
      const game = findRow('games', s.game_id);
      return { ...s, member_names: members, brand_name: brand ? brand.name : null, game_name: game ? game.name : null };
    });
  }

  async function createStable(dataIn) {
    const row = { id: nextId('stables'), ...dataIn };
    delete row.members;
    data.stables.push(row);
    persist();
    const brand = findRow('brands', row.brand_id);
    const game = findRow('games', row.game_id);
    return { ...row, members: [], brand_name: brand ? brand.name : null, game_name: game ? game.name : null };
  }

  async function updateStable(id, dataIn) {
    const idx = data.stables.findIndex(s => s.id == id);
    if (idx === -1) throw new Error('Stable not found');
    const members = dataIn.members;
    delete dataIn.members;
    data.stables[idx] = { ...data.stables[idx], ...dataIn };
    // Update members if provided
    if (members) {
      data.stable_members = data.stable_members.filter(sm => sm.stable_id != id);
      for (const wId of members) {
        data.stable_members.push({ stable_id: id, wrestler_id: wId });
      }
    }
    persist();
    return data.stables[idx];
  }

  async function deleteStable(id) {
    data.stables = data.stables.filter(s => s.id != id);
    data.stable_members = data.stable_members.filter(sm => sm.stable_id != id);
    persist();
    return { success: true };
  }

  async function getChampionships(params = {}) {
    let rows = data.championships || [];
    if (params.game_id) rows = rows.filter(c => c.game_id == params.game_id);
    if (params.brand_id) rows = rows.filter(c => c.brand_id == params.brand_id);
    if (params.tier) rows = rows.filter(c => c.tier == params.tier);
    return rows.map(c => {
      const brand = findRow('brands', c.brand_id);
      const game = findRow('games', c.game_id);
      const h1 = c.holder1_id ? findRow('wrestlers', c.holder1_id) : null;
      const h2 = c.holder2_id ? findRow('wrestlers', c.holder2_id) : null;
      return {
        ...c,
        brand_name: brand ? brand.name : null,
        game_name: game ? game.name : null,
        holder1_name: h1 ? h1.name : null,
        holder2_name: h2 ? h2.name : null,
      };
    });
  }

  async function createChampionship(dataIn) {
    const row = { id: nextId('championships'), ...dataIn };
    data.championships.push(row);
    persist();
    const brand = findRow('brands', row.brand_id);
    const game = findRow('games', row.game_id);
    const h1 = row.holder1_id ? findRow('wrestlers', row.holder1_id) : null;
    const h2 = row.holder2_id ? findRow('wrestlers', row.holder2_id) : null;
    return { ...row, brand_name: brand ? brand.name : null, game_name: game ? game.name : null, holder1_name: h1 ? h1.name : null, holder2_name: h2 ? h2.name : null };
  }

  async function updateChampionship(id, dataIn) {
    const idx = data.championships.findIndex(c => c.id == id);
    if (idx === -1) throw new Error('Championship not found');
    data.championships[idx] = { ...data.championships[idx], ...dataIn };
    persist();
    return data.championships[idx];
  }

  async function deleteChampionship(id) {
    data.championships = data.championships.filter(c => c.id != id);
    data.championship_reigns = data.championship_reigns.filter(r => r.championship_id != id);
    persist();
    return { success: true };
  }

  // ── Game CRUD (missing from original store) ──

  async function createGame(dataIn) {
    const row = { id: nextId('games'), ...dataIn };
    data.games.push(row);
    persist();
    return row;
  }

  async function updateGame(id, dataIn) {
    const idx = data.games.findIndex(g => g.id == id);
    if (idx === -1) throw new Error('Game not found');
    data.games[idx] = { ...data.games[idx], ...dataIn };
    persist();
    return data.games[idx];
  }

  async function deleteGame(id) {
    // Cascade delete all related data
    data.wrestlers = data.wrestlers.filter(w => w.game_id != id);
    data.tag_teams = data.tag_teams.filter(t => t.game_id != id);
    data.stables = data.stables.filter(s => s.game_id != id);
    data.stable_members = data.stable_members.filter(sm => {
      const stable = data.stables.find(s => s.id == sm.stable_id);
      return stable; // keep if stable still exists
    });
    data.championships = data.championships.filter(c => c.game_id != id);
    data.championship_reigns = data.championship_reigns.filter(r => {
      const champ = data.championships.find(c => c.id == r.championship_id);
      return champ;
    });
    data.games = data.games.filter(g => g.id != id);
    data.brands = data.brands.filter(b => b.game_id != id);
    persist();
    return { success: true };
  }

  async function getDashboard() {
    const games = data.games || [];
    const brands = data.brands || [];
    const wrestlers = data.wrestlers || [];
    const tag = data.tag_teams || [];
    const stables = data.stables || [];
    const champs = data.championships || [];
    return {
      total_games: games.length,
      total_brands: brands.length,
      total_wrestlers: wrestlers.length,
      total_tag_teams: tag.length,
      total_stables: stables.length,
      total_championships: champs.length,
      games: games.map(g => ({
        id: g.id, name: g.name, platform: g.platform, year: g.year,
        brand_count: brands.filter(b => b.game_id == g.id).length,
        wrestler_count: wrestlers.filter(w => w.game_id == g.id).length,
      })),
    };
  }

  // ── Import / Export ──

  async function importGame(gameData) {
    let created = { games_created: 0, brands_created: 0, wrestlers_created: 0, tag_teams_created: 0, stables_created: 0, championships_created: 0, errors: [] };

    // Check if game already exists by name
    const existing = data.games.find(g => g.name == gameData.game.name);
    if (existing) {
      created.errors.push(`Game "${gameData.game.name}" already exists. Skipping.`);
      return created;
    }

    const gameId = nextId('games');
    data.games.push({ id: gameId, ...gameData.game });
    created.games_created = 1;

    // Map old brand IDs to new brand IDs
    const brandMap = {};
    for (const b of (gameData.brands || [])) {
      const newId = nextId('brands');
      brandMap[b.id] = newId;
      data.brands.push({ id: newId, game_id: gameId, name: b.name, color: b.color || null, sort_order: b.sort_order || null, gm: b.gm || null, show_status: b.show_status || null });
      created.brands_created++;
    }

    for (const w of (gameData.wrestlers || [])) {
      data.wrestlers.push({
        id: nextId('wrestlers'), game_id: gameId, brand_id: brandMap[w.brand_id] || null,
        name: w.name, gender: w.gender || 'Male', alignment: w.alignment || 'Face',
        status: w.status || 'Active', role: w.role || null, finisher: w.finisher || null,
        power: w.power ?? 50, is_caw: w.is_caw ?? false,
        wins: w.wins ?? 0, losses: w.losses ?? 0, notes: w.notes || null,
      });
      created.wrestlers_created++;
    }

    // Tag teams (after wrestlers so member IDs resolve)
    const wNameMap = {};
    (data.wrestlers || []).forEach(w => { wNameMap[w.name] = w; });

    for (const t of (gameData.tag_teams || [])) {
      const m1 = t.member1_id ? findRow('wrestlers', t.member1_id) : null;
      const m2 = t.member2_id ? findRow('wrestlers', t.member2_id) : null;
      // Resolve by name if direct ID not found post-import
      let m1New = null, m2New = null;
      if (m1) m1New = wNameMap[m1.name]?.id || null;
      if (!m1New && t.member1_name) m1New = wNameMap[t.member1_name]?.id || null;
      if (m2) m2New = wNameMap[m2.name]?.id || null;
      if (!m2New && t.member2_name) m2New = wNameMap[t.member2_name]?.id || null;

      data.tag_teams.push({
        id: nextId('tag_teams'), game_id: gameId, brand_id: brandMap[t.brand_id] || null,
        name: t.name, member1_id: m1New, member2_id: m2New,
        alignment: t.alignment || 'Face', status: t.status || 'Active',
        wins: t.wins ?? 0, losses: t.losses ?? 0, notes: t.notes || null,
      });
      created.tag_teams_created++;
    }

    for (const s of (gameData.stables || [])) {
      const newId = nextId('stables');
      data.stables.push({
        id: newId, game_id: gameId, brand_id: brandMap[s.brand_id] || null,
        name: s.name, status: s.status || 'Active', notes: s.notes || null,
      });
      created.stables_created++;
    }

    for (const c of (gameData.championships || [])) {
      const h1 = c.holder1_id ? findRow('wrestlers', c.holder1_id) : null;
      const h2 = c.holder2_id ? findRow('wrestlers', c.holder2_id) : null;
      let h1New = null, h2New = null;
      if (h1) h1New = wNameMap[h1.name]?.id || null;
      if (!h1New && c.holder1_name) h1New = wNameMap[c.holder1_name]?.id || null;
      if (h2) h2New = wNameMap[h2.name]?.id || null;
      if (!h2New && c.holder2_name) h2New = wNameMap[c.holder2_name]?.id || null;

      data.championships.push({
        id: nextId('championships'), game_id: gameId, brand_id: brandMap[c.brand_id] || null,
        name: c.name, tier: c.tier || 'World', holder1_id: h1New, holder2_id: h2New,
        is_vacant: c.is_vacant ?? false, notes: c.notes || null,
      });
      created.championships_created++;
    }

    persist();
    return created;
  }

  async function importCategory(gameId, category, items) {
    let imported = 0;
    const errors = [];
    const table = category.replace(/-/g, '_');

    if (!Array.isArray(items)) items = [items];

    for (const item of items) {
      try {
        // Check for duplicate by name for wrestlers, tag_teams, stables, championships
        if (['wrestlers', 'tag_teams', 'stables', 'championships'].includes(table) && item.name) {
          const dup = (data[table] || []).find(r => r.name == item.name && r.game_id == gameId);
          if (dup) {
            errors.push(`"${item.name}" already exists, skipped`);
            continue;
          }
        }
        const row = { id: nextId(table), game_id: gameId, ...item };
        data[table].push(row);
        imported++;
      } catch (e) {
        errors.push(e.message);
      }
    }
    persist();
    return { imported, errors, category, total_items: items.length };
  }

  async function downloadExport(gameId, category = null) {
    const game = findRow('games', gameId);
    if (!game) throw new Error('Game not found');

    const brands = (data.brands || []).filter(b => b.game_id == gameId);
    const wrestlers = (data.wrestlers || []).filter(w => w.game_id == gameId);
    const tag_teams = (data.tag_teams || []).filter(t => t.game_id == gameId);
    const stables = (data.stables || []).filter(s => s.game_id == gameId);
    const championships = (data.championships || []).filter(c => c.game_id == gameId);

    const result = { game };
    if (!category || category === 'brands') result.brands = brands;
    if (!category || category === 'wrestlers') result.wrestlers = wrestlers;
    if (!category || category === 'tag-teams') result.tag_teams = tag_teams;
    if (!category || category === 'stables') result.stables = stables;
    if (!category || category === 'championships') result.championships = championships;

    const json = JSON.stringify(result, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  async function getSample(category) {
    if (category === 'full-game') {
      const game = data.games[0] || { name: 'My Game', platform: 'Multi', year: 2025 };
      return {
        game: { name: game.name + ' (Sample)', platform: 'Multi', year: 2025 },
        brands: (data.brands || []).filter(b => b.game_id == game.id).slice(0, 3).map(b => ({ name: b.name, gm: b.gm || '' })),
        wrestlers: (data.wrestlers || []).filter(w => w.game_id == game.id).slice(0, 2).map(w => ({ name: w.name, gender: w.gender, alignment: w.alignment, status: w.status, power: w.power })),
        tag_teams: (data.tag_teams || []).filter(t => t.game_id == game.id).slice(0, 1).map(t => ({ name: t.name })),
        stables: (data.stables || []).filter(s => s.game_id == game.id).slice(0, 1).map(s => ({ name: s.name })),
        championships: (data.championships || []).filter(c => c.game_id == game.id).slice(0, 2).map(c => ({ name: c.name, tier: c.tier })),
      };
    }
    const samples = {
      brands: [{ name: 'RAW', gm: '' }, { name: 'SmackDown', gm: '' }, { name: 'NXT', gm: '' }],
      wrestlers: [{ name: 'John Cena', gender: 'Male', alignment: 'Face', status: 'Active', power: 95 }, { name: 'Rhea Ripley', gender: 'Female', alignment: 'Heel', status: 'Active', power: 90 }],
      'tag-teams': [{ name: 'The Usos', member1_id: null, member2_id: null, alignment: 'Face' }, { name: 'DIY', member1_id: null, member2_id: null, alignment: 'Face' }],
      stables: [{ name: 'The Bloodline', status: 'Active' }, { name: 'Judgment Day', status: 'Active' }],
      championships: [{ name: 'WWE Championship', tier: 'World' }, { name: 'Intercontinental Championship', tier: 'Midcard' }, { name: 'WWE Women\'s Tag Team', tier: 'Tag' }],
    };
    return samples[category] || [];
  }

  async function getDbInfo() {
    const totalRecords = (data.games?.length || 0) + (data.brands?.length || 0) + (data.wrestlers?.length || 0) +
      (data.tag_teams?.length || 0) + (data.stables?.length || 0) + (data.championships?.length || 0) +
      (data.stable_members?.length || 0) + (data.championship_reigns?.length || 0);
    return {
      engine: 'localStorage (browser)',
      tables: 8,
      row_counts: {
        games: data.games?.length || 0,
        brands: data.brands?.length || 0,
        wrestlers: data.wrestlers?.length || 0,
        tag_teams: data.tag_teams?.length || 0,
        stables: data.stables?.length || 0,
        stable_members: data.stable_members?.length || 0,
        championships: data.championships?.length || 0,
        championship_reigns: data.championship_reigns?.length || 0,
      },
      total_records: totalRecords,
      pragmas: { journal_mode: 'n/a (browser)', page_size: 'n/a', page_count: 'n/a' },
    };
  }

  // ── Init on load ──
  const hasExistingData = init();

  return {
    ready,
    // CRUD
    getGames, getBrands, getWrestlers, createWrestler, updateWrestler, deleteWrestler,
    createBrand, updateBrand, deleteBrand,
    getTagTeams, createTagTeam, updateTagTeam, deleteTagTeam,
    getStables, createStable, updateStable, deleteStable,
    getChampionships, createChampionship, updateChampionship, deleteChampionship,
    createGame, updateGame, deleteGame,
    // Dashboard
    getDashboard,
    // Import/Export
    importGame, importCategory, downloadExport, getSample,
    // Monitoring
    getDbInfo,
    // Control
    resetToSeed,
    hasExistingData,
  };
})();
