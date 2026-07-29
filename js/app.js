/**
 * Wrestling Roster Organizer — Main Application Controller
 * Hash-based SPA routing, CRUD views, form management.
 */
const app = {
  // ── State ──
  state: {
    games: [],
    brands: [],
    wrestlers: [],
    tagTeams: [],
    stables: [],
    champs: [],
    currentView: 'dashboard',
    rosterSortBy: 'name',
    rosterSortDir: 'asc',
    activeGameId: null,
  },

  // ── Init ──
  async init() {
    this.setupRouting();
    this.setupSidebar();
    await this.loadAll();
  },

  async loadAll(skipNavigate = false) {
    this.showLoading(true);
    try {
      const dash = await Store.getDashboard();
      this.state.games = dash.games || [];

      if (dash.games && dash.games.length > 0) {
        this.state.activeGameId = dash.games[0].id;
      }

      // Pre-populate filter dropdowns
      this.populateGameSelects();
      this.renderDashboard(dash);
      this.renderGames();
      this.loadBrands();
      this.loadRoster();
      this.loadTagTeams();
      this.loadStables();
      this.loadChampionships();

      // Navigate to hash-based view (skip when called from loadImportView
      // to avoid infinite recursion)
      if (!skipNavigate) {
        this.navigate(window.location.hash || '#dashboard');
      }
    } catch (err) {
      this.showError(err.message);
    }
    this.showLoading(false);
  },

  // ── Routing ──
  setupRouting() {
    window.addEventListener('hashchange', () => this.navigate(window.location.hash));
  },

  navigate(hash) {
    const view = hash.replace('#', '') || 'dashboard';
    this.state.currentView = view;

    // Toggle active views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.add('active');

    // Toggle active nav
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const navLink = document.querySelector(`.nav-link[data-view="${view}"]`);
    if (navLink) navLink.classList.add('active');

    // Close sidebar on mobile
    document.body.classList.remove('sidebar-open');

    // Load view-specific data
    if (view === 'brands') this.loadBrands();
    if (view === 'roster') this.loadRoster();
    if (view === 'tag-teams') this.loadTagTeams();
    if (view === 'stables') this.loadStables();
    if (view === 'championships') this.loadChampionships();
    if (view === 'games') this.renderGames();
    if (view === 'dashboard') this.loadDashboard();
    if (view === 'import') this.loadImportView();
  },

  // ── Sidebar ──
  setupSidebar() {
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });
    document.getElementById('sidebarOverlay').addEventListener('click', () => {
      document.body.classList.remove('sidebar-open');
    });
  },

  // ── Dashboard ──
  async loadDashboard() {
    this.showLoading(true);
    try {
      const dash = await Store.getDashboard();
      this.state.games = dash.games || [];
      this.renderDashboard(dash);
    } catch (err) {
      this.showError(err.message);
    }
    this.showLoading(false);
  },

  renderDashboard(dash) {
    const stats = document.getElementById('dashboardStats');
    stats.innerHTML = `
      <div class="stat-card"><div class="stat-value">${dash.total_games}</div><div class="stat-label">Games</div></div>
      <div class="stat-card"><div class="stat-value">${dash.total_brands}</div><div class="stat-label">Brands</div></div>
      <div class="stat-card"><div class="stat-value">${dash.total_wrestlers}</div><div class="stat-label">Wrestlers</div></div>
      <div class="stat-card"><div class="stat-value">${dash.total_tag_teams}</div><div class="stat-label">Tag Teams</div></div>
      <div class="stat-card"><div class="stat-value">${dash.total_stables}</div><div class="stat-label">Stables</div></div>
      <div class="stat-card"><div class="stat-value">${dash.total_championships}</div><div class="stat-label">Titles</div></div>
    `;

    const gameList = document.getElementById('dashboardGames');
    if (dash.games.length === 0) {
      gameList.innerHTML = '<p class="empty-state">No games yet. <a href="#games">Create one</a> to get started.</p>';
      return;
    }
    gameList.innerHTML = dash.games.map(g => `
      <div class="game-card" onclick="window.location.hash='games'">
        <div class="game-card-name">${this.esc(g.name)}</div>
        <div class="game-card-meta">${g.platform} ${g.year ? '· ' + g.year : ''}</div>
        <div class="game-card-counts">${g.brand_count} brands · ${g.wrestler_count} wrestlers</div>
      </div>
    `).join('');
  },

  // ── Games ──
  async renderGames() {
    this.showLoading(true);
    try {
      const games = await Store.getGames();
      this.state.games = games;
      this.populateGameSelects();
      const tbody = document.getElementById('gamesTableBody');
      if (games.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No games. Add one above.</td></tr>';
      } else {
        tbody.innerHTML = games.map(g => `
          <tr>
            <td><strong>${this.esc(g.name)}</strong></td>
            <td>${this.esc(g.platform)}</td>
            <td>${g.year || '-'}</td>
            <td>${g.brand_count}</td>
            <td>${g.wrestler_count}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-edit" onclick="app.editGame(${g.id})">✏️</button>
              <button class="btn btn-sm btn-del" onclick="app.deleteGame(${g.id})">🗑️</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      this.showError(err.message);
    }
    this.showLoading(false);
  },

  async editGame(id) {
    const g = this.state.games.find(x => x.id === id);
    if (!g) return;
    showForm('game', g);
  },

  async deleteGame(id) {
    if (!confirm('Delete this game and ALL its data? This cannot be undone.')) return;
    try {
      await Store.deleteGame(id);
      this.showToast('Game deleted');
      await this.loadAll();
    } catch (err) {
      this.showError(err.message);
    }
  },

  // ── Brands ──
  async loadBrands() {
    this.showLoading(true);
    try {
      const gameId = this.state.activeGameId;
      const brands = await Store.getBrands(gameId || undefined);
      this.state.brands = brands;
      const tbody = document.getElementById('brandsTableBody');
      if (brands.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No brands for the selected game.</td></tr>';
      } else {
        tbody.innerHTML = brands.map(b => `
          <tr>
            <td><span class="color-dot" style="background:${b.color}"></span> ${this.esc(b.name)}</td>
            <td>${b.game_id ? (this.state.games.find(g => g.id === b.game_id)?.name || '-') : '-'}</td>
            <td>${this.esc(b.gm)}</td>
            <td><span class="badge badge-${b.show_status}">${b.show_status}</span></td>
            <td>${b.wrestler_count}</td>
            <td>${b.championship_count}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-edit" onclick="app.editBrand(${b.id})">✏️</button>
              <button class="btn btn-sm btn-del" onclick="app.deleteBrand(${b.id})">🗑️</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      this.showError(err.message);
    }
    this.showLoading(false);
  },

  async editBrand(id) {
    const b = this.state.brands.find(x => x.id === id);
    if (b) showForm('brand', b);
  },

  async deleteBrand(id) {
    if (!confirm('Delete this brand? Wrestlers will be unlinked.')) return;
    try {
      await Store.deleteBrand(id);
      this.showToast('Brand deleted');
      this.loadBrands();
    } catch (err) {
      this.showError(err.message);
    }
  },

  // ── Roster ──
  async loadRoster() {
    this.showLoading(true);
    try {
      const gameId = document.getElementById('filterGame').value;
      const brandId = document.getElementById('filterBrand').value;
      const alignment = document.getElementById('filterAlignment').value;
      const gender = document.getElementById('filterGender').value;
      const status = document.getElementById('filterStatus').value;
      const search = document.getElementById('searchWrestler').value;

      if (!gameId && this.state.games.length > 0) {
        document.getElementById('filterGame').value = this.state.activeGameId || '';
      }

      const params = { game_id: gameId || this.state.activeGameId || '' };
      if (brandId) params.brand_id = brandId;
      if (alignment) params.alignment = alignment;
      if (gender) params.gender = gender;
      if (status) params.status = status;
      if (search) params.search = search;
      params.sort_by = this.state.rosterSortBy;
      params.sort_dir = this.state.rosterSortDir;

      const wrestlers = await Store.getWrestlers(params);
      this.state.wrestlers = wrestlers;
      this.renderRoster(wrestlers);
    } catch (err) {
      this.showError(err.message);
    }
    this.showLoading(false);
  },

  renderRoster(wrestlers) {
    const tbody = document.getElementById('rosterTableBody');
    if (wrestlers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No wrestlers found. Adjust filters or add one above.</td></tr>';
      return;
    }
    tbody.innerHTML = wrestlers.map(w => `
      <tr>
        <td><strong>${this.esc(w.name)}</strong></td>
        <td>${w.brand_name ? this.esc(w.brand_name) : '-'}</td>
        <td>${w.gender}</td>
        <td><span class="badge badge-${w.alignment}">${w.alignment}</span></td>
        <td><span class="badge badge-${w.status}">${w.status}</span></td>
        <td><div class="power-bar"><div class="power-fill" style="width:${w.power}%"></div><span>${w.power}</span></div></td>
        <td>${w.is_caw ? '✅' : ''}</td>
        <td>${w.wins}-${w.losses}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-edit" onclick="app.editWrestler(${w.id})">✏️</button>
          <button class="btn btn-sm btn-del" onclick="app.deleteWrestler(${w.id})">🗑️</button>
        </td>
      </tr>
    `).join('');
  },

  sortRoster(col) {
    if (this.state.rosterSortBy === col) {
      this.state.rosterSortDir = this.state.rosterSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.rosterSortBy = col;
      this.state.rosterSortDir = 'asc';
    }
    this.loadRoster();
  },

  async editWrestler(id) {
    const w = this.state.wrestlers.find(x => x.id === id);
    if (w) showForm('wrestler', w);
  },

  async deleteWrestler(id) {
    if (!confirm('Delete this wrestler?')) return;
    try {
      await Store.deleteWrestler(id);
      this.showToast('Wrestler deleted');
      this.loadRoster();
    } catch (err) {
      this.showError(err.message);
    }
  },

  // ── Tag Teams ──
  async loadTagTeams() {
    this.showLoading(true);
    try {
      const gameId = this.state.activeGameId;
      const teams = await Store.getTagTeams(gameId || undefined);
      this.state.tagTeams = teams;
      const tbody = document.getElementById('tagTeamsTableBody');
      if (teams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No tag teams yet.</td></tr>';
      } else {
        tbody.innerHTML = teams.map(t => `
          <tr>
            <td><strong>${this.esc(t.name)}</strong></td>
            <td>${t.brand_name || '-'}</td>
            <td>${t.member1_name || '-'}</td>
            <td>${t.member2_name || '-'}</td>
            <td><span class="badge badge-${t.alignment}">${t.alignment}</span></td>
            <td><span class="badge badge-${t.status}">${t.status}</span></td>
            <td>${t.wins}-${t.losses}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-edit" onclick="app.editTagTeam(${t.id})">✏️</button>
              <button class="btn btn-sm btn-del" onclick="app.deleteTagTeam(${t.id})">🗑️</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      this.showError(err.message);
    }
    this.showLoading(false);
  },

  async editTagTeam(id) {
    const t = this.state.tagTeams.find(x => x.id === id);
    if (t) showForm('tag-team', t);
  },

  async deleteTagTeam(id) {
    if (!confirm('Delete this tag team?')) return;
    try {
      await Store.deleteTagTeam(id);
      this.showToast('Tag team deleted');
      this.loadTagTeams();
    } catch (err) {
      this.showError(err.message);
    }
  },

  // ── Stables ──
  async loadStables() {
    this.showLoading(true);
    try {
      const gameId = this.state.activeGameId;
      const stables = await Store.getStables(gameId || undefined);
      this.state.stables = stables;
      const tbody = document.getElementById('stablesTableBody');
      if (stables.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No stables yet.</td></tr>';
      } else {
        tbody.innerHTML = stables.map(s => `
          <tr>
            <td><strong>${this.esc(s.name)}</strong></td>
            <td>${s.brand_name || '-'}</td>
            <td>${s.member_names.join(', ') || '-'}</td>
            <td><span class="badge badge-${s.status}">${s.status}</span></td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-edit" onclick="app.editStable(${s.id})">✏️</button>
              <button class="btn btn-sm btn-del" onclick="app.deleteStable(${s.id})">🗑️</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      this.showError(err.message);
    }
    this.showLoading(false);
  },

  async editStable(id) {
    const s = this.state.stables.find(x => x.id === id);
    if (s) showForm('stable', s);
  },

  async deleteStable(id) {
    if (!confirm('Delete this stable?')) return;
    try {
      await Store.deleteStable(id);
      this.showToast('Stable deleted');
      this.loadStables();
    } catch (err) {
      this.showError(err.message);
    }
  },

  // ── Championships ──
  async loadChampionships() {
    this.showLoading(true);
    try {
      const gameId = this.state.activeGameId;
      const champs = await Store.getChampionships(gameId || undefined);
      this.state.champs = champs;
      const tbody = document.getElementById('champsTableBody');
      if (champs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No championships yet.</td></tr>';
      } else {
        tbody.innerHTML = champs.map(c => `
          <tr>
            <td><strong>${this.esc(c.name)}</strong></td>
            <td>${c.brand_name || '-'}</td>
            <td><span class="badge badge-tier">${c.tier}</span></td>
            <td>${c.holder1_name || (c.is_vacant ? '<em>Vacant</em>' : '-')}${c.holder2_name ? ` & ${c.holder2_name}` : ''}</td>
            <td>${c.is_vacant ? '<span class="badge badge-vacant">Vacant</span>' : '<span class="badge badge-active">Active</span>'}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-edit" onclick="app.editChampionship(${c.id})">✏️</button>
              <button class="btn btn-sm btn-del" onclick="app.deleteChampionship(${c.id})">🗑️</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      this.showError(err.message);
    }
    this.showLoading(false);
  },

  async editChampionship(id) {
    const c = this.state.champs.find(x => x.id === id);
    if (c) showForm('championship', c);
  },

  async deleteChampionship(id) {
    if (!confirm('Delete this championship?')) return;
    try {
      await Store.deleteChampionship(id);
      this.showToast('Championship deleted');
      this.loadChampionships();
    } catch (err) {
      this.showError(err.message);
    }
  },

  // ── Import / Export ──
  async exportGame() {
    const select = document.getElementById('exportGameSelect');
    const gameId = select.value;
    if (!gameId) return alert('Select a game first.');
    try {
      const data = await Store.exportGame(gameId);
      const game = this.state.games.find(g => g.id == gameId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${game ? game.name.replace(/[^a-zA-Z0-9]/g, '_') : 'wrestling'}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Export downloaded');
    } catch (err) {
      this.showError(err.message);
    }
  },

  async importGame() {
    const input = document.getElementById('importFileInput');
    if (!input.files.length) return alert('Select a JSON file first.');
    try {
      const text = await input.files[0].text();
      const data = JSON.parse(text);
      const result = await Store.importGame(data);
      document.getElementById('importResult').innerHTML =
        `<div class="alert alert-success">Imported: ${result.games_created} games, ${result.brands_created} brands, ${result.wrestlers_created} wrestlers, ${result.tag_teams_created} tag teams, ${result.stables_created} stables, ${result.championships_created} titles.</div>`;
      if (result.errors.length) {
        document.getElementById('importResult').innerHTML +=
          `<div class="alert alert-warning">Errors: ${result.errors.join('; ')}</div>`;
      }
      await this.loadAll();
    } catch (err) {
      this.showError(err.message);
    }
  },

  // ── Helpers ──
  populateGameSelects() {
    const opts = g => `<option value="${g.id}">${this.esc(g.name)}</option>`;
    const selects = ['filterGame', 'exportGameSelect'];
    selects.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const current = sel.value;
      sel.innerHTML = '<option value="">Select a game...</option>' + this.state.games.map(opts).join('');
      if (current) sel.value = current;
    });

    // Brand filter gets its own
    const brandSel = document.getElementById('filterBrand');
    if (brandSel) {
      const currentBrand = brandSel.value;
      const gameId = document.getElementById('filterGame').value || this.state.activeGameId;
      const filteredBrands = this.state.brands.filter(b => !gameId || b.game_id == gameId);
      brandSel.innerHTML = '<option value="">All Brands</option>' +
        filteredBrands.map(b => `<option value="${b.id}">${this.esc(b.name)}</option>`).join('');
      if (currentBrand) brandSel.value = currentBrand;
    }
  },

  showLoading(on) {
    document.getElementById('loadingIndicator').style.display = on ? 'block' : 'none';
  },

  showError(msg) {
    this.showToast('❌ ' + msg, 6000);
  },

  showToast(msg, duration = 3000) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  },

  esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  },

  // ── Import / Export Handlers ──

  // Called when navigating to import view
  async loadImportView() {
    await this.loadAll(true); // ensures games loaded, skip navigate to avoid recursion
    const exportSel = document.getElementById('exportGameSelect');
    const importCatSel = document.getElementById('importCategoryGameSelect');
    const games = this.state.games;
    const opts = g => `<option value="${g.id}">${this.esc(g.name)}</option>`;
    [exportSel, importCatSel].forEach(sel => {
      if (!sel) return;
      const curr = sel.value;
      sel.innerHTML = '<option value="">Select a game...</option>' + games.map(opts).join('');
      if (curr && games.find(g => g.id == curr)) sel.value = curr;
    });
    this.refreshDbInfo();
  },

  onExportGameSelect() {
    const sel = document.getElementById('exportGameSelect');
    const section = document.getElementById('exportCategorySection');
    section.style.display = sel.value ? 'flex' : 'none';
  },

  async exportAndDownload() {
    const sel = document.getElementById('exportGameSelect');
    const gameId = sel.value;
    if (!gameId) return this.showToast('Select a game first.');
    try {
      const blob = await Store.downloadExport(gameId);
      const game = this.state.games.find(g => g.id == gameId);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${game ? game.name.replace(/[^a-zA-Z0-9]/g, '_') : 'wrestling'}_full_export.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      this.showToast('Full export downloaded');
    } catch (err) {
      this.showError('Export failed: ' + err.message);
    }
  },

  async exportAndDownloadCategory() {
    const gameSel = document.getElementById('exportGameSelect');
    const catSel = document.getElementById('exportCategorySelect');
    const gameId = gameSel.value;
    const category = catSel.value;
    if (!gameId) return this.showToast('Select a game first.');
    if (!category) return this.showToast('Select a category.');
    try {
      const blob = await Store.downloadExport(gameId, category);
      const game = this.state.games.find(g => g.id == gameId);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${game ? game.name.replace(/[^a-zA-Z0-9]/g, '_') : 'wrestling'}_${category}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      this.showToast(`Exported ${category} for ${game ? game.name : 'game'}`);
    } catch (err) {
      this.showError('Export failed: ' + err.message);
    }
  },

  onImportFileSelect() {
    const input = document.getElementById('importFileInput');
    const name = document.getElementById('importFileName');
    const btn = document.getElementById('importBtn');
    const preview = document.getElementById('importPreview');
    const previewContent = document.getElementById('importPreviewContent');
    if (input.files.length) {
      name.textContent = input.files[0].name;
      btn.disabled = false;
      // Show preview (first 2000 chars)
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const summary = {
            game: data.game?.name || 'Unknown Game',
            brands: (data.brands || []).length,
            wrestlers: (data.wrestlers || []).length,
            tag_teams: (data.tag_teams || []).length,
            stables: (data.stables || []).length,
            championships: (data.championships || []).length,
          };
          previewContent.textContent = JSON.stringify(summary, null, 2);
          preview.style.display = 'block';
        } catch {
          previewContent.textContent = '(invalid JSON or unrecognized format)';
          preview.style.display = 'block';
        }
      };
      reader.readAsText(input.files[0]);
    } else {
      name.textContent = 'No file selected';
      btn.disabled = true;
      preview.style.display = 'none';
    }
  },

  async importGameFromFile() {
    const input = document.getElementById('importFileInput');
    const resultDiv = document.getElementById('importResult');
    if (!input.files.length) return this.showToast('Select a JSON file first.');
    try {
      const text = await input.files[0].text();
      const data = JSON.parse(text);
      const result = await Store.importGame(data);
      resultDiv.innerHTML =
        `<div class="alert alert-success">✅ Imported: ${result.games_created} game(s), ${result.brands_created} brand(s), ${result.wrestlers_created} wrestler(s), ${result.tag_teams_created} tag team(s), ${result.stables_created} stable(s), ${result.championships_created} title(s).</div>`;
      if (result.errors && result.errors.length) {
        resultDiv.innerHTML +=
          `<div class="alert alert-warning">⚠️ Warnings: ${result.errors.join('; ')}</div>`;
      }
      this.showToast('Game imported successfully');
      await this.loadAll();
    } catch (err) {
      resultDiv.innerHTML =
        `<div class="alert alert-error">❌ Import failed: ${this.esc(err.message)}</div>`;
    }
  },

  onCategoryFileSelect() {
    const input = document.getElementById('importCategoryFileInput');
    const name = document.getElementById('catFileName');
    const btn = document.getElementById('importCategoryBtn');
    name.textContent = input.files.length ? input.files[0].name : 'No file selected';
    btn.disabled = !input.files.length;
  },

  async importCategoryFromFile() {
    const gameSel = document.getElementById('importCategoryGameSelect');
    const catSel = document.getElementById('importCategorySelect');
    const input = document.getElementById('importCategoryFileInput');
    const resultDiv = document.getElementById('catImportResult');
    const gameId = gameSel.value;
    const category = catSel.value;
    if (!gameId) return this.showToast('Select a target game.');
    if (!category) return this.showToast('Select a category.');
    if (!input.files.length) return this.showToast('Select a JSON file.');
    try {
      const text = await input.files[0].text();
      let items = JSON.parse(text);
      // Accept both single object and array
      if (!Array.isArray(items)) items = [items];
      const result = await Store.importCategory(gameId, category, items);
      const count = result.imported || items.length;
      const errors = result.errors || [];
      let html = `<div class="alert alert-success">✅ Imported ${count} ${category}.\n`;
      if (errors.length) {
        html += `<div class="alert alert-warning">⚠️ ${errors.length} error(s): ${errors.join('; ')}</div>`;
      }
      resultDiv.innerHTML = html;
      this.showToast(`Imported ${count} ${category}`);
      await this.loadAll();
    } catch (err) {
      resultDiv.innerHTML =
        `<div class="alert alert-error">❌ Import failed: ${this.esc(err.message)}</div>`;
    }
  },

  async downloadSample(category) {
    try {
      const data = await Store.getSample(category);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sample_${category}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      this.showToast(`Sample template downloaded: ${category}`);
    } catch (err) {
      this.showError('Sample download failed: ' + err.message);
    }
  },

  async refreshDbInfo() {
    const container = document.getElementById('dbInfoContent');
    try {
      const info = await Store.getDbInfo();
      const rc = info.row_counts || {};
      const pr = info.pragmas || {};
      const total = Object.values(rc).reduce((a, b) => a + b, 0);
      container.innerHTML = `
        <div class="db-info">
          <div class="db-info-row"><span class="db-label">Engine</span><span class="db-val">${this.esc(info.engine || 'SQLite')}</span></div>
          <div class="db-info-row"><span class="db-label">Tables</span><span class="db-val">${info.tables}</span></div>
          <div class="db-info-row"><span class="db-label">Total Records</span><span class="db-val">${total.toLocaleString()}</span></div>
          <div class="db-info-row"><span class="db-label">Journal Mode</span><span class="db-val"><span class="badge badge-${pr.journal_mode === 'wal' ? 'active' : 'inactive'}">${pr.journal_mode}</span></span></div>
          <div class="db-info-row"><span class="db-label">Page Size</span><span class="db-val">${(pr.page_size || 0).toLocaleString()} bytes</span></div>
          <div class="db-info-row"><span class="db-label">Page Count</span><span class="db-val">${(pr.page_count || 0).toLocaleString()}</span></div>
          <div class="db-info-table">
            <h4 style="margin-top:12px">Row Counts</h4>
            ${Object.entries(rc).map(([k, v]) =>
              `<div class="db-info-row"><span class="db-label">${k.replace(/_/g, ' ')}</span><span class="db-val">${v.toLocaleString()}</span></div>`
            ).join('')}
          </div>
          <button class="btn btn-secondary" onclick="app.refreshDbInfo()" style="margin-top:12px">🔄 Refresh</button>
        </div>`;
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">Failed to load DB info: ${this.esc(err.message)}</div>`;
    }
  },
};

// ── Form Management ──

const FORM_DEFS = {
  game: {
    title: 'Game',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'platform', label: 'Platform', type: 'text', placeholder: 'e.g. PS5, Xbox, PC' },
      { name: 'year', label: 'Year', type: 'number' },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],
    create: (d) => Store.createGame(d),
    update: (id, d) => Store.updateGame(id, d),
  },
  brand: {
    title: 'Brand',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'game_id', label: 'Game', type: 'select', options: 'games', required: true },
      { name: 'color', label: 'Color', type: 'color' },
      { name: 'gm', label: 'GM / Authority Figure', type: 'text' },
      { name: 'show_status', label: 'Status', type: 'select', options: ['active', 'inactive', 'archived'] },
      { name: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
    create: (d) => Store.createBrand(d),
    update: (id, d) => Store.updateBrand(id, d),
  },
  wrestler: {
    title: 'Wrestler',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'game_id', label: 'Game', type: 'select', options: 'games', required: true },
      { name: 'brand_id', label: 'Brand', type: 'select', options: 'brands' },
      { name: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', 'other'] },
      { name: 'alignment', label: 'Alignment', type: 'select', options: ['face', 'heel', 'tweener'] },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'injured', 'released', 'returning'] },
      { name: 'role', label: 'Role', type: 'text', placeholder: 'Singles, Tag Specialist, etc.' },
      { name: 'finisher', label: 'Finisher', type: 'text' },
      { name: 'power', label: 'Overall Rating (1-100)', type: 'range', min: 1, max: 100 },
      { name: 'is_caw', label: 'Created Wrestler (CAW)', type: 'checkbox' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    create: (d) => Store.createWrestler(d),
    update: (id, d) => Store.updateWrestler(id, d),
  },
  'tag-team': {
    title: 'Tag Team',
    fields: [
      { name: 'name', label: 'Team Name', type: 'text', required: true },
      { name: 'game_id', label: 'Game', type: 'select', options: 'games', required: true },
      { name: 'brand_id', label: 'Brand', type: 'select', options: 'brands' },
      { name: 'member1_id', label: 'Member 1', type: 'select', options: 'wrestlers' },
      { name: 'member2_id', label: 'Member 2', type: 'select', options: 'wrestlers' },
      { name: 'alignment', label: 'Alignment', type: 'select', options: ['face', 'heel', 'tweener'] },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'disbanded'] },
    ],
    create: (d) => Store.createTagTeam(d),
    update: (id, d) => Store.updateTagTeam(id, d),
  },
  stable: {
    title: 'Stable',
    fields: [
      { name: 'name', label: 'Stable Name', type: 'text', required: true },
      { name: 'game_id', label: 'Game', type: 'select', options: 'games', required: true },
      { name: 'brand_id', label: 'Brand', type: 'select', options: 'brands' },
      { name: 'member_ids', label: 'Members', type: 'multi-select', options: 'wrestlers' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'disbanded'] },
    ],
    create: (d) => Store.createStable(d),
    update: (id, d) => Store.updateStable(id, d),
  },
  championship: {
    title: 'Championship',
    fields: [
      { name: 'name', label: 'Title Name', type: 'text', required: true, placeholder: 'e.g. WWE Championship' },
      { name: 'game_id', label: 'Game', type: 'select', options: 'games', required: true },
      { name: 'brand_id', label: 'Brand', type: 'select', options: 'brands' },
      { name: 'tier', label: 'Tier', type: 'select', options: ['world', 'midcard', 'tag', 'womens_world', 'womens_midcard', 'womens_tag'] },
      { name: 'holder1_id', label: 'Current Champion', type: 'select', options: 'wrestlers' },
      { name: 'holder2_id', label: 'Co-Champion (tag titles)', type: 'select', options: 'wrestlers' },
      { name: 'is_vacant', label: 'Vacant', type: 'checkbox' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    create: (d) => Store.createChampionship(d),
    update: (id, d) => Store.updateChampionship(id, d),
  },
};

function showForm(type, editData = null) {
  const def = FORM_DEFS[type];
  if (!def) return;

  const overlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');

  title.textContent = editData ? `Edit ${def.title}` : `New ${def.title}`;

  let html = `<form id="entityForm" onsubmit="submitForm('${type}', ${editData ? editData.id : 'null'}); return false;">`;

  def.fields.forEach(f => {
    const val = editData ? editData[f.name] : '';
    html += `<div class="form-group">`;
    html += `<label for="field_${f.name}">${f.label}</label>`;

    switch (f.type) {
      case 'text':
        html += `<input type="text" id="field_${f.name}" name="${f.name}" value="${app.esc(String(val))}" ${f.required ? 'required' : ''} placeholder="${f.placeholder || ''}">`;
        break;
      case 'number':
        html += `<input type="number" id="field_${f.name}" name="${f.name}" value="${val || ''}">`;
        break;
      case 'color':
        html += `<input type="color" id="field_${f.name}" name="${f.name}" value="${val || '#5865f2'}">`;
        break;
      case 'textarea':
        html += `<textarea id="field_${f.name}" name="${f.name}">${app.esc(String(val))}</textarea>`;
        break;
      case 'checkbox':
        html += `<input type="checkbox" id="field_${f.name}" name="${f.name}" ${val ? 'checked' : ''}>`;
        break;
      case 'range':
        html += `<div class="range-wrap"><input type="range" id="field_${f.name}" name="${f.name}" min="${f.min || 1}" max="${f.max || 100}" value="${val || 50}" oninput="this.nextElementSibling.textContent=this.value"><span class="range-value">${val || 50}</span></div>`;
        break;
      case 'select':
        html += `<select id="field_${f.name}" name="${f.name}">`;
        html += '<option value="">-- Select --</option>';
        if (Array.isArray(f.options)) {
          f.options.forEach(o => {
            html += `<option value="${o}" ${String(val) === o ? 'selected' : ''}>${o}</option>`;
          });
        } else if (f.options === 'games') {
          app.state.games.forEach(g => {
            html += `<option value="${g.id}" ${Number(val) === g.id ? 'selected' : ''}>${app.esc(g.name)}</option>`;
          });
        } else if (f.options === 'brands') {
          const gameId = editData?.game_id || (document.getElementById('field_game_id')?.value);
          const brands = gameId ? app.state.brands.filter(b => b.game_id == gameId) : app.state.brands;
          brands.forEach(b => {
            html += `<option value="${b.id}" ${Number(val) === b.id ? 'selected' : ''}>${app.esc(b.name)}</option>`;
          });
        } else if (f.options === 'wrestlers') {
          app.state.wrestlers.forEach(w => {
            html += `<option value="${w.id}" ${Number(val) === w.id ? 'selected' : ''}>${app.esc(w.name)}</option>`;
          });
        }
        html += `</select>`;
        break;
      case 'multi-select':
        html += `<select id="field_${f.name}" name="${f.name}" multiple size="6">`;
        const selectedIds = editData?.member_ids || editData?.memberIds || [];
        const wrestlers = app.state.wrestlers || [];
        wrestlers.forEach(w => {
          html += `<option value="${w.id}" ${selectedIds.includes(w.id) ? 'selected' : ''}>${app.esc(w.name)}</option>`;
        });
        html += `</select>`;
        html += `<small class="field-hint">Hold Ctrl/Cmd to select multiple</small>`;
        break;
    }
    html += `</div>`;
  });

  html += `<div class="form-actions">
    <button type="submit" class="btn btn-primary">${editData ? 'Save Changes' : 'Create'}</button>
    <button type="button" class="btn btn-secondary" onclick="closeForm()">Cancel</button>
  </div>`;
  html += '</form>';

  body.innerHTML = html;
  overlay.classList.add('show');
  modal.classList.add('show');
}

async function submitForm(type, editId) {
  const form = document.getElementById('entityForm');
  const data = {};
  const def = FORM_DEFS[type];

  for (const f of def.fields) {
    const el = document.getElementById(`field_${f.name}`);
    if (!el) continue;
    if (f.type === 'checkbox') {
      data[f.name] = el.checked;
    } else if (f.type === 'multi-select') {
      data[f.name] = Array.from(el.selectedOptions).map(o => parseInt(o.value));
    } else if (f.type === 'number' || f.name === 'sort_order') {
      data[f.name] = el.value ? parseInt(el.value) : null;
    } else if (f.name.endsWith('_id') && f.type === 'select') {
      data[f.name] = el.value ? parseInt(el.value) : null;
    } else {
      data[f.name] = el.value;
    }
  }

  // Ensure game_id is always set for multi-game entities
  if (!data.game_id && document.getElementById('field_game_id')) {
    data.game_id = parseInt(document.getElementById('field_game_id').value);
  }

  try {
    if (editId) {
      await def.update(editId, data);
      app.showToast(`${def.title} updated`);
    } else {
      await def.create(data);
      app.showToast(`${def.title} created`);
    }
    closeForm();
    await app.loadAll();
  } catch (err) {
    app.showError(err.message);
  }
}

function closeForm() {
  document.getElementById('modalOverlay').classList.remove('show');
  document.getElementById('modal').classList.remove('show');
}

// ── Boot ──
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Store.ready();
    app.init();
  } catch (err) {
    document.getElementById('loadingText').textContent = 'Error: ' + err.message;
  } finally {
    const ov = document.getElementById('loadingOverlay');
    if (ov) ov.style.display = 'none';
  }
});
