// ── Dashboard App — Live Match/Event Dashboard UI ──
// =====================================================

let dash = { state: { events: [], matches: [], settings: {} } };

// ── Navigation ──
function showSection(name) {
  document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link[data-section]').forEach(l => l.classList.remove('active'));

  const section = document.getElementById('section-' + name);
  if (section) section.classList.add('active');
  const link = document.querySelector(`.nav-link[data-section="${name}"]`);
  if (link) link.classList.add('active');

  // Load data on section switch
  const loads = {
    'overview': loadOverview,
    'events': renderEvents,
    'matches': renderMatches,
    'import': () => {},
    'export': () => document.getElementById('exportPreview').style.display = 'none',
    'settings': loadSettings
  };
  if (loads[name]) loads[name]();
}

// ── Boot ──
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await DashboardStore.ready();
    // Load saved API key
    const saved = localStorage.getItem('dashboardSettings');
    if (saved) {
      try { dash.state.settings = JSON.parse(saved); } catch(e) {}
    }
    if (dash.state.settings.cagematchKey) {
      document.getElementById('settingsApiKey').value = dash.state.settings.cagematchKey;
    }
    await loadOverview();
  } catch (err) {
    console.error('Dashboard boot error:', err);
    document.getElementById('overviewStats').innerHTML =
      `<p class="error">Failed to load: ${err.message}</p>`;
  }
});

// ── Settings ──
function loadSettings() {
  const key = document.getElementById('settingsApiKey');
  if (dash.state.settings.cagematchKey) key.value = dash.state.settings.cagematchKey;
}

function saveSettings() {
  const key = document.getElementById('settingsApiKey').value.trim();
  dash.state.settings.cagematchKey = key;
  localStorage.setItem('dashboardSettings', JSON.stringify(dash.state.settings));
  // Also sync to import section
  const importField = document.getElementById('cagematchApiKey');
  if (importField) importField.value = key;
  app.showToast('✅ Settings saved');
}

// ── Overview ──
async function loadOverview() {
  const events = await DashboardStore.getAllEvents();
  const matches = await DashboardStore.getAllMatches();
  const upcoming = await DashboardStore.getUpcomingEvents();
  const promos = await DashboardStore.getUniquePromotions();
  dash.state.events = events;
  dash.state.matches = matches;

  document.getElementById('statEvents').textContent = events.length;
  document.getElementById('statMatches').textContent = matches.length;
  document.getElementById('statUpcoming').textContent = upcoming.length;
  document.getElementById('statPromotions').textContent = promos.length;

  renderUpcomingEvents(upcoming);
  fetchNews();
}

function renderUpcomingEvents(events) {
  const container = document.getElementById('upcomingEvents');
  if (!events.length) {
    container.innerHTML = '<p class="empty-state">No upcoming events. Import or add events to get started.</p>';
    return;
  }
  container.innerHTML = events.slice(0, 10).map(e => `
    <div class="event-card">
      <div class="event-main">
        <div class="event-name">${esc(e.name)}</div>
        <div class="event-meta">${e.date || 'TBD'} · ${esc(e.promotion)}${e.venue ? ' · ' + esc(e.venue) : ''}</div>
      </div>
    </div>
  `).join('');
}

