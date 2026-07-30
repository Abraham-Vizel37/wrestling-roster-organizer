// ── Dashboard App v1.1 — Auto-population, Carousel, Modern UI ──
// ==============================================================

const dash = { state: { events: [], matches: [], settings: {} } };

// ══════════════════════════════════════════════
// TOAST SYSTEM
// ══════════════════════════════════════════════
function showToast(msg, type) {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ══════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.dash-nav-btn');
  if (!btn) return;
  const name = btn.dataset.section;
  if (!name) return;

  document.querySelectorAll('.dash-nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.dash-content').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  const sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');

  const loads = {
    overview: loadOverview,
    events: renderEvents,
    matches: renderMatches,
  };
  if (loads[name]) loads[name]();
});

// ══════════════════════════════════════════════
// BOOT — Auto-populate on first load
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await DashboardStore.ready();

    // Load saved settings
    const saved = localStorage.getItem('dashboardSettings');
    if (saved) { try { dash.state.settings = JSON.parse(saved); } catch {} }

    // Auto-populate
    const cacheBadge = document.getElementById('cacheStatus');
    cacheBadge.textContent = '📡 Fetching data...';
    const popResult = await DashboardStore.autoPopulate();
    if (popResult.source === 'cache') cacheBadge.textContent = '📦 Cached';
    else if (popResult.source === 'wikipedia') cacheBadge.textContent = '🌐 Wikipedia API';
    else if (popResult.source === 'seed') cacheBadge.textContent = '📋 Seed data';
    else cacheBadge.textContent = '🔋 Ready';

    // Kick off the UI
    initCarousel();
    await loadOverview();
  } catch (err) {
    console.error('Dashboard boot error:', err);
    document.getElementById('statsGrid').innerHTML =
      `<div class="dash-card"><p style="color:var(--text-muted);">⚠️ Initialisation error: ${esc(err.message)}. Refresh to retry.</p></div>`;
  }
});

