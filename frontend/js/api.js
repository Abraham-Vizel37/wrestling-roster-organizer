/** API Client — thin fetch wrapper for FastAPI backend. */

const API = {
  async request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Accept': 'application/json' },
    };
    if (body !== null) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    if (res.status === 204) return null;
    // Check if response is JSON (for downloads, it won't be)
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      return data;
    }
    // Non-JSON response (file download)
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  },

  // ── Games ──
  getGames: () => API.request('GET', '/api/games'),
  getGame: (id) => API.request('GET', `/api/games/${id}`),
  createGame: (data) => API.request('POST', '/api/games', data),
  updateGame: (id, data) => API.request('PATCH', `/api/games/${id}`, data),
  deleteGame: (id) => API.request('DELETE', `/api/games/${id}`),

  // ── Brands ──
  getBrands: (gameId) => API.request('GET', `/api/brands${gameId ? `?game_id=${gameId}` : ''}`),
  createBrand: (data) => API.request('POST', '/api/brands', data),
  updateBrand: (id, data) => API.request('PATCH', `/api/brands/${id}`, data),
  deleteBrand: (id) => API.request('DELETE', `/api/brands/${id}`),

  // ── Wrestlers ──
  getWrestlers: (params) => {
    const q = new URLSearchParams(params);
    return API.request('GET', `/api/wrestlers?${q}`);
  },
  createWrestler: (data) => API.request('POST', '/api/wrestlers', data),
  updateWrestler: (id, data) => API.request('PATCH', `/api/wrestlers/${id}`, data),
  deleteWrestler: (id) => API.request('DELETE', `/api/wrestlers/${id}`),

  // ── Tag Teams ──
  getTagTeams: (gameId) => API.request('GET', `/api/tag-teams${gameId ? `?game_id=${gameId}` : ''}`),
  createTagTeam: (data) => API.request('POST', '/api/tag-teams', data),
  updateTagTeam: (id, data) => API.request('PATCH', `/api/tag-teams/${id}`, data),
  deleteTagTeam: (id) => API.request('DELETE', `/api/tag-teams/${id}`),

  // ── Stables ──
  getStables: (gameId) => API.request('GET', `/api/stables${gameId ? `?game_id=${gameId}` : ''}`),
  createStable: (data) => API.request('POST', '/api/stables', data),
  updateStable: (id, data) => API.request('PATCH', `/api/stables/${id}`, data),
  deleteStable: (id) => API.request('DELETE', `/api/stables/${id}`),

  // ── Championships ──
  getChampionships: (gameId) => API.request('GET', `/api/championships${gameId ? `?game_id=${gameId}` : ''}`),
  createChampionship: (data) => API.request('POST', '/api/championships', data),
  updateChampionship: (id, data) => API.request('PATCH', `/api/championships/${id}`, data),
  deleteChampionship: (id) => API.request('DELETE', `/api/championships/${id}`),

  // ── Dashboard & Export / Import / Samples ──
  getDashboard: () => API.request('GET', '/api/dashboard'),
  getDbInfo: () => API.request('GET', '/api/db/info'),

  // Export: full game or by category
  exportGame: (gameId, category = null) => {
    const path = category
      ? `/api/export/${gameId}?category=${category}`
      : `/api/export/${gameId}`;
    return API.request('GET', path);
  },

  // Import: full game JSON
  importGame: (data) => API.request('POST', '/api/import', data),

  // Import: category-specific items into an existing game
  importCategory: (gameId, category, items) =>
    API.request('POST', `/api/import/${gameId}/${category}`, items),

  // Samples: list available categories
  getSamples: () => API.request('GET', '/api/samples'),

  // Sample: get sample data for a category (returns JSON object, not Response)
  getSample: (category) => API.request('GET', `/api/samples/${category}`),

  // Download sample file as blob
  async downloadSample(category) {
    const res = await fetch(`/api/samples/${category}/download`);
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    return res.blob();
  },

  // Download export as blob
  async downloadExport(gameId, category = null) {
    const path = category
      ? `/api/export/${gameId}?category=${category}`
      : `/api/export/${gameId}`;
    const res = await fetch(path, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.detail || `HTTP ${res.status}`);
    }
    return res.blob();
  },
};