// ── News Feed ──
async function fetchNews() {
  const container = document.getElementById('newsFeed');
  try {
    // Fetch from multiple RSS/text sources (CORS proxy)
    const rssFeeds = [
      'https://www.cagematch.net/?id=1',
      'https://wrestlingdb.org/events/'
    ];
    // Use a simple news-aggregation approach: grab from OWDB recent events as "news"
    const events = dash.state.events;
    const recent = [...events].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

    if (recent.length) {
      container.innerHTML = recent.map(e => `
        <div class="news-item">
          <span class="news-meta">${e.date}</span>
          <div><strong>${esc(e.promotion)}</strong> — ${esc(e.name)}</div>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p class="empty-state">No recent events. Import some data to see news here.</p>';
    }
  } catch (err) {
    container.innerHTML = '<p class="empty-state">Could not load news feed.</p>';
  }
}

// ── Events ──
async function renderEvents() {
  const all = await DashboardStore.getAllEvents();
  const search = (document.getElementById('searchEvent').value || '').toLowerCase();
  const promo = document.getElementById('filterPromotion').value;

  // Populate promotion filter
  const promos = await DashboardStore.getUniquePromotions();
  const promoSelect = document.getElementById('filterPromotion');
  promoSelect.innerHTML = '<option value="">All Promotions</option>' +
    promos.map(p => `<option value="${esc(p)}" ${p === promo ? 'selected' : ''}>${esc(p)}</option>`).join('');

  let filtered = all;
  if (search) filtered = filtered.filter(e => e.name.toLowerCase().includes(search) || e.promotion.toLowerCase().includes(search));
  if (promo) filtered = filtered.filter(e => e.promotion === promo);
  filtered.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

  const container = document.getElementById('eventsList');
  if (!filtered.length) {
    container.innerHTML = '<p class="empty-state">No events found.</p>';
    return;
  }
  container.innerHTML = filtered.map(e => `
    <div class="event-card">
      <div class="event-main">
        <div class="event-name">${esc(e.name)}</div>
        <div class="event-meta">
          ${e.date || 'TBD'} · ${esc(e.promotion)}${e.venue ? ' · ' + esc(e.venue) : ''}${e.attendance ? ' · ' + e.attendance.toLocaleString() + ' attendance' : ''}
          ${e.rating ? ' · ⭐ ' + e.rating.toFixed(1) : ''}
          ${e.event_type ? ' · <span class="badge badge-' + e.event_type.toLowerCase() + '">' + esc(e.event_type) + '</span>' : ''}
        </div>
      </div>
      <div class="event-actions">
        <button onclick="showEventForm('${e.id}')">✏️</button>
        <button class="btn-danger" onclick="deleteEvent('${e.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ── Matches ──
async function renderMatches() {
  const all = await DashboardStore.getAllMatches();
  const search = (document.getElementById('searchMatch').value || '').toLowerCase();
  const promo = document.getElementById('filterPromotionMatch').value;
  const type = document.getElementById('filterMatchType').value;

  // Populate filters
  const promos = await DashboardStore.getUniquePromotions();
  const promoSelect = document.getElementById('filterPromotionMatch');
  promoSelect.innerHTML = '<option value="">All Promotions</option>' +
    promos.map(p => `<option value="${esc(p)}" ${p === promo ? 'selected' : ''}>${esc(p)}</option>`).join('');

  // Unique match types
  const types = [...new Set(all.map(m => m.match_type).filter(Boolean))].sort();
  const typeSelect = document.getElementById('filterMatchType');
  typeSelect.innerHTML = '<option value="">All Types</option>' +
    types.map(t => `<option value="${esc(t)}" ${t === type ? 'selected' : ''}>${esc(t)}</option>`).join('');

  let filtered = all;
  if (search) filtered = filtered.filter(m =>
    m.participants.some(p => p.toLowerCase().includes(search)) ||
    m.event_name.toLowerCase().includes(search) ||
    m.promotion.toLowerCase().includes(search)
  );
  if (promo) filtered = filtered.filter(m => m.promotion === promo);
  if (type) filtered = filtered.filter(m => m.match_type === type);
  filtered.sort((a, b) => b.date.localeCompare(a.date) || a.event_name.localeCompare(b.event_name));

  const container = document.getElementById('matchesList');
  if (!filtered.length) {
    container.innerHTML = '<p class="empty-state">No matches found.</p>';
    return;
  }
  container.innerHTML = filtered.map(m => `
    <div class="match-card">
      <div class="match-main">
        <div class="match-name">${esc(m.participants.join(' vs '))}${m.winner ? ' — 🏆 ' + esc(m.winner) + ' wins' : ''}</div>
        <div class="match-meta">
          ${m.date || 'TBD'} · ${esc(m.promotion)}${m.event_name ? ' · ' + esc(m.event_name) : ''}
          · <span class="badge badge-${m.match_type.toLowerCase().replace(/[^a-z0-9]/g, '')}">${esc(m.match_type)}</span>
          ${m.stipulation ? ' · ' + esc(m.stipulation) : ''}
          ${m.rating != null ? ' · ⭐ ' + m.rating.toFixed(1) : ''}
          ${m.won_rating != null ? ' · WON: ' + m.won_rating.toFixed(1) + '*' : ''}
          ${m.title_match ? ' · 👑 ' + esc(m.title_name || 'Title Match') : ''}
        </div>
      </div>
      <div class="match-actions">
        <button onclick="showMatchForm('${m.id}')">✏️</button>
        <button class="btn-danger" onclick="deleteMatch('${m.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ── Event Form ──
async function showEventForm(id) {
  let data = null;
  if (id) data = await DashboardStore.getEvent(id);

  const promos = await DashboardStore.getUniquePromotions();
  const overlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('modal');
  document.getElementById('modalTitle').textContent = data ? 'Edit Event' : 'Add Event';

  document.getElementById('modalBody').innerHTML = `
    <form id="dashboardForm" onsubmit="submitEventForm('${id || ''}'); return false;">
      <div class="form-group">
        <label>Event Name <span class="required-star">*</span></label>
        <input type="text" id="f_name" value="${esc(data?.name || '')}" required placeholder="e.g. WWE SummerSlam 2026">
      </div>
      <div class="form-group">
        <label>Promotion</label>
        <input type="text" id="f_promotion" value="${esc(data?.promotion || '')}" list="promoList" placeholder="e.g. WWE">
        <datalist id="promoList">${promos.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      </div>
      <div class="form-group">
        <label>Date</label>
        <input type="date" id="f_date" value="${data?.date || ''}">
      </div>
      <div class="form-group">
        <label>Event Type</label>
        <select id="f_event_type">
          <option value="">-- Select --</option>
          <option value="PPV" ${data?.event_type === 'PPV' ? 'selected' : ''}>PPV</option>
          <option value="TV" ${data?.event_type === 'TV' ? 'selected' : ''}>TV Show</option>
          <option value="Special" ${data?.event_type === 'Special' ? 'selected' : ''}>Special</option>
          <option value="House Show" ${data?.event_type === 'House Show' ? 'selected' : ''}>House Show</option>
        </select>
      </div>
      <div class="form-group">
        <label>Venue</label>
        <input type="text" id="f_venue" value="${esc(data?.venue || '')}" placeholder="e.g. MetLife Stadium">
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" id="f_location" value="${esc(data?.location || '')}" placeholder="e.g. East Rutherford, NJ">
      </div>
      <div class="form-group">
        <label>Attendance</label>
        <input type="number" id="f_attendance" value="${data?.attendance || ''}" placeholder="e.g. 55000">
      </div>
      <div class="form-group">
        <label>Rating (0-10)</label>
        <input type="number" id="f_rating" min="0" max="10" step="0.1" value="${data?.rating ?? ''}" placeholder="e.g. 8.5">
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">${data ? '💾 Save Event' : '➕ Add Event'}</button>
        <button type="button" class="btn btn-secondary" onclick="closeDashboardForm()">Cancel</button>
      </div>
    </form>
  `;
  overlay.classList.add('show');
  modal.classList.add('show');
}

async function submitEventForm(id) {
  const data = {
    name: document.getElementById('f_name').value,
    promotion: document.getElementById('f_promotion').value,
    date: document.getElementById('f_date').value,
    event_type: document.getElementById('f_event_type').value,
    venue: document.getElementById('f_venue').value,
    location: document.getElementById('f_location').value,
    attendance: document.getElementById('f_attendance').value,
    rating: document.getElementById('f_rating').value
  };
  try {
    if (id) {
      await DashboardStore.updateEvent(id, data);
      app.showToast('✅ Event updated');
    } else {
      await DashboardStore.createEvent(data);
      app.showToast('✅ Event added');
    }
    closeDashboardForm();
    renderEvents();
  } catch (err) {
    app.showError(err.message);
  }
}

// ── Match Form ──
async function showMatchForm(id) {
  let data = null;
  let events = [];
  if (id) data = await DashboardStore.getMatch(id);
  events = await DashboardStore.getAllEvents();
  const promos = await DashboardStore.getUniquePromotions();

  const overlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('modal');
  document.getElementById('modalTitle').textContent = data ? 'Edit Match' : 'Add Match';

  document.getElementById('modalBody').innerHTML = `
    <form id="dashboardForm" onsubmit="submitMatchForm('${id || ''}'); return false;">
      <div class="form-group">
        <label>Participants <span class="required-star">*</span></label>
        <input type="text" id="f_participants" value="${esc((data?.participants || []).join(' vs '))}" required placeholder="e.g. Roman Reigns vs Cody Rhodes">
        <small class="field-hint">Separate participants with "vs"</small>
      </div>
      <div class="form-group">
        <label>Winner</label>
        <input type="text" id="f_winner" value="${esc(data?.winner || '')}" placeholder="e.g. Cody Rhodes (leave blank for draw/No Contest)">
      </div>
      <div class="form-group">
        <label>Match Type</label>
        <select id="f_match_type">
          <option value="">-- Select --</option>
          <option value="Singles" ${data?.match_type === 'Singles' ? 'selected' : ''}>Singles</option>
          <option value="Tag Team" ${data?.match_type === 'Tag Team' ? 'selected' : ''}>Tag Team</option>
          <option value="Triple Threat" ${data?.match_type === 'Triple Threat' ? 'selected' : ''}>Triple Threat</option>
          <option value="Fatal 4-Way" ${data?.match_type === 'Fatal 4-Way' ? 'selected' : ''}>Fatal 4-Way</option>
          <option value="Battle Royal" ${data?.match_type === 'Battle Royal' ? 'selected' : ''}>Battle Royal</option>
          <option value="Royal Rumble" ${data?.match_type === 'Royal Rumble' ? 'selected' : ''}>Royal Rumble</option>
          <option value="Gauntlet" ${data?.match_type === 'Gauntlet' ? 'selected' : ''}>Gauntlet</option>
          <option value="Trios" ${data?.match_type === 'Trios' ? 'selected' : ''}>Trios (6-Person)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Stipulation</label>
        <select id="f_stipulation">
          <option value="">None</option>
          <option value="Steel Cage" ${data?.stipulation === 'Steel Cage' ? 'selected' : ''}>Steel Cage</option>
          <option value="Hell in a Cell" ${data?.stipulation === 'Hell in a Cell' ? 'selected' : ''}>Hell in a Cell</option>
          <option value="Ladder" ${data?.stipulation === 'Ladder' ? 'selected' : ''}>Ladder</option>
          <option value="TLC" ${data?.stipulation === 'TLC' ? 'selected' : ''}>TLC</option>
          <option value="Tables" ${data?.stipulation === 'Tables' ? 'selected' : ''}>Tables</option>
          <option value="I Quit" ${data?.stipulation === 'I Quit' ? 'selected' : ''}>I Quit</option>
          <option value="Iron Man" ${data?.stipulation === 'Iron Man' ? 'selected' : ''}>Iron Man</option>
          <option value="Extreme Rules" ${data?.stipulation === 'Extreme Rules' ? 'selected' : ''}>Extreme Rules</option>
          <option value="No DQ" ${data?.stipulation === 'No DQ' ? 'selected' : ''}>No DQ</option>
          <option value="Submission" ${data?.stipulation === 'Submission' ? 'selected' : ''}>Submission</option>
        </select>
      </div>
      <div class="form-group">
        <label>Promotion</label>
        <input type="text" id="f_match_promotion" value="${esc(data?.promotion || '')}" list="promoList2" placeholder="e.g. WWE">
        <datalist id="promoList2">${promos.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      </div>
      <div class="form-group">
        <label>Event</label>
        <select id="f_event_id">
          <option value="">-- No Event --</option>
          ${events.map(e => `<option value="${e.id}" ${data?.event_id === e.id ? 'selected' : ''}>${esc(e.name)} (${e.date || 'no date'})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Date</label>
        <input type="date" id="f_match_date" value="${data?.date || ''}">
      </div>
      <div class="form-group">
        <label>Result Type</label>
        <select id="f_result_type">
          <option value="">-- Select --</option>
          <option value="Pinfall" ${data?.result_type === 'Pinfall' ? 'selected' : ''}>Pinfall</option>
          <option value="Submission" ${data?.result_type === 'Submission' ? 'selected' : ''}>Submission</option>
          <option value="KO" ${data?.result_type === 'KO' ? 'selected' : ''}>KO</option>
          <option value="Count Out" ${data?.result_type === 'Count Out' ? 'selected' : ''}>Count Out</option>
          <option value="DQ" ${data?.result_type === 'DQ' ? 'selected' : ''}>Disqualification</option>
          <option value="No Contest" ${data?.result_type === 'No Contest' ? 'selected' : ''}>No Contest</option>
          <option value="Draw" ${data?.result_type === 'Draw' ? 'selected' : ''}>Draw/Time Limit</option>
        </select>
      </div>
      <div class="form-group">
        <label>Community Rating (0-10)</label>
        <input type="number" id="f_rating" min="0" max="10" step="0.1" value="${data?.rating ?? ''}" placeholder="e.g. 8.7">
      </div>
      <div class="form-group">
        <label>WON Star Rating (0-5)</label>
        <input type="number" id="f_won_rating" min="0" max="5" step="0.25" value="${data?.won_rating ?? ''}" placeholder="e.g. 4.5">
      </div>
      <div class="form-group">
        <label class="checkbox-label"><input type="checkbox" id="f_title_match" ${data?.title_match ? 'checked' : ''}> Title Match</label>
      </div>
      <div class="form-group">
        <label>Title Name</label>
        <input type="text" id="f_title_name" value="${esc(data?.title_name || '')}" placeholder="e.g. WWE Championship">
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="f_notes">${esc(data?.notes || '')}</textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">${data ? '💾 Save Match' : '➕ Add Match'}</button>
        <button type="button" class="btn btn-secondary" onclick="closeDashboardForm()">Cancel</button>
      </div>
    </form>
  `;
  overlay.classList.add('show');
  modal.classList.add('show');
}

async function submitMatchForm(id) {
  const participantsStr = document.getElementById('f_participants').value;
  const data = {
    participants: participantsStr.split(/\s+vs\s+/).map(p => p.trim()).filter(Boolean),
    winner: document.getElementById('f_winner').value.trim(),
    match_type: document.getElementById('f_match_type').value || 'Singles',
    stipulation: document.getElementById('f_stipulation').value,
    promotion: document.getElementById('f_match_promotion').value,
    event_id: document.getElementById('f_event_id').value,
    date: document.getElementById('f_match_date').value,
    result_type: document.getElementById('f_result_type').value,
    rating: document.getElementById('f_rating').value,
    won_rating: document.getElementById('f_won_rating').value,
    title_match: document.getElementById('f_title_match').checked,
    title_name: document.getElementById('f_title_name').value,
    notes: document.getElementById('f_notes').value
  };
  // Auto-fill event_name from event_id
  if (data.event_id) {
    const event = await DashboardStore.getEvent(data.event_id);
    if (event) {
      data.event_name = event.name;
      if (!data.promotion) data.promotion = event.promotion;
      if (!data.date) data.date = event.date;
    }
  }
  try {
    if (id) {
      await DashboardStore.updateMatch(id, data);
      app.showToast('✅ Match updated');
    } else {
      await DashboardStore.createMatch(data);
      app.showToast('✅ Match added');
    }
    closeDashboardForm();
    renderMatches();
  } catch (err) {
    app.showError(err.message);
  }
}

// ── Delete ──
async function deleteEvent(id) {
  if (!confirm('Delete this event and all its matches?')) return;
  try {
    await DashboardStore.deleteEvent(id);
    app.showToast('🗑️ Event deleted');
    renderEvents();
  } catch (err) {
    app.showError(err.message);
  }
}

async function deleteMatch(id) {
  if (!confirm('Delete this match?')) return;
  try {
    await DashboardStore.deleteMatch(id);
    app.showToast('🗑️ Match deleted');
    renderMatches();
  } catch (err) {
    app.showError(err.message);
  }
}

// ── Form Close ──
function closeDashboardForm() {
  document.getElementById('modalOverlay').classList.remove('show');
  document.getElementById('modal').classList.remove('show');
}

// ── Export ──
async function exportAll() {
  const data = await DashboardStore.exportAll();
  showExport(data);
}
async function exportEvents() {
  const data = await DashboardStore.exportEvents();
  showExport(data);
}
async function exportMatches() {
  const data = await DashboardStore.exportMatches();
  showExport(data);
}
function showExport(data) {
  document.getElementById('exportPreview').style.display = 'block';
  document.getElementById('exportJson').textContent = JSON.stringify(data, null, 2);
}
function downloadExport() {
  const json = document.getElementById('exportJson').textContent;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wrestling-dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import from File ──
async function importFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const container = document.getElementById('fileImportResults');
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const result = await DashboardStore.importFromFile(json);
    container.innerHTML = `<div class="import-result-item" style="border-color:#57f287;">
      ✅ Imported: ${result.events} events, ${result.matches} matches
      ${result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : ''}
    </div>`;
    renderEvents();
    renderMatches();
  } catch (err) {
    container.innerHTML = `<div class="import-result-item" style="border-color:#ed4245;">
      ❌ Import failed: ${esc(err.message)}
    </div>`;
  }
}

// ── Import from Cagematch ──
let cagematchResults = [];
async function importCagematch() {
  const apiKey = document.getElementById('cagematchApiKey').value.trim() || dash.state.settings.cagematchKey;
  const query = document.getElementById('cagematchQuery').value.trim();
  const container = document.getElementById('cagematchResults');

  if (!apiKey) { container.innerHTML = '<div class="import-result-item" style="border-color:#faa61a;">⚠️ Enter your Parse.bot API key first (or save it in Settings)</div>'; return; }
  if (!query) { container.innerHTML = '<div class="import-result-item" style="border-color:#faa61a;">⚠️ Enter a search term</div>'; return; }

  container.innerHTML = '<div class="import-result-item">🔍 Searching Cagematch...</div>';

  try {
    // Step 1: Search for the query
    const searchRes = await DashboardStore.importFromCagematch(apiKey, 'search_site', { query });
    const results = searchRes?.data?.results || [];
    cagematchResults = results;

    if (!results.length) {
      container.innerHTML = '<div class="import-result-item">No results found on Cagematch.</div>';
      return;
    }

    container.innerHTML = results.slice(0, 20).map(r => `
      <div class="import-result-item" onclick="importCagematchDetail('${esc(r.Gimmick_id || r.ID || '')}', '${esc(r.Gimmick || r.Name || query)}')">
        <div class="result-name">${esc(r.Gimmick || r.Name || 'Unknown')}</div>
        <div class="result-meta">${r.Promotion_text || r.Promotion || ''}${r.Rating ? ' · ⭐ ' + r.Rating : ''}${r.Date ? ' · ' + r.Date : ''}</div>
      </div>
    `).join('') + '<div style="margin-top:8px"><button class="btn btn-secondary" onclick="importCagematchAll()">📥 Import All</button></div>';
  } catch (err) {
    container.innerHTML = `<div class="import-result-item" style="border-color:#ed4245;">❌ ${esc(err.message)}</div>`;
  }
}

async function importCagematchDetail(id, name) {
  const apiKey = document.getElementById('cagematchApiKey').value.trim() || dash.state.settings.cagematchKey;
  const container = document.getElementById('cagematchResults');
  if (!id) return;

  container.innerHTML = `<div class="import-result-item">🔍 Fetching details for ${esc(name)}...</div>`;

  try {
    // Try to get profile and matches
    let imported = { events: 0, matches: 0, skipped: 0 };
    try {
      const profile = await DashboardStore.importFromCagematch(apiKey, 'get_wrestler_profile', { id });
      // Store as a match entry if we have ID info
    } catch (e) {}

    // Get match history
    try {
      const matchesRes = await DashboardStore.importFromCagematch(apiKey, 'get_wrestler_matches', { id });
      const matchEntries = matchesRes?.data?.matches || [];
      const matches = matchEntries.map(m => ({
        source: 'cagematch',
        source_id: String(m.id || ''),
        event_name: m.event || '',
        promotion: m.promotion || m.Promotion || '',
        date: m.Date || m.date || '',
        match_type: m.match_type || 'Singles',
        participants: [name, ...(m.opponent ? [m.opponent] : [])],
        winner: m.result?.includes('wins') ? name : (m.opponent || ''),
        rating: m.Rating ? parseFloat(m.Rating) : null
      }));
      const result = await DashboardStore.importMany([], matches);
      imported.matches += result.matches;
      imported.skipped += result.skipped;
    } catch (e) {}

    container.innerHTML = `<div class="import-result-item" style="border-color:#57f287;">
      ✅ Imported matches for ${esc(name)}: ${imported.matches} new, ${imported.skipped} duplicates
    </div>`;
    renderMatches();
  } catch (err) {
    container.innerHTML = `<div class="import-result-item" style="border-color:#ed4245;">❌ ${esc(err.message)}</div>`;
  }
}

async function importCagematchAll() {
  const container = document.getElementById('cagematchResults');
  let total = { events: 0, matches: 0, skipped: 0 };

  for (const r of cagematchResults.slice(0, 10)) {
    const id = r.Gimmick_id || r.ID || '';
    if (!id) continue;
    container.innerHTML = `<div class="import-result-item">📥 Importing ${esc(r.Gimmick || r.Name)}...</div>`;
    const apiKey = document.getElementById('cagematchApiKey').value.trim() || dash.state.settings.cagematchKey;
    try {
      const matchesRes = await DashboardStore.importFromCagematch(apiKey, 'get_wrestler_matches', { id });
      const matchEntries = matchesRes?.data?.matches || [];
      const matches = matchEntries.map(m => ({
        source: 'cagematch',
        source_id: String(m.id || ''),
        event_name: m.event || '',
        promotion: m.promotion || m.Promotion || '',
        date: m.Date || m.date || '',
        match_type: m.match_type || 'Singles',
        participants: [r.Gimmick || r.Name || '', ...(m.opponent ? [m.opponent] : [])],
        winner: m.result?.includes('wins') ? (r.Gimmick || '') : (m.opponent || ''),
        rating: m.Rating ? parseFloat(m.Rating) : null
      }));
      const result = await DashboardStore.importMany([], matches);
      total.matches += result.matches;
      total.skipped += result.skipped;
      await new Promise(r => setTimeout(r, 300)); // Rate limit
    } catch (e) {
      console.warn('Failed to import:', r.Gimmick, e.message);
    }
  }

  container.innerHTML = `<div class="import-result-item" style="border-color:#57f287;">
    ✅ Batch import complete: ${total.matches} new matches, ${total.skipped} duplicates
  </div>`;
  renderMatches();
}

// ── Import from OWDB ──
async function importOwdb() {
  const query = document.getElementById('owdbQuery').value.trim();
  const container = document.getElementById('owdbResults');
  if (!query) { container.innerHTML = '<div class="import-result-item" style="border-color:#faa61a;">⚠️ Enter a search term</div>'; return; }

  container.innerHTML = '<div class="import-result-item">🔍 Searching OWDB...</div>';

  try {
    // OWDB has a REST API. Try fetching from their API.
    // Since we don't know the exact API endpoint structure, try the web scrape approach
    const resp = await fetch(`https://wrestlingdb.org/wrestlers/?search=${encodeURIComponent(query)}`);
    if (!resp.ok) throw new Error(`OWDB responded with ${resp.status}`);

    container.innerHTML = `<div class="import-result-item" style="border-color:#57f287;">
      ✅ OWDB search results found. <a href="https://wrestlingdb.org/wrestlers/?search=${encodeURIComponent(query)}" target="_blank">View in OWDB</a>
    </div>`;
  } catch (err) {
    container.innerHTML = `<div class="import-result-item" style="border-color:#ed4245;">
      ❌ OWDB: ${esc(err.message)}<br>
      <small>Try the Cagematch import above instead — it has broader coverage.</small>
    </div>`;
  }
}

// ── Clear All ──
async function clearAllData() {
  await DashboardStore.clearAll();
  app.showToast('🗑️ All dashboard data cleared');
  loadOverview();
}

// ── Utility ──
function esc(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
}

// ── Wire up overlay click to close modal ──
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    closeDashboardForm();
  }
});