// ══════════════════════════════════════════════
// MANUAL REFRESH
// ══════════════════════════════════════════════
async function manualRefresh() {
  const badge = document.getElementById('cacheStatus');
  badge.textContent = '🔄 Refreshing...';
  try {
    const result = await DashboardStore.autoPopulate(true);
    badge.textContent = '✅ ' + result.source;
    showToast('✅ Data refreshed from ' + result.source, 'success');
    loadOverview();
  } catch (err) {
    badge.textContent = '⚠️ Error';
    showToast('❌ Refresh failed: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════
// CAROUSEL COMPONENT
// ══════════════════════════════════════════════
const carousel = {
  index: 0, slides: [], timer: null, interval: 6000,

  init(slides) {
    this.slides = slides || [];
    this.index = 0;
    if (this.slides.length === 0) {
      document.getElementById('heroSection').style.display = 'none';
      return;
    }
    document.getElementById('heroSection').style.display = 'block';
    this.render();
    this.startAutoRotate();
  },

  render() {
    const track = document.getElementById('carouselTrack');
    const dots = document.getElementById('carouselDots');
    if (!track || !dots) return;

    track.innerHTML = this.slides.map((s, i) => `
      <div class="carousel-slide" style="display:${i === this.index ? 'flex' : 'none'}${s.url ? ';cursor:pointer' : ''}"${s.url ? ` onclick="window.open('${esc(s.url)}','_blank')"` : ''}>
        <div class="carousel-content">
          <span class="carousel-promo-badge badge-${s.promoClass || 'default'}">${esc(s.promotion || '')}</span>
          <div class="carousel-title">${esc(s.name)}</div>
          <div class="carousel-meta">
            <span>📅 ${s.date || 'TBD'}</span>
            ${s.venue ? `<span>📍 ${esc(s.venue)}</span>` : ''}
            ${s.location ? `<span>🏙️ ${esc(s.location)}</span>` : ''}
            ${s.event_type ? `<span>🎫 ${esc(s.event_type)}</span>` : ''}
          </div>
          ${s.desc ? `<div class="carousel-desc">${esc(s.desc)}</div>` : ''}
          ${s.url ? '<div style="margin-top:12px;"><span style="color:var(--accent);font-size:13px;">🔗 View on source site ↗</span></div>' : ''}
        </div>
      </div>
    `).join('');

    dots.innerHTML = this.slides.map((_, i) =>
      `<button class="carousel-dot ${i === this.index ? 'active' : ''}" onclick="carousel.goTo(${i})"></button>`
    ).join('');
  },

  goTo(i) {
    if (i < 0) i = this.slides.length - 1;
    if (i >= this.slides.length) i = 0;
    this.index = i;
    this.render();
    this.resetAutoRotate();
  },

  prev() { this.goTo(this.index - 1); },
  next() { this.goTo(this.index + 1); },

  startAutoRotate() {
    this.stopAutoRotate();
    if (this.slides.length > 1) {
      this.timer = setInterval(() => this.next(), this.interval);
    }
  },

  stopAutoRotate() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },
  resetAutoRotate() { this.startAutoRotate(); }
};

async function initCarousel() {
  const upcoming = await DashboardStore.getUpcomingEvents();
  const top3 = upcoming.slice(0, 3);

  if (top3.length === 0) {
    carousel.init([]);
    return;
  }

  const promoMap = { 'WWE':'wwe','All Elite Wrestling':'aew','Total Nonstop Action Wrestling':'tna','New Japan Pro-Wrestling':'njpw','Ring of Honor':'roh' };
  const slides = top3.map(e => ({
    name: e.name,
    promotion: e.promotion,
    promoClass: promoMap[e.promotion] || 'default',
    date: e.date || '',
    venue: e.venue || '',
    location: e.location || '',
    event_type: e.event_type || '',
    url: e.url || (e.source === 'cagematch' && e.source_id ? cagematchUrl(e.source_id) : ''),
    desc: e.description || `${e.promotion} presents ${e.name}${e.venue ? ' at ' + e.venue : ''}${e.location ? ' in ' + e.location : ''}.${e.url ? ' Click to view details.' : ''}`,
  }));

  carousel.init(slides);
}

// ══════════════════════════════════════════════
// ANIMATED COUNTER
// ══════════════════════════════════════════════
function animateCounter(el, target) {
  if (!el) return;
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;
  const duration = 800;
  const start = performance.now();
  const step = (now) => {
    const pct = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - pct, 3); // ease-out cubic
    el.textContent = Math.floor(current + (target - current) * eased);
    if (pct < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ══════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════
async function loadOverview() {
  const events = await DashboardStore.getAllEvents();
  const matches = await DashboardStore.getAllMatches();
  const upcoming = await DashboardStore.getUpcomingEvents();
  const recent = await DashboardStore.getRecentEvents();
  const promos = await DashboardStore.getUniquePromotions();

  dash.state.events = events;
  dash.state.matches = matches;

  // Animated stats
  animateCounter(document.getElementById('statEvents'), events.length);
  animateCounter(document.getElementById('statMatches'), matches.length);
  animateCounter(document.getElementById('statUpcoming'), upcoming.length);
  animateCounter(document.getElementById('statPromotions'), promos.length);

  // Update sub-labels
  const today = new Date();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  const thisMonth = upcoming.filter(e => e.date <= monthEnd).length;
  document.getElementById('statUpcomingSub').textContent = thisMonth + ' this month';

  // Upcoming events grid
  const upcomingContainer = document.getElementById('upcomingEvents');
  document.getElementById('upcomingCount').textContent = upcoming.length;
  renderEventCards(upcomingContainer, upcoming.slice(0, 6), 'upcomingEvents');

  // Recent events grid
  const recentContainer = document.getElementById('recentEvents');
  document.getElementById('recentCount').textContent = recent.length;
  renderEventCards(recentContainer, recent.slice(0, 6), 'recentEvents');

  // Recent matches
  const allMatches = await DashboardStore.getAllMatches();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const recentMatches = allMatches.filter(m => m.date >= cutoffStr).sort((a,b) => b.date.localeCompare(a.date) || a.event_name.localeCompare(b.event_name)).slice(0, 8);
  const recentMatchContainer = document.getElementById('recentMatches');
  document.getElementById('recentMatchCount').textContent = recentMatches.length;
  renderMiniMatchCards(recentMatchContainer, recentMatches, events);

  // News feed
  fetchNews();
}

function renderEventCards(container, events, prefix) {
  if (!events.length) {
    container.innerHTML = `
      <div class="dash-card" style="grid-column:1/-1;">
        <div class="empty-state" style="padding:24px;">
          <div class="icon">📭</div>
          <h3>No events yet</h3>
          <p>Events are auto-loaded on first visit. Try refreshing or import from Cagematch.</p>
          <button class="btn btn-primary" onclick="manualRefresh()" style="margin-top:12px;">🔄 Refresh Now</button>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = events.map(e => {
    const promoMap = { 'WWE':'wwe','All Elite Wrestling':'aew','Total Nonstop Action Wrestling':'tna','New Japan Pro-Wrestling':'njpw','Ring of Honor':'roh' };
    const promoClass = promoMap[e.promotion] || '';
    const isUpcoming = e.date >= new Date().toISOString().split('T')[0];
    const sourceUrl = e.url || (e.source === 'cagematch' && e.source_id ? cagematchUrl(e.source_id) : '');
    const cardContent = `
      <div class="dash-card promo-${promoClass}">
        <div class="dash-card-header">
          <div>
            <div class="dash-card-title">${esc(e.name)}</div>
            <div class="dash-card-sub">${esc(e.promotion)}${e.event_type ? ' · ' + esc(e.event_type) : ''}</div>
          </div>
          <span class="card-promo-badge" style="background:${isUpcoming ? 'rgba(34,197,94,0.15)' : 'var(--bg-glass)'};color:${isUpcoming ? '#4ade80' : 'var(--text-muted)'}">
            ${isUpcoming ? 'UPCOMING' : 'PAST'}
          </span>
        </div>
        <div class="dash-card-body">
          ${e.venue ? esc(e.venue) : ''}${e.venue && e.location ? ', ' : ''}${e.location ? esc(e.location) : ''}
        </div>
        <div class="dash-card-meta">
          <span>📅 ${e.date || 'TBD'}</span>
          ${e.rating ? '<span>⭐ ' + e.rating.toFixed(1) + '</span>' : ''}
          ${e.attendance ? '<span>👥 ' + e.attendance.toLocaleString() + '</span>' : ''}
          ${sourceUrl ? '<span style="margin-left:auto;color:var(--accent);font-size:11px;">🔗 View Source ↗</span>' : ''}
        </div>
      </div>`;
    return sourceUrl
      ? `<div class="dash-card-link-wrap promo-${promoClass}" onclick="openEventDetail('${e.id}')" style="cursor:pointer;">${cardContent}
            <div style="margin-top:8px;padding-top:10px;border-top:1px solid var(--border-glass);display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12px;color:var(--text-muted);">Click for full details →</span>
              <a href="${esc(sourceUrl)}" target="_blank" rel="noopener" style="color:var(--accent);font-size:12px;text-decoration:none;display:flex;align-items:center;gap:4px;" onclick="event.stopPropagation();">🔗 View Source ↗</a>
            </div>
          </div>`
      : `<div class="promo-${promoClass}">${cardContent}</div>`;
  }).join('');
}

function renderMiniMatchCards(container, matches, events) {
  if (!matches.length) {
    container.innerHTML = '<div class="dash-card" style="grid-column:1/-1;"><div class="empty-state" style="padding:20px;"><div class="icon">🤼</div><h3>No recent matches</h3><p>Match data from the past 2 weeks will appear here.</p></div></div>';
    return;
  }
  const promoMap = { 'WWE':'wwe','All Elite Wrestling':'aew','Total Nonstop Action Wrestling':'tna','New Japan Pro-Wrestling':'njpw','Ring of Honor':'roh' };
  container.innerHTML = matches.map(m => {
    const promoClass = promoMap[m.promotion] || '';
    let matchUrl = m.url || '';
    if (!matchUrl && m.event_id) {
      const ev = events.find(e => e.id === m.event_id);
      if (ev && ev.url) matchUrl = ev.url;
    }
    if (!matchUrl && m.source === 'cagematch' && m.source_id) matchUrl = cagematchUrl(m.source_id);
    const card = `
      <div class="dash-card promo-${promoClass}" style="cursor:${matchUrl ? 'pointer' : 'default'}">
        <div class="dash-card-header">
          <div>
            <div class="dash-card-title" style="font-size:14px;">${esc(m.participants.join(' vs '))}</div>
            <div class="dash-card-sub" style="font-size:12px;">${m.winner ? '🏆 ' + esc(m.winner) : 'Result TBD'}</div>
          </div>
          <span class="card-promo-badge">${esc(m.match_type)}</span>
        </div>
        <div class="dash-card-body" style="font-size:12px;">${m.event_name ? esc(m.event_name) : ''}</div>
        <div class="dash-card-meta" style="font-size:12px;">
          <span>📅 ${m.date}</span>
          ${m.rating != null ? '<span>⭐ ' + m.rating.toFixed(1) + '</span>' : ''}
          ${matchUrl ? '<span style="margin-left:auto;font-size:11px;color:var(--accent);">🔗</span>' : ''}
        </div>
      </div>`;
    const clickAction = m.event_id
      ? `openEventDetail('${m.event_id}')`
      : (matchUrl ? `window.open('${esc(matchUrl)}','_blank')` : '');
    const cursorStyle = clickAction ? 'pointer' : 'default';
    const clickHandler = clickAction ? ` onclick="${clickAction}"` : '';
    return clickAction
      ? `<div class="dash-card-link-wrap promo-${promoClass}"${clickHandler} style="cursor:${cursorStyle};">${card}</div>`
      : `<div class="promo-${promoClass}">${card}</div>`;
  }).join('');
}

// ══════════════════════════════════════════════
// NEWS FEED
// ══════════════════════════════════════════════
async function fetchNews() {
  const container = document.getElementById('newsFeed');
  try {
    const events = dash.state.events;
    const recent = [...events].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 8);

    if (recent.length) {
      container.innerHTML = recent.map(e => {
        const promoMap = { 'WWE':'wwe','All Elite Wrestling':'aew','Total Nonstop Action Wrestling':'tna' };
        const promoClass = promoMap[e.promotion] || '';
        const sourceUrl = e.url || (e.source === 'cagematch' && e.source_id ? cagematchUrl(e.source_id) : '');
        return `
        <div class="dash-card promo-${promoClass}" style="grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:14px 20px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:18px;">📰</span>
            <div>
              ${sourceUrl ? `<a href="${esc(sourceUrl)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;"><strong>${esc(e.promotion)}</strong> — ${esc(e.name)}</a>` : `<strong>${esc(e.promotion)}</strong> — ${esc(e.name)}`}
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">📅 ${e.date}${e.venue ? ' · ' + esc(e.venue) : ''}${sourceUrl ? ' · 🔗' : ''}</div>
            </div>
          </div>
          <span class="card-promo-badge">${esc(e.event_type || 'Event')}</span>
        </div>`;
      }).join('');
    } else {
      container.innerHTML = `
        <div class="dash-card" style="grid-column:1/-1;"><div class="empty-state" style="padding:24px;">
          <div class="icon">📡</div>
          <h3>No news yet</h3>
          <p>Auto-population runs on first visit. Import events or refresh to see news here.</p>
        </div></div>`;
    }
  } catch {
    container.innerHTML = '<div class="dash-card" style="grid-column:1/-1;"><p style="color:var(--text-muted);padding:16px;">Could not load news feed.</p></div>';
  }
}

// ══════════════════════════════════════════════
// EVENTS
// ══════════════════════════════════════════════
async function renderEvents() {
  const all = await DashboardStore.getAllEvents();
  const search = (document.getElementById('searchEvent').value || '').toLowerCase();
  const promo = document.getElementById('filterPromotion').value;

  // Populate promo filter
  const promos = await DashboardStore.getUniquePromotions();
  const promoSelect = document.getElementById('filterPromotion');
  promoSelect.innerHTML = '<option value="">All Promotions</option>' +
    promos.map(p => `<option value="${esc(p)}" ${p === promo ? 'selected' : ''}>${esc(p)}</option>`).join('');

  let filtered = all;
  if (search) filtered = filtered.filter(e => e.name.toLowerCase().includes(search) || e.promotion.toLowerCase().includes(search));
  if (promo) filtered = filtered.filter(e => e.promotion === promo);
  filtered.sort((a,b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

  document.getElementById('allEventsCount').textContent = filtered.length;
  const container = document.getElementById('eventsList');

  if (!filtered.length) {
    container.innerHTML = `
      <div class="dash-card" style="grid-column:1/-1;">
        <div class="empty-state" style="padding:24px;">
          <div class="icon">📅</div>
          <h3>No events found</h3>
          <p>${all.length === 0 ? 'Auto-load events or add one manually.' : 'Try different search/filter terms.'}</p>
          ${all.length === 0 ? '<button class="btn btn-primary" onclick="manualRefresh()" style="margin-top:12px;">🔄 Auto-Load Events</button>' : ''}
        </div>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(e => {
    const promoMap = { 'WWE':'wwe','All Elite Wrestling':'aew','Total Nonstop Action Wrestling':'tna','New Japan Pro-Wrestling':'njpw','Ring of Honor':'roh' };
    const promoClass = promoMap[e.promotion] || '';
    const sourceUrl = e.url || (e.source === 'cagematch' && e.source_id ? cagematchUrl(e.source_id) : '');
    const cardContent = `
      <div class="dash-card promo-${promoClass}">
        <div class="dash-card-header">
          <div>
            <div class="dash-card-title">${esc(e.name)}</div>
            <div class="dash-card-sub">${esc(e.promotion)}${e.event_type ? ' · ' + esc(e.event_type) : ''}</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-sm" onclick="event.stopPropagation();showEventForm('${e.id}')">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteEvent('${e.id}')">🗑️</button>
          </div>
        </div>
        <div class="dash-card-body">${e.venue || ''}${e.venue && e.location ? ', ' : ''}${e.location || 'Location TBD'}</div>
        <div class="dash-card-meta">
          <span>📅 ${e.date || 'TBD'}</span>
          ${e.rating ? '<span>⭐ ' + e.rating.toFixed(1) + '</span>' : ''}
          ${e.attendance ? '<span>👥 ' + e.attendance.toLocaleString() + '</span>' : ''}
          <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${e.source || 'manual'}${sourceUrl ? ' · 🔗' : ''}</span>
        </div>
      </div>`;
    return sourceUrl
      ? `<div class="dash-card-link-wrap promo-${promoClass}" onclick="openEventDetail('${e.id}')" style="cursor:pointer;">${cardContent}
            <div style="margin-top:8px;padding-top:10px;border-top:1px solid var(--border-glass);display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12px;color:var(--text-muted);">Click for full details →</span>
              <a href="${esc(sourceUrl)}" target="_blank" rel="noopener" style="color:var(--accent);font-size:12px;text-decoration:none;display:flex;align-items:center;gap:4px;" onclick="event.stopPropagation();">🔗 View Source ↗</a>
            </div>
          </div>`
      : `<div class="promo-${promoClass}">${cardContent}</div>`;
  }).join('');
}

// ══════════════════════════════════════════════
// MATCHES
// ══════════════════════════════════════════════
async function renderMatches() {
  const all = await DashboardStore.getAllMatches();
  const search = (document.getElementById('searchMatch').value || '').toLowerCase();
  const promo = document.getElementById('filterPromotionMatch').value;
  const type = document.getElementById('filterMatchType').value;

  // Populate promo filter
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
    m.promotion.toLowerCase().includes(search));
  if (promo) filtered = filtered.filter(m => m.promotion === promo);
  if (type) filtered = filtered.filter(m => m.match_type === type);
  filtered.sort((a,b) => b.date.localeCompare(a.date) || a.event_name.localeCompare(b.event_name));

  document.getElementById('allMatchesCount').textContent = filtered.length;
  const container = document.getElementById('matchesList');

  if (!filtered.length) {
    container.innerHTML = `
      <div class="dash-card" style="grid-column:1/-1;">
        <div class="empty-state" style="padding:24px;">
          <div class="icon">🤼</div>
          <h3>No matches found</h3>
          <p>Try different search terms or import from Cagematch.</p>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(m => {
    const promoMap = { 'WWE':'wwe','All Elite Wrestling':'aew','Total Nonstop Action Wrestling':'tna','New Japan Pro-Wrestling':'njpw','Ring of Honor':'roh' };
    const promoClass = promoMap[m.promotion] || '';
    // Build source URL: match's own url, or event's url via event_id, or cagematch
    let matchUrl = m.url || '';
    if (!matchUrl && m.event_id) {
      const ev = all.find(e => e.id === m.event_id);
      if (ev && ev.url) matchUrl = ev.url;
    }
    if (!matchUrl && m.source === 'cagematch' && m.source_id) matchUrl = cagematchUrl(m.source_id);
    const cardContent = `
      <div class="dash-card promo-${promoClass}">
        <div class="dash-card-header">
          <div>
            <div class="dash-card-title">${esc(m.participants.join(' 🤼 vs '))}</div>
            <div class="dash-card-sub">${m.winner ? '🏆 ' + esc(m.winner) + ' wins' : 'Result TBD'}${m.result_type ? ' (' + esc(m.result_type) + ')' : ''}</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-sm" onclick="event.stopPropagation();showMatchForm('${m.id}')">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteMatch('${m.id}')">🗑️</button>
            <span class="card-promo-badge">${esc(m.match_type)}</span>
          </div>
        </div>
        <div class="dash-card-body">
          ${m.event_name ? esc(m.event_name) + (m.promotion ? ' · ' + esc(m.promotion) : '') : esc(m.promotion)}
          ${m.stipulation ? ' · ' + esc(m.stipulation) : ''}
        </div>
        <div class="dash-card-meta">
          <span>📅 ${m.date || 'TBD'}</span>
          ${m.rating != null ? '<span>⭐ ' + m.rating.toFixed(1) + '</span>' : ''}
          ${m.won_rating != null ? '<span>📊 WON: ' + m.won_rating.toFixed(1) + '*</span>' : ''}
          ${m.title_match ? '<span>👑 ' + esc(m.title_name || 'Title Match') + '</span>' : ''}
          ${matchUrl ? '<span style="margin-left:auto;color:var(--accent);font-size:11px;">🔗 View Source ↗</span>' : ''}
        </div>
      </div>`;
    const clickAction = m.event_id
      ? `openEventDetail('${m.event_id}')`
      : (matchUrl ? `window.open('${esc(matchUrl)}','_blank')` : '');
    const cursorStyle = clickAction ? 'pointer' : 'default';
    const clickHandler = clickAction ? ` onclick="${clickAction}"` : '';
    return clickAction
      ? `<div class="dash-card-link-wrap promo-${promoClass}"${clickHandler} style="cursor:${cursorStyle};">${cardContent}</div>`
      : `<div class="promo-${promoClass}">${cardContent}</div>`;
  }).join('');
}

// ══════════════════════════════════════════════
// EVENT FORM
// ══════════════════════════════════════════════
async function showEventForm(id) {
  let data = null;
  if (id) data = await DashboardStore.getEvent(id);

  const promos = await DashboardStore.getUniquePromotions();
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = data ? '✏️ Edit Event' : '➕ Add Event';

  document.getElementById('modalBody').innerHTML = `
    <form id="dashboardForm" onsubmit="submitEventForm('${id || ''}'); return false;">
      <div class="form-group">
        <label>Event Name <span style="color:#f87171;">*</span></label>
        <input type="text" class="form-input" id="f_name" value="${esc(data?.name || '')}" required placeholder="e.g. SummerSlam 2026">
      </div>
      <div class="form-group">
        <label>Promotion</label>
        <input type="text" class="form-input" id="f_promotion" value="${esc(data?.promotion || '')}" list="promoList" placeholder="e.g. WWE">
        <datalist id="promoList">${promos.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date</label>
          <input type="date" class="form-input" id="f_date" value="${data?.date || ''}">
        </div>
        <div class="form-group">
          <label>Event Type</label>
          <select class="form-input" id="f_event_type">
            <option value="">-- Select --</option>
            <option value="PPV" ${data?.event_type === 'PPV' ? 'selected' : ''}>PPV</option>
            <option value="TV" ${data?.event_type === 'TV' ? 'selected' : ''}>TV Show</option>
            <option value="Special" ${data?.event_type === 'Special' ? 'selected' : ''}>Special</option>
            <option value="House Show" ${data?.event_type === 'House Show' ? 'selected' : ''}>House Show</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Venue</label>
          <input type="text" class="form-input" id="f_venue" value="${esc(data?.venue || '')}" placeholder="e.g. U.S. Bank Stadium">
        </div>
        <div class="form-group">
          <label>Location</label>
          <input type="text" class="form-input" id="f_location" value="${esc(data?.location || '')}" placeholder="e.g. Minneapolis, MN">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Attendance</label>
          <input type="number" class="form-input" id="f_attendance" value="${data?.attendance || ''}" placeholder="e.g. 55000">
        </div>
        <div class="form-group">
          <label>Rating (0-10)</label>
          <input type="number" class="form-input" id="f_rating" min="0" max="10" step="0.1" value="${data?.rating ?? ''}" placeholder="e.g. 8.5">
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button type="submit" class="btn btn-primary">${data ? '💾 Save Event' : '➕ Add Event'}</button>
        <button type="button" class="btn" onclick="closeDashboardForm()">Cancel</button>
      </div>
    </form>`;
  overlay.classList.add('show');
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
      showToast('✅ Event updated', 'success');
    } else {
      await DashboardStore.createEvent(data);
      showToast('✅ Event added', 'success');
    }
    closeDashboardForm();
    renderEvents();
    loadOverview();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════
// MATCH FORM
// ══════════════════════════════════════════════
async function showMatchForm(id) {
  let data = null;
  let events = [];
  if (id) data = await DashboardStore.getMatch(id);
  events = await DashboardStore.getAllEvents();
  const promos = await DashboardStore.getUniquePromotions();

  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = data ? '✏️ Edit Match' : '➕ Add Match';

  document.getElementById('modalBody').innerHTML = `
    <form id="dashboardForm" onsubmit="submitMatchForm('${id || ''}'); return false;">
      <div class="form-group">
        <label>Participants <span style="color:#f87171;">*</span></label>
        <input type="text" class="form-input" id="f_participants" value="${esc((data?.participants || []).join(' vs '))}" required placeholder="e.g. Roman Reigns vs Cody Rhodes">
        <small style="color:var(--text-muted);font-size:11px;">Separate participants with " vs "</small>
      </div>
      <div class="form-group">
        <label>Winner</label>
        <input type="text" class="form-input" id="f_winner" value="${esc(data?.winner || '')}" placeholder="Leave blank for draw/NC">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Match Type</label>
          <select class="form-input" id="f_match_type">
            <option value="Singles" ${data?.match_type === 'Singles' ? 'selected' : ''}>Singles</option>
            <option value="Tag Team" ${data?.match_type === 'Tag Team' ? 'selected' : ''}>Tag Team</option>
            <option value="Triple Threat" ${data?.match_type === 'Triple Threat' ? 'selected' : ''}>Triple Threat</option>
            <option value="Fatal 4-Way" ${data?.match_type === 'Fatal 4-Way' ? 'selected' : ''}>Fatal 4-Way</option>
            <option value="Battle Royal" ${data?.match_type === 'Battle Royal' ? 'selected' : ''}>Battle Royal</option>
            <option value="Royal Rumble" ${data?.match_type === 'Royal Rumble' ? 'selected' : ''}>Royal Rumble</option>
            <option value="Trios" ${data?.match_type === 'Trios' ? 'selected' : ''}>Trios (6-Person)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Stipulation</label>
          <select class="form-input" id="f_stipulation">
            <option value="">None</option>
            <option value="Steel Cage" ${data?.stipulation === 'Steel Cage' ? 'selected' : ''}>Steel Cage</option>
            <option value="Hell in a Cell" ${data?.stipulation === 'Hell in a Cell' ? 'selected' : ''}>Hell in a Cell</option>
            <option value="Ladder" ${data?.stipulation === 'Ladder' ? 'selected' : ''}>Ladder</option>
            <option value="TLC" ${data?.stipulation === 'TLC' ? 'selected' : ''}>TLC</option>
            <option value="Extreme Rules" ${data?.stipulation === 'Extreme Rules' ? 'selected' : ''}>Extreme Rules</option>
            <option value="Iron Man" ${data?.stipulation === 'Iron Man' ? 'selected' : ''}>Iron Man</option>
            <option value="No DQ" ${data?.stipulation === 'No DQ' ? 'selected' : ''}>No DQ</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Promotion</label>
          <input type="text" class="form-input" id="f_match_promotion" value="${esc(data?.promotion || '')}" list="promoList2" placeholder="e.g. WWE">
          <datalist id="promoList2">${promos.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
        </div>
        <div class="form-group">
          <label>Event</label>
          <select class="form-input" id="f_event_id">
            <option value="">-- No Event --</option>
            ${events.map(e => `<option value="${e.id}" ${data?.event_id === e.id ? 'selected' : ''}>${esc(e.name)} (${e.date || 'no date'})</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date</label>
          <input type="date" class="form-input" id="f_match_date" value="${data?.date || ''}">
        </div>
        <div class="form-group">
          <label>Result Type</label>
          <select class="form-input" id="f_result_type">
            <option value="">-- Select --</option>
            <option value="Pinfall" ${data?.result_type === 'Pinfall' ? 'selected' : ''}>Pinfall</option>
            <option value="Submission" ${data?.result_type === 'Submission' ? 'selected' : ''}>Submission</option>
            <option value="KO" ${data?.result_type === 'KO' ? 'selected' : ''}>KO</option>
            <option value="DQ" ${data?.result_type === 'DQ' ? 'selected' : ''}>Disqualification</option>
            <option value="No Contest" ${data?.result_type === 'No Contest' ? 'selected' : ''}>No Contest</option>
            <option value="Draw" ${data?.result_type === 'Draw' ? 'selected' : ''}>Draw/Time Limit</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Community Rating (0-10)</label>
          <input type="number" class="form-input" id="f_rating" min="0" max="10" step="0.1" value="${data?.rating ?? ''}" placeholder="e.g. 8.7">
        </div>
        <div class="form-group">
          <label>WON Rating (0-5)</label>
          <input type="number" class="form-input" id="f_won_rating" min="0" max="5" step="0.25" value="${data?.won_rating ?? ''}" placeholder="e.g. 4.5">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="f_title_match" ${data?.title_match ? 'checked' : ''}> Title Match
          </label>
          <input type="text" class="form-input" id="f_title_name" value="${esc(data?.title_name || '')}" placeholder="e.g. WWE Championship">
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea class="form-input" id="f_notes" rows="2" placeholder="Additional notes">${esc(data?.notes || '')}</textarea>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button type="submit" class="btn btn-primary">${data ? '💾 Save Match' : '➕ Add Match'}</button>
        <button type="button" class="btn" onclick="closeDashboardForm()">Cancel</button>
      </div>
    </form>`;
  overlay.classList.add('show');
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
      showToast('✅ Match updated', 'success');
    } else {
      await DashboardStore.createMatch(data);
      showToast('✅ Match added', 'success');
    }
    closeDashboardForm();
    renderMatches();
    loadOverview();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════
// DELETE
// ══════════════════════════════════════════════
async function deleteEvent(id) {
  if (!confirm('Delete this event and all its matches?')) return;
  try {
    await DashboardStore.deleteEvent(id);
    showToast('🗑️ Event deleted', 'success');
    renderEvents();
    loadOverview();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

async function deleteMatch(id) {
  if (!confirm('Delete this match?')) return;
  try {
    await DashboardStore.deleteMatch(id);
    showToast('🗑️ Match deleted', 'success');
    renderMatches();
    loadOverview();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════
// FORM CLOSE
// ══════════════════════════════════════════════
function closeDashboardForm() {
  document.getElementById('modalOverlay').classList.remove('show');
}

// ══════════════════════════════════════════════
// EVENT DETAIL MODAL
// ══════════════════════════════════════════════
function closeEventDetail() {
  document.getElementById('detailOverlay').classList.remove('show');
}

async function openEventDetail(eventId) {
  const overlay = document.getElementById('detailOverlay');
  const content = document.getElementById('detailContent');
  content.innerHTML = `<div class="loading-spinner" style="padding:60px;"><div class="spinner"></div><p style="margin-top:16px;color:var(--text-muted);">Loading event details...</p></div>`;
  overlay.classList.add('show');

  // Fetch event + matches from local DB
  const event = await DashboardStore.getEvent(eventId);
  const matches = await DashboardStore.getMatchesForEvent(eventId);
  let cagematchData = null;

  // Try native Cagematch scraper (zero API keys, cors.sh proxy + DOMParser)
  if (event) {
    try {
      cagematchData = await DashboardStore.scrapeCagematchEvent(event.name);
      if (cagematchData) {
        // Merge Cagematch data into event display object
        if (cagematchData.eventName) event.cagematch_name = cagematchData.eventName;
        if (cagematchData.promotion) event.cagematch_promotion = cagematchData.promotion;
        if (cagematchData.eventType) event.cagematch_type = cagematchData.eventType;
        if (cagematchData.location) event.cagematch_location = cagematchData.location;
        if (cagematchData.arena) event.cagematch_arena = cagematchData.arena;
        if (cagematchData.attendance != null) event.cagematch_attendance = cagematchData.attendance;
        if (cagematchData.id) event.cagematch_id = cagematchData.id;
        if (cagematchData.eventRating != null) {
          event.cagematch_rating = cagematchData.eventRating;
          event.cagematch_votes = cagematchData.eventVotes;
        }
      }
    } catch (e) {
      console.warn('Native Cagematch scrape failed:', e);
    }
  }

  renderEventDetail(content, event, matches, cagematchData);
}

function renderEventDetail(container, event, matches, cagematchData) {
  if (!event) {
    container.innerHTML = '<div class="empty-state" style="padding:60px;"><div class="icon">⚠️</div><h3>Event not found</h3></div>';
    return;
  }

  const esc = (s) => {
    if (s == null) return '';
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  };

  const promoMap = { 'WWE':'wwe','All Elite Wrestling':'aew','Total Nonstop Action Wrestling':'tna','New Japan Pro-Wrestling':'njpw','Ring of Honor':'roh' };
  const promoClass = promoMap[event.promotion] || '';
  const sourceUrl = event.url || '';
  const cagematchUrl = event.cagematch_id ? `https://www.cagematch.net/?id=1&nr=${event.cagematch_id}` : '';

  // ── Determine display data ──
  // Native scraper returns structured matches. Local DB has {participants[], winner} format.
  const hasScrapedData = cagematchData && cagematchData.matches && cagematchData.matches.length > 0;
  const displayMatches = hasScrapedData ? cagematchData.matches : matches;

  // ── Build HTML ──
  let html = '';

  // HEADER
  html += `
    <div class="detail-hero promo-${promoClass}">
      <div class="detail-hero-bg"></div>
      <div class="detail-hero-content">
        <div class="detail-promo-badge">${event.cagematch_promotion ? esc(event.cagematch_promotion) : esc(event.promotion || 'Indie')}</div>
        <h1 class="detail-title">${esc(event.cagematch_name || event.name)}</h1>
        <div class="detail-date-badge">
          <span>📅</span>
          <span>${formatDate(event.date)}</span>
        </div>
      </div>
    </div>`;

  // INFO GRID
  html += `<div class="detail-info-grid">`;
  html += `<div class="detail-info-card"><div class="label">Type</div><div class="value">${esc(event.cagematch_type || event.event_type || 'Event')}</div></div>`;
  html += `<div class="detail-info-card"><div class="label">Promotion</div><div class="value">${esc(event.cagematch_promotion || event.promotion || 'N/A')}</div></div>`;
  if (event.cagematch_arena || event.venue) {
    html += `<div class="detail-info-card"><div class="label">Venue</div><div class="value">${esc(event.cagematch_arena || event.venue || 'N/A')}</div></div>`;
  }
  if (event.cagematch_location || event.location) {
    html += `<div class="detail-info-card"><div class="label">Location</div><div class="value">${esc(event.cagematch_location || event.location || 'N/A')}</div></div>`;
  }
  if (event.cagematch_attendance != null) {
    html += `<div class="detail-info-card"><div class="label">Attendance</div><div class="value">👥 ${Number(event.cagematch_attendance).toLocaleString()}</div></div>`;
  }
  if (event.cagematch_rating != null) {
    html += `<div class="detail-info-card"><div class="label">Cagematch Rating</div><div class="value">⭐ ${esc(event.cagematch_rating)}${event.cagematch_votes ? ' (' + esc(event.cagematch_votes) + ' votes)' : ''}</div></div>`;
  }
  if (event.rating != null) {
    html += `<div class="detail-info-card"><div class="label">User Rating</div><div class="value">⭐ ${Number(event.rating).toFixed(1)}</div></div>`;
  }
  html += `</div>`;

  // SOURCE LINKS
  const hasLinks = sourceUrl || cagematchUrl;
  if (hasLinks) {
    html += `<div class="detail-links">`;
    if (sourceUrl) {
      html += `<a href="${esc(sourceUrl)}" target="_blank" rel="noopener" class="detail-link-btn wiki-btn">📖 Wikipedia</a>`;
    }
    if (cagematchUrl) {
      html += `<a href="${cagematchUrl}" target="_blank" rel="noopener" class="detail-link-btn cage-btn">🔗 Cagematch.net</a>`;
    }
    html += `</div>`;
  }

  // MATCH CARD SECTION
  const sectionLabel = hasScrapedData ? '📋 Match Card' : '🤼 Matches';
  html += `<h2 class="detail-section-title">${sectionLabel} <span class="detail-count-badge">${displayMatches ? displayMatches.length : 0}</span></h2>`;

  if (!displayMatches || displayMatches.length === 0) {
    html += `<div class="empty-state" style="padding:30px;"><p style="color:var(--text-muted);">No match data available yet. Add matches for this event to get started.</p></div>`;
  } else if (hasScrapedData) {
    // Native scraper structured matches
    html += `<div class="detail-cagematch-card">`;
    displayMatches.forEach(m => {
      // Build match header with type and rating
      let matchHeader = '';
      if (m.type) {
        matchHeader += `<span class="detail-match-type">${esc(m.type)}</span>`;
      }
      if (m.rating != null && !m.isIneligible) {
        const stars = Math.round(m.rating / 2);
        matchHeader += `<span class="detail-match-rating">${'⭐'.repeat(Math.max(1, stars))} ${m.rating.toFixed(1)}</span>`;
      }
      if (m.duration) {
        matchHeader += `<span class="detail-match-duration">⏱ ${esc(m.duration)}</span>`;
      }

      html += `<div class="detail-match-row ${m.isTitleChange ? 'title-change' : ''}">`;
      if (matchHeader) {
        html += `<div class="detail-match-header">${matchHeader}</div>`;
      }
      if (m.isDraw) {
        html += `<div class="detail-match-draw">🤝 ${esc(m.winner)} vs ${esc(m.loser)} — Draw</div>`;
      } else if (m.winner && (m.loser || m.raw)) {
        html += `<div class="detail-match-winner">🏆 ${esc(m.winner)}</div>`;
        html += `<div class="detail-match-result">${m.loser ? 'defeats ' + esc(m.loser) : esc(m.raw)}</div>`;
      } else if (m.raw) {
        html += `<div class="detail-match-result">${esc(m.raw)}</div>`;
      }
      if (m.isTitleChange) html += `<div class="detail-match-badge change-badge">⚡ TITLE CHANGE</div>`;
      else if (m.isTitleMatch) html += `<div class="detail-match-badge title-badge">👑 Title Match</div>`;
      if (m.wonRating) html += `<div class="detail-match-won">Dave Meltzer: ${esc(m.wonRating)}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
  } else {
    // Local DB matches
    html += `<div class="detail-matches-grid">`;
    displayMatches.forEach(m => {
      const participants = m.participants?.join(' vs ') || 'TBD vs TBD';
      html += `<div class="detail-match-card">`;
      html += `<div class="match-participants">🤼 ${esc(participants)}</div>`;
      if (m.winner) html += `<div class="match-result">🏆 ${esc(m.winner)} wins</div>`;
      if (m.match_type || m.stipulation) html += `<div class="match-type">${esc(m.match_type || m.stipulation || '')}</div>`;
      if (m.title_match) html += `<div class="detail-match-badge title-badge">👑 ${esc(m.title_name || 'Title Match')}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  container.innerHTML = html;
}

function formatDate(dateStr) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ══════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════
// Settings panel simplified — no API keys needed with native scraper.

async function clearAllData() {
  await DashboardStore.clearAll();
  showToast('🗑️ All dashboard data cleared', 'success');
  loadOverview();
  renderEvents();
  renderMatches();
}

// ══════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════
let _lastExportJson = null;
let _lastExportCsv = null;

async function exportAll() {
  const [json, csv] = await Promise.all([DashboardStore.exportAll(), DashboardStore.exportAllCSV()]);
  showExport(json, csv.eventsCsv, csv.matchesCsv, 'Events + Matches');
}
async function exportEvents() {
  const [json, csv] = await Promise.all([DashboardStore.exportEvents(), DashboardStore.exportEventsCSV()]);
  showExport(json, csv, null, 'Events');
}
async function exportMatches() {
  const [json, csv] = await Promise.all([DashboardStore.exportMatches(), DashboardStore.exportMatchesCSV()]);
  showExport(json, null, csv, 'Matches');
}

function showExport(jsonData, eventsCsv, matchesCsv, label) {
  _lastExportJson = jsonData;
  _lastExportCsv = { events: eventsCsv, matches: matchesCsv };
  const preview = document.getElementById('exportPreview');
  preview.style.display = 'block';
  document.getElementById('exportJson').textContent = JSON.stringify(jsonData, null, 2);

  // Render CSV previews
  let csvHtml = '';
  if (eventsCsv) {
    const rows = eventsCsv.split('\n').slice(0, 6);
    csvHtml += `<div style="margin-top:12px;"><strong>📅 Events CSV</strong> <span style="color:var(--text-muted);font-size:12px;font-weight:400;">(${(eventsCsv.split('\n').length-1)} rows)</span></div>
<pre style="background:var(--bg-primary);padding:12px;border-radius:6px;overflow-x:auto;font-size:11px;line-height:1.5;margin:6px 0;max-height:180px;overflow-y:auto;">${esc(rows.join('\n'))}</pre>`;
  }
  if (matchesCsv) {
    const rows = matchesCsv.split('\n').slice(0, 6);
    csvHtml += `<div style="margin-top:8px;"><strong>🤼 Matches CSV</strong> <span style="color:var(--text-muted);font-size:12px;font-weight:400;">(${(matchesCsv.split('\n').length-1)} rows)</span></div>
<pre style="background:var(--bg-primary);padding:12px;border-radius:6px;overflow-x:auto;font-size:11px;line-height:1.5;margin:6px 0;max-height:180px;overflow-y:auto;">${esc(rows.join('\n'))}</pre>`;
  }
  const csvContainer = document.getElementById('exportCsv');
  if (csvContainer) csvContainer.innerHTML = csvHtml;

  preview.scrollIntoView({ behavior: 'smooth' });
}

function downloadExportCSV(type) {
  const csv = type === 'events' ? _lastExportCsv?.events : type === 'matches' ? _lastExportCsv?.matches : null;
  if (!csv) { showToast('⚠️ Export something first', 'error'); return; }
  const filename = `wrestling-${type}-${new Date().toISOString().split('T')[0]}.csv`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadExportJSON() {
  if (!_lastExportJson) { showToast('⚠️ Export something first', 'error'); return; }
  const json = JSON.stringify(_lastExportJson, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wrestling-dashboard-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════
// IMPORT FROM FILE
// ══════════════════════════════════════════════
async function importFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const container = document.getElementById('fileImportResults');
  try {
    const text = await file.text();

    // Detect CSV by extension or content
    if (file.name.endsWith('.csv') || text.includes(',') && text.split('\n')[0].includes(',')) {
      const result = await DashboardStore.importFromCSV(text);
      container.innerHTML = `<div class="toast success" style="padding:10px;">✅ CSV imported: ${result.events} events, ${result.matches} matches${result.skipped > 0 ? ' (' + result.skipped + ' dups skipped)' : ''}</div>`;
    } else {
      const json = JSON.parse(text);
      const result = await DashboardStore.importFromFile(json);
      container.innerHTML = `<div class="toast success" style="padding:10px;">✅ JSON imported: ${result.events} events, ${result.matches} matches${result.skipped > 0 ? ' (' + result.skipped + ' dups skipped)' : ''}</div>`;
    }
    renderEvents();
    renderMatches();
    loadOverview();
  } catch (err) {
    container.innerHTML = `<div class="toast error" style="padding:10px;">❌ Import failed: ${esc(err.message)}</div>`;
  }
}

// ══════════════════════════════════════════════
// IMPORT FROM CAGEMATCH (Native — zero API keys)
// ══════════════════════════════════════════════
let cagematchResults = [];

async function importCagematch() {
  const query = document.getElementById('cagematchQuery').value.trim();
  const container = document.getElementById('cagematchResults');

  if (!query) { container.innerHTML = '<div class="toast error" style="padding:10px;">⚠️ Enter an event name to search</div>'; return; }

  container.innerHTML = '<div class="loading-spinner" style="padding:16px;"><div class="spinner"></div> Searching Cagematch...</div>';

  try {
    // Step 1: Search by name
    const searchResults = await NativeScraper.searchEvent(query);

    if (!searchResults || !searchResults.length) {
      container.innerHTML = '<div class="toast" style="padding:10px;">No events found on Cagematch. Try a different search term.</div>';
      return;
    }

    cagematchResults = searchResults;
    container.innerHTML = searchResults.slice(0, 15).map(r => `
      <div class="dash-card" style="cursor:pointer;margin-bottom:4px;padding:10px 16px;" onclick="importCagematchDetail('${r.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><strong>${esc(r.name || 'Unknown')}</strong></div>
          <span style="color:var(--text-muted);font-size:12px;">${esc(r.promotion || '')}${r.date ? ' · ' + esc(r.date) : ''}</span>
        </div>
      </div>
    `).join('') + '<div style="display:flex;gap:8px;margin-top:8px;"><button class="btn btn-primary btn-sm" onclick="importCagematchAll()">📥 Import All Visible</button></div>';
  } catch (err) {
    container.innerHTML = `<div class="toast error" style="padding:10px;">❌ ${esc(err.message)}</div>`;
  }
}

async function importCagematchDetail(eventId) {
  const container = document.getElementById('cagematchResults');
  if (!eventId) return;

  const eventObj = cagematchResults.find(r => r.id === eventId);
  const eventName = eventObj ? eventObj.name : 'Event #' + eventId;
  container.innerHTML = `<div class="loading-spinner" style="padding:16px;"><div class="spinner"></div> Fetching ${esc(eventName)}...</div>`;

  try {
    // Step 2: Fetch event details
    const details = await NativeScraper.getEvent(eventId);
    if (!details) {
      container.innerHTML = '<div class="toast error" style="padding:10px;">❌ Could not fetch event details from Cagematch.</div>';
      return;
    }

    let imported = { events: 0, matches: 0, skipped: 0 };

    // Create event entry
    const eventEntry = {
      source: 'cagematch',
      source_id: String(details.id || eventId),
      name: details.eventName || eventName,
      date: details.date || '',
      promotion: details.promotion || '',
      location: details.location || '',
      venue: details.arena || '',
      event_type: details.eventType || 'Event',
      url: 'https://www.cagematch.net/?id=1&nr=' + (details.id || eventId)
    };
    const eventResult = await DashboardStore.importMany([eventEntry], []);
    imported.events += eventResult.events || 0;
    imported.skipped += eventResult.skipped || 0;

    // Create match entries
    if (details.matches && details.matches.length > 0) {
      const matchEntries = details.matches.map(m => ({
        source: 'cagematch',
        source_id: '',
        event_name: details.eventName || eventName,
        event_id: eventEntry.source_id,
        promotion: details.promotion || '',
        date: details.date || '',
        match_type: m.type || 'Singles Match',
        participants: [m.winner, m.loser].filter(Boolean),
        winner: m.winner,
        loser: m.loser,
        is_draw: m.isDraw || false,
        duration: m.duration || '',
        rating: m.rating != null ? m.rating : null,
        votes: m.votes || null,
        title_match: m.isTitleMatch || false,
        title_change: m.isTitleChange || false,
        is_ineligible: m.isIneligible || false
      }));

      const matchResult = await DashboardStore.importMany([], matchEntries);
      imported.matches += matchResult.matches || 0;
      imported.skipped += matchResult.skipped || 0;
    }

    container.innerHTML = `<div class="toast success" style="padding:10px;">
      ✅ Imported "${esc(details.eventName || eventName)}": ${imported.events} events, ${imported.matches} matches${imported.skipped > 0 ? ' (' + imported.skipped + ' dups skipped)' : ''}
    </div>`;
    renderMatches();
    loadOverview();
  } catch (err) {
    container.innerHTML = `<div class="toast error" style="padding:10px;">❌ ${esc(err.message)}</div>`;
  }
}

async function importCagematchAll() {
  const container = document.getElementById('cagematchResults');
  let total = { events: 0, matches: 0, skipped: 0 };

  for (const r of cagematchResults.slice(0, 10)) {
    if (!r.id) continue;
    container.innerHTML = `<div class="loading-spinner" style="padding:16px;"><div class="spinner"></div> 📥 Importing ${esc(r.name)}...</div>`;

    try {
      const details = await NativeScraper.getEvent(r.id);
      if (!details) continue;

      const eventEntry = {
        source: 'cagematch',
        source_id: String(details.id || r.id),
        name: details.eventName || r.name,
        date: details.date || r.date || '',
        promotion: details.promotion || r.promotion || '',
        location: details.location || '',
        venue: details.arena || '',
        event_type: details.eventType || 'Event',
        url: 'https://www.cagematch.net/?id=1&nr=' + (details.id || r.id)
      };
      const eventResult = await DashboardStore.importMany([eventEntry], []);
      total.events += eventResult.events || 0;
      total.skipped += eventResult.skipped || 0;

      if (details.matches && details.matches.length > 0) {
        const matchEntries = details.matches.map(m => ({
          source: 'cagematch',
          source_id: '',
          event_name: details.eventName || r.name,
          event_id: eventEntry.source_id,
          promotion: details.promotion || r.promotion || '',
          date: details.date || r.date || '',
          match_type: m.type || 'Singles Match',
          participants: [m.winner, m.loser].filter(Boolean),
          winner: m.winner,
          loser: m.loser,
          is_draw: m.isDraw || false,
          duration: m.duration || '',
          rating: m.rating != null ? m.rating : null,
          votes: m.votes || null,
          title_match: m.isTitleMatch || false,
          title_change: m.isTitleChange || false,
          is_ineligible: m.isIneligible || false
        }));

        const matchResult = await DashboardStore.importMany([], matchEntries);
        total.matches += matchResult.matches || 0;
        total.skipped += matchResult.skipped || 0;
      }

      await new Promise(r => setTimeout(r, 300)); // Rate-limit between fetches
    } catch (e) { console.warn('Failed:', r.name, e.message); }
  }

  container.innerHTML = `<div class="toast success" style="padding:10px;">✅ Batch complete: ${total.events} events, ${total.matches} matches${total.skipped > 0 ? ' (' + total.skipped + ' dups skipped)' : ''}</div>`;
  renderMatches();
  loadOverview();
}

// ══════════════════════════════════════════════
// ESCAPE
// ══════════════════════════════════════════════
function esc(s) {
  if (s == null) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

// ── Source URL helpers ──
function cagematchUrl(id) {
  if (!id) return '';
  // Construct Cagematch URL from a source_id (numeric ID or gimmick ID)
  const clean = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!clean) return '';
  return 'https://www.cagematch.net/?id=1&nr=' + clean;
}
