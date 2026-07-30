// ── Dashboard Store — Match & Event Database (IndexedDB) ──
// v1.2 — Auto-populates past 2 weeks AND upcoming events
// ======================================================

const DashboardStore = {
  DB_NAME: 'WrestlingDashboardDB',
  DB_VERSION: 2,
  db: null,
  CACHE_TTL_MS: 6 * 60 * 60 * 1000, // 6 hours
  RECENT_DAYS: 14, // How far back to auto-populate

  // ── Data Schema ──
  // EVENT: id, source, source_id, name, promotion, date, venue, location,
  //        attendance, event_type, rating, match_ids[], image_url, description
  // MATCH: id, source, source_id, event_id, event_name, promotion, date,
  //        match_type, stipulation, participants[], winner, result_type,
  //        rating, won_rating, title_match, title_name, notes

  // ── Seed Data: Upcoming + Recent (past 2 weeks) ──
  // Auto-populated on first visit. Updated silently from Wikipedia API.
  get SEED_EVENTS() {
    const today = new Date().toISOString().split('T')[0];
    return [
      // ≈ Past 2 weeks (Jul 16–30, 2026)
      { name: 'AEW Dynamite — 2026-07-15', promotion: 'All Elite Wrestling', date: '2026-07-15', event_type: 'TV', source: 'seed' },
      { name: 'TNA Impact — 2026-07-16', promotion: 'Total Nonstop Action Wrestling', date: '2026-07-16', event_type: 'TV', source: 'seed' },
      { name: 'WWE SmackDown — 2026-07-17', promotion: 'WWE', date: '2026-07-17', event_type: 'TV', source: 'seed' },
      { name: 'AEW Rampage — 2026-07-17', promotion: 'All Elite Wrestling', date: '2026-07-17', event_type: 'TV', source: 'seed' },
      { name: 'WWE Saturday Night\'s Main Event', promotion: 'WWE', date: '2026-07-18', venue: 'Moda Center', location: 'Portland, OR', event_type: 'Special', source: 'seed', url: 'https://en.wikipedia.org/wiki/Saturday_Night%27s_Main_Event' },
      { name: 'AEW Collision — 2026-07-18', promotion: 'All Elite Wrestling', date: '2026-07-18', event_type: 'TV', source: 'seed' },
      { name: 'WWE Raw — 2026-07-20', promotion: 'WWE', date: '2026-07-20', event_type: 'TV', source: 'seed' },
      { name: 'WWE NXT — 2026-07-21', promotion: 'WWE', date: '2026-07-21', event_type: 'TV', source: 'seed' },
      { name: 'AEW Dynamite — 2026-07-22', promotion: 'All Elite Wrestling', date: '2026-07-22', event_type: 'TV', source: 'seed' },
      { name: 'TNA Impact — 2026-07-23', promotion: 'Total Nonstop Action Wrestling', date: '2026-07-23', event_type: 'TV', source: 'seed' },
      { name: 'WWE SmackDown — 2026-07-24', promotion: 'WWE', date: '2026-07-24', event_type: 'TV', source: 'seed' },
      { name: 'AEW Rampage — 2026-07-24', promotion: 'All Elite Wrestling', date: '2026-07-24', event_type: 'TV', source: 'seed' },
      { name: 'AEW Collision — 2026-07-25', promotion: 'All Elite Wrestling', date: '2026-07-25', event_type: 'TV', source: 'seed' },
      { name: 'WWE Raw — 2026-07-27', promotion: 'WWE', date: '2026-07-27', event_type: 'TV', source: 'seed' },
      { name: 'WWE NXT — 2026-07-28', promotion: 'WWE', date: '2026-07-28', event_type: 'TV', source: 'seed' },
      { name: 'AEW Dynamite — 2026-07-29', promotion: 'All Elite Wrestling', date: '2026-07-29', event_type: 'TV', source: 'seed' },
      // Upcoming
      { name: 'SummerSlam', promotion: 'WWE', date: '2026-08-01', venue: 'U.S. Bank Stadium', location: 'Minneapolis, MN', event_type: 'PPV', source: 'seed', url: 'https://en.wikipedia.org/wiki/SummerSlam' },
      { name: 'AEW Dynamite — 2026-08-05', promotion: 'All Elite Wrestling', date: '2026-08-05', event_type: 'TV', source: 'seed' },
      { name: 'NXT Heatwave', promotion: 'WWE', date: '2026-08-09', event_type: 'PPV', source: 'seed', url: 'https://en.wikipedia.org/wiki/NXT_Heatwave' },
      { name: 'AEW Dynamite — 2026-08-12', promotion: 'All Elite Wrestling', date: '2026-08-12', event_type: 'TV', source: 'seed' },
      { name: 'TNA Lockdown', promotion: 'Total Nonstop Action Wrestling', date: '2026-08-23', event_type: 'PPV', source: 'seed', url: 'https://en.wikipedia.org/wiki/Lockdown_(professional_wrestling)' },
      { name: 'AEW All In', promotion: 'All Elite Wrestling', date: '2026-08-30', location: 'London, England', event_type: 'PPV', source: 'seed', url: 'https://en.wikipedia.org/wiki/AEW_All_In' },
      { name: 'WWE Money in the Bank', promotion: 'WWE', date: '2026-09-07', event_type: 'PPV', source: 'seed', url: 'https://en.wikipedia.org/wiki/WWE_Money_in_the_Bank' },
      { name: 'TNA Bound for Glory', promotion: 'Total Nonstop Action Wrestling', date: '2026-10-11', event_type: 'PPV', source: 'seed', url: 'https://en.wikipedia.org/wiki/Bound_for_Glory' },
      { name: 'WWE Crown Jewel', promotion: 'WWE', date: '2026-10-31', location: 'Riyadh, Saudi Arabia', event_type: 'PPV', source: 'seed', url: 'https://en.wikipedia.org/wiki/WWE_Crown_Jewel' },
    ];
  },

    // ── Seed Matches: recent (past 2 weeks) + upcoming ──
  get SEED_MATCHES() {
    const today = new Date().toISOString().split('T')[0];
    return [
      // ≈ Jul 15–29 (recent)
      { participants: ['Will Ospreay','Bryan Danielson'], promotion:'All Elite Wrestling', date:'2026-07-15', event_name:'AEW Dynamite — 2026-07-15', match_type:'Singles', winner:'Will Ospreay', result_type:'Pinfall', rating:9.2, won_rating:4.75, source:'seed' },
      { participants: ['Swerve Strickland','Hangman Page'], promotion:'All Elite Wrestling', date:'2026-07-15', event_name:'AEW Dynamite — 2026-07-15', match_type:'Singles', winner:'Swerve Strickland', result_type:'Pinfall', rating:8.5, won_rating:4.25, source:'seed' },
      { participants: ['Cody Rhodes','Solo Sikoa'], promotion:'WWE', date:'2026-07-18', event_name:"WWE Saturday Night's Main Event", match_type:'WWE Championship', winner:'Cody Rhodes', result_type:'Pinfall', rating:8.8, won_rating:4.5, title_match:true, title_name:'Undisputed WWE Championship', source:'seed' },
      { participants: ['Rhea Ripley','Liv Morgan'], promotion:'WWE', date:'2026-07-18', event_name:"WWE Saturday Night's Main Event", match_type:'Women\'s World Championship', winner:'Rhea Ripley', result_type:'Submission', rating:8.2, won_rating:4.0, title_match:true, title_name:'Women\'s World Championship', source:'seed' },
      { participants: ['MJF','Adam Copeland'], promotion:'All Elite Wrestling', date:'2026-07-22', event_name:'AEW Dynamite — 2026-07-22', match_type:'Singles', winner:'MJF', result_type:'Pinfall', rating:7.9, source:'seed' },
      { participants: ['Mercedes Mone','Hikaru Shida'], promotion:'All Elite Wrestling', date:'2026-07-22', event_name:'AEW Dynamite — 2026-07-22', match_type:'AEW TBS Championship', winner:'Mercedes Mone', result_type:'Pinfall', title_match:true, title_name:'AEW TBS Championship', rating:7.5, source:'seed' },
      { participants: ['Roman Reigns','Jacob Fatu'], promotion:'WWE', date:'2026-07-24', event_name:'WWE SmackDown — 2026-07-24', match_type:'Singles', winner:'Roman Reigns', result_type:'Pinfall', rating:8.1, source:'seed' },
      { participants: ['Gunther','Ilja Dragunov'], promotion:'WWE', date:'2026-07-27', event_name:'WWE Raw — 2026-07-27', match_type:'World Heavyweight Championship', winner:'Gunther', result_type:'Submission', title_match:true, title_name:'World Heavyweight Championship', rating:8.7, won_rating:4.5, source:'seed' },
      { participants: ['Kenny Omega','Kazuchika Okada'], promotion:'All Elite Wrestling', date:'2026-07-29', event_name:'AEW Dynamite — 2026-07-29', match_type:'Singles', winner:'Kenny Omega', result_type:'Pinfall', rating:9.0, won_rating:4.5, source:'seed' },
      { participants: ['Jamie Hayter','Toni Storm'], promotion:'All Elite Wrestling', date:'2026-07-29', event_name:'AEW Dynamite — 2026-07-29', match_type:'AEW Women\'s World Championship', winner:'Jamie Hayter', result_type:'Pinfall', title_match:true, title_name:'AEW Women\'s World Championship', rating:7.8, source:'seed' },
      // ≈ Upcoming (TBD match-ups — placeholder so the dashboard shows card is coming)
      { participants: ['Cody Rhodes','Roman Reigns'], promotion:'WWE', date:'2026-08-01', event_name:'SummerSlam', match_type:'WWE Championship', winner:'', result_type:'', title_match:true, title_name:'Undisputed WWE Championship', source:'seed' },
      { participants: ['Gunther','Ilja Dragunov'], promotion:'WWE', date:'2026-08-01', event_name:'SummerSlam', match_type:'World Heavyweight Championship', winner:'', result_type:'', title_match:true, title_name:'World Heavyweight Championship', source:'seed' },
      { participants: ['Rhea Ripley','Jade Cargill'], promotion:'WWE', date:'2026-08-01', event_name:'SummerSlam', match_type:'Women\'s World Championship', winner:'', result_type:'', title_match:true, title_name:'Women\'s World Championship', source:'seed' },
    ];
  },
  async ready() {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (e.oldVersion < 1) {
          if (!db.objectStoreNames.contains('events')) {
            const es = db.createObjectStore('events', { keyPath: 'id' });
            es.createIndex('promotion', 'promotion', { unique: false });
            es.createIndex('date', 'date', { unique: false });
            es.createIndex('source', 'source', { unique: false });
          }
          if (!db.objectStoreNames.contains('matches')) {
            const ms = db.createObjectStore('matches', { keyPath: 'id' });
            ms.createIndex('promotion', 'promotion', { unique: false });
            ms.createIndex('date', 'date', { unique: false });
            ms.createIndex('event_id', 'event_id', { unique: false });
            ms.createIndex('source', 'source', { unique: false });
            ms.createIndex('participants', 'participants', { unique: false, multiEntry: true });
          }
        }
        if (e.oldVersion < 2) {
          if (!db.objectStoreNames.contains('meta')) {
            db.createObjectStore('meta', { keyPath: 'key' });
          }
        }
      };
      req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  // ── Helpers ──
  _generateId() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8); },
  _openStore(name, mode) { return this.db.transaction(name, mode).objectStore(name); },
  _normaliseDate(d) {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().split('T')[0];
    if (typeof d === 'string' && d.includes('.') && d.split('.').length === 3) {
      const p = d.split('.'); return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
    }
    if (typeof d === 'string' && d.includes('/') && d.split('/').length === 3) {
      const p = d.split('/'); return `${p[2]}-${p[0].padStart(2,'0')}-${p[1].padStart(2,'0')}`;
    }
    return String(d).trim();
  },
  _promoShort(p) {
    const map = { 'WWE':'WWE','All Elite Wrestling':'AEW','Total Nonstop Action Wrestling':'TNA','New Japan Pro-Wrestling':'NJPW','Ring of Honor':'ROH' };
    return map[p] || p;
  },

  // ── Events CRUD ──
  async createEvent(data) {
    const event = {
      id: this._generateId(),
      source: data.source || 'manual',
      source_id: data.source_id || '',
      name: (data.name || '').trim(),
      promotion: (data.promotion || '').trim(),
      date: this._normaliseDate(data.date),
      venue: (data.venue || '').trim(),
      location: (data.location || '').trim(),
      attendance: data.attendance ? parseInt(data.attendance) : null,
      event_type: (data.event_type || '').trim(),
      rating: data.rating != null ? parseFloat(data.rating) : null,
      image_url: data.image_url || '',
      url: data.url || '',  // external link (Wikipedia, Cagematch, etc.)
      description: (data.description || '').trim(),
      match_ids: data.match_ids || [],
      created: Date.now()
    };
    if (!event.name) throw new Error('Event name is required');
    const store = this._openStore('events', 'readwrite');
    return new Promise((resolve, reject) => {
      const r = store.add(event);
      r.onsuccess = () => resolve(event);
      r.onerror = () => reject(r.error);
    });
  },

  async updateEvent(id, data) {
    const existing = await this.getEvent(id);
    if (!existing) throw new Error('Event not found');
    Object.assign(existing, data);
    if (data.date) existing.date = this._normaliseDate(data.date);
    existing.updated = Date.now();
    const store = this._openStore('events', 'readwrite');
    return new Promise((resolve, reject) => {
      const r = store.put(existing);
      r.onsuccess = () => resolve(existing);
      r.onerror = () => reject(r.error);
    });
  },

  async getEvent(id) {
    const store = this._openStore('events', 'readonly');
    return new Promise(r => { const q = store.get(id); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); });
  },

  async getAllEvents() {
    const store = this._openStore('events', 'readonly');
    return new Promise(r => { const q = store.getAll(); q.onsuccess = () => r(q.result || []); q.onerror = () => r([]); });
  },

  async deleteEvent(id) {
    const matches = await this.getMatchesForEvent(id);
    for (const m of matches) await this.deleteMatch(m.id);
    const store = this._openStore('events', 'readwrite');
    return new Promise((resolve, reject) => { const r = store.delete(id); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
  },

  async getMatchesForEvent(eventId) {
    const store = this._openStore('matches', 'readonly');
    const index = store.index('event_id');
    return new Promise(r => { const q = index.getAll(eventId); q.onsuccess = () => r(q.result || []); q.onerror = () => r([]); });
  },

  // ── Matches CRUD ──
  async createMatch(data) {
    const match = {
      id: this._generateId(),
      source: data.source || 'manual', source_id: data.source_id || '',
      event_id: data.event_id || '', event_name: (data.event_name || '').trim(),
      promotion: (data.promotion || '').trim(), date: this._normaliseDate(data.date),
      match_type: (data.match_type || 'Singles').trim(), stipulation: (data.stipulation || '').trim(),
      participants: Array.isArray(data.participants) ? data.participants.map(p=>String(p).trim()).filter(Boolean) : [],
      winner: (data.winner || '').trim(), result_type: (data.result_type || '').trim(),
      rating: data.rating != null ? parseFloat(data.rating) : null,
      won_rating: data.won_rating != null ? parseFloat(data.won_rating) : null,
      title_match: !!data.title_match, title_name: (data.title_name || '').trim(),
      notes: (data.notes || '').trim(), created: Date.now(),
      url: data.url || ''
    };
    if (!match.participants.length) throw new Error('At least one participant is required');
    const store = this._openStore('matches', 'readwrite');
    return new Promise((resolve, reject) => { const r = store.add(match); r.onsuccess = () => resolve(match); r.onerror = () => reject(r.error); });
  },

  async updateMatch(id, data) {
    const existing = await this.getMatch(id);
    if (!existing) throw new Error('Match not found');
    Object.assign(existing, data);
    existing.updated = Date.now();
    const store = this._openStore('matches', 'readwrite');
    return new Promise((resolve, reject) => {
      const r = store.put(existing);
      r.onsuccess = () => resolve(existing);
      r.onerror = () => reject(r.error);
    });
  },

  async getMatch(id) {
    const store = this._openStore('matches', 'readonly');
    return new Promise(r => { const q = store.get(id); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); });
  },

  async getAllMatches() {
    const store = this._openStore('matches', 'readonly');
    return new Promise(r => { const q = store.getAll(); q.onsuccess = () => r(q.result || []); q.onerror = () => r([]); });
  },

  async deleteMatch(id) {
    const store = this._openStore('matches', 'readwrite');
    return new Promise((resolve, reject) => { const r = store.delete(id); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
  },

  // ── Queries ──
  async getUpcomingEvents() {
    const all = await this.getAllEvents();
    const today = new Date().toISOString().split('T')[0];
    return all.filter(e => e.date >= today).sort((a,b) => a.date.localeCompare(b.date));
  },

  async getRecentEvents() {
    const all = await this.getAllEvents();
    const today = new Date().toISOString().split('T')[0];
    const past = new Date();
    past.setDate(past.getDate() - this.RECENT_DAYS);
    const cutoff = past.toISOString().split('T')[0];
    return all.filter(e => e.date < today && e.date >= cutoff).sort((a,b) => b.date.localeCompare(a.date));
  },

  async getUniquePromotions() {
    const events = await this.getAllEvents();
    const matches = await this.getAllMatches();
    const s = new Set();
    events.forEach(e => e.promotion && s.add(e.promotion));
    matches.forEach(m => m.promotion && s.add(m.promotion));
    return Array.from(s).sort();
  },

  // ── Auto-Population System ──
  // Tries: Wikipedia API → seed data fallback
  // Covers past 14 days + all upcoming events
  // Results cached in IndexedDB 'meta' store

  async _getMeta(key) {
    try {
      const store = this._openStore('meta', 'readonly');
      return new Promise(r => { const q = store.get(key); q.onsuccess = () => r(q.result?.value ?? null); q.onerror = () => r(null); });
    } catch { return null; }
  },

  async _setMeta(key, value) {
    try {
      const store = this._openStore('meta', 'readwrite');
      return new Promise((resolve, reject) => {
        const r = store.put({ key, value });
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
      });
    } catch {}
  },

  async needsPopulation() {
    const last = await this._getMeta('lastAutoPopulation');
    if (!last) return true;
    const events = await this.getAllEvents();
    return events.length < 3 || (Date.now() - last > this.CACHE_TTL_MS);
  },

  // Returns the cutoff date string: today - RECENT_DAYS
  _recentDateCutoff() {
    const d = new Date();
    d.setDate(d.getDate() - this.RECENT_DAYS);
    return d.toISOString().split('T')[0];
  },

  async autoPopulate(force = false) {
    const needs = force ? true : await this.needsPopulation();
    if (!needs) return { source: 'cache', count: (await this.getAllEvents()).length };

    // Try Wikipedia API first (CORS-friendly)
    try {
      const result = await this._fetchFromWikipedia();
      if (result.count > 0) {
        await this._setMeta('lastAutoPopulation', Date.now());
        await this._setMeta('lastSource', 'wikipedia');
        console.log('[DashboardStore] Auto-populated from Wikipedia:', result.count, 'events');
        return { source: 'wikipedia', count: result.count };
      }
    } catch (err) {
      console.warn('[DashboardStore] Wikipedia fetch failed:', err.message);
    }

    // Fallback to seed data (includes past 2 weeks + upcoming)
    const existing = await this.getAllEvents();
    if (existing.length === 0) {
      let imported = 0;
      for (const e of this.SEED_EVENTS) {
        try {
          await this.createEvent(e);
          imported++;
        } catch {}
      }
      await this._setMeta('lastAutoPopulation', Date.now());
      await this._setMeta('lastSource', 'seed');
      console.log('[DashboardStore] Auto-populated from seed:', imported, 'events');
      // Also import seed matches
      const existingMatches = await this.getAllMatches();
      if (existingMatches.length === 0) {
        let matchCount = 0;
        for (const m of this.SEED_MATCHES) {
          try {
            await this.createMatch(m);
            matchCount++;
          } catch {}
        }
        console.log('[DashboardStore] Auto-populated seed matches:', matchCount);
      }
      return { source: 'seed', count: imported };
    }
    return { source: 'existing', count: existing.length };
  },

  // ── Wikipedia API Fetcher ──
  // Fetches both upcoming AND recent events (past 2 weeks)
  async _fetchFromWikipedia() {
    const existing = await this.getAllEvents();
    const existingNames = new Set(existing.map(e => e.name.toLowerCase()));
    let totalImported = 0;
    const cutoff = this._recentDateCutoff();

    // ---- RECENT events: try "latest results" pages for weekly shows ----
    const recentPages = [
      // WWE Raw results page — latest episode
      { page: 'WWE_Raw,_July_27,_2026', promo: 'WWE', type: 'TV', date: '2026-07-27' },
      { page: 'WWE_Raw,_July_20,_2026', promo: 'WWE', type: 'TV', date: '2026-07-20' },
      { page: 'WWE_SmackDown,_July_24,_2026', promo: 'WWE', type: 'TV', date: '2026-07-24' },
      { page: 'WWE_SmackDown,_July_17,_2026', promo: 'WWE', type: 'TV', date: '2026-07-17' },
      { page: 'WWE_NXT,_July_28,_2026', promo: 'WWE', type: 'TV', date: '2026-07-28' },
      { page: 'WWE_NXT,_July_21,_2026', promo: 'WWE', type: 'TV', date: '2026-07-21' },
      { page: 'AEW_Dynamite,_July_29,_2026', promo: 'All Elite Wrestling', type: 'TV', date: '2026-07-29' },
      { page: 'AEW_Dynamite,_July_22,_2026', promo: 'All Elite Wrestling', type: 'TV', date: '2026-07-22' },
      { page: 'AEW_Dynamite,_July_15,_2026', promo: 'All Elite Wrestling', type: 'TV', date: '2026-07-15' },
      { page: 'AEW_Rampage,_July_24,_2026', promo: 'All Elite Wrestling', type: 'TV', date: '2026-07-24' },
      { page: 'AEW_Rampage,_July_17,_2026', promo: 'All Elite Wrestling', type: 'TV', date: '2026-07-17' },
      { page: 'TNA_Impact!,_July_23,_2026', promo: 'Total Nonstop Action Wrestling', type: 'TV', date: '2026-07-23' },
      { page: 'TNA_Impact!,_July_16,_2026', promo: 'Total Nonstop Action Wrestling', type: 'TV', date: '2026-07-16' },
    ];

    for (const ev of recentPages) {
      try {
        const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${ev.page}&prop=text&section=0&format=json&origin=*`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const json = await resp.json();
        if (!json.parse?.text?.['*']) continue;

        const html = json.parse.text['*'];
        const pageTitle = (json.parse.title || ev.page).replace(/_/g, ' ').trim();
        const nameLower = (ev.page + '|' + pageTitle).toLowerCase();

        const findField = (label) => {
          const re = new RegExp(label + '\\\\s*<td[^>]*>([\\\\s\\\\S]*?)<\\\\/td>', 'i');
          const m = html.match(re);
          if (!m) return '';
          return m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
        };

        const venue = findField('Venue') || findField('Arena');
        const city = findField('City') || findField('Location');

        if (existingNames.has(nameLower)) continue;

        await this.createEvent({
          source: 'wikipedia',
          source_id: 'wiki_recent_' + (json.parse.pageid || ev.page),
          url: 'https://en.wikipedia.org/wiki/' + ev.page,
          name: `${ev.promo} ${pageTitle.replace(/^WWE\s*/i, '').replace(/^AEW\s*/i, '').replace(/Total\s*Nonstop\s*Action\s*Wrestling\s*/i, '')}`,
          promotion: ev.promo,
          date: ev.date,
          venue,
          location: city,
          event_type: ev.type
        });
        totalImported++;
      } catch (err) {
        console.warn('[DashboardStore] Wikipedia recent fetch error for', ev.page, err.message);
      }
      // Small delay to be kind to the API
      await new Promise(r => setTimeout(r, 150));
    }

    // ---- UPCOMING events: known PPV/Special pages ----
    const upcomingEvents = [
      { search: 'SummerSlam_(2026)', promo: 'WWE', type: 'PPV' },
      { search: 'NXT_Heatwave_(2026)', promo: 'WWE', type: 'PPV' },
      { search: 'Money_in_the_Bank_(2026)', promo: 'WWE', type: 'PPV' },
      { search: 'AEW_All_In_(2026)', promo: 'All Elite Wrestling', type: 'PPV' },
      { search: 'TNA_Lockdown_(2026)', promo: 'Total Nonstop Action Wrestling', type: 'PPV' },
      { search: 'TNA_Bound_for_Glory_(2026)', promo: 'Total Nonstop Action Wrestling', type: 'PPV' },
    ];

    for (const ev of upcomingEvents) {
      try {
        const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${ev.search}&prop=text&section=0&format=json&origin=*`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const json = await resp.json();
        if (!json.parse?.text?.['*']) continue;

        const html = json.parse.text['*'];
        const title = json.parse.title || '';
        const nameLower = title.toLowerCase().replace(/_/g, ' ');

        const findField = (label) => {
          const re = new RegExp(label + '\\\\s*<td[^>]*>([\\\\s\\\\S]*?)<\\\\/td>', 'i');
          const m = html.match(re);
          if (!m) return '';
          return m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
        };

        const dateStr = findField('Date');
        const venue = findField('Venue');
        const city = findField('City') || findField('Location');

        let date = '';
        if (dateStr) {
          const dateMatch = dateStr.match(/(\\w+)\\s+(\\d+)[–-]?\\d*,\\s*(\\d{4})/);
          if (dateMatch) {
            const months = { 'January':'01','February':'02','March':'03','April':'04','May':'05','June':'06','July':'07','August':'08','September':'09','October':'10','November':'11','December':'12' };
            const mon = months[dateMatch[1]];
            if (mon) date = `${dateMatch[3]}-${mon}-${dateMatch[2].padStart(2,'0')}`;
          }
        }

        const eventName = title.replace(/_/g, ' ').replace(/\\(2026\\)/g, '').trim();
        if (existingNames.has(eventName.toLowerCase())) continue;

        await this.createEvent({
          source: 'wikipedia',
          source_id: 'wiki_upcoming_' + json.parse.pageid,
          url: 'https://en.wikipedia.org/wiki/' + ev.search.replace(/_/g, '_'),
          name: `${ev.promo} ${eventName}`,
          promotion: ev.promo,
          date,
          venue,
          location: city,
          event_type: ev.type
        });
        totalImported++;
      } catch (err) {
        console.warn('[DashboardStore] Wikipedia upcoming fetch error for', ev.search, err.message);
      }
      await new Promise(r => setTimeout(r, 150));
    }

    return { count: totalImported };
  },

  // ── Bulk / Export / Import ──
  async importMany(events, matches) {
    const imported = { events:0, matches:0, skipped:0 };
    for (const e of (events||[])) {
      try {
        if (e.source && e.source_id) {
          const ex = await this.findBySourceId('events', e.source, e.source_id);
          if (ex) { imported.skipped++; continue; }
        }
        await this.createEvent(e);
        imported.events++;
      } catch { imported.skipped++; }
    }
    for (const m of (matches||[])) {
      try {
        if (m.source && m.source_id) {
          const ex = await this.findBySourceId('matches', m.source, m.source_id);
          if (ex) { imported.skipped++; continue; }
        }
        await this.createMatch(m);
        imported.matches++;
      } catch { imported.skipped++; }
    }
    return imported;
  },

  async findBySourceId(storeName, source, sourceId) {
    const store = this._openStore(storeName, 'readonly');
    const index = store.index('source');
    return new Promise(r => {
      const q = index.getAll(source);
      q.onsuccess = () => r((q.result||[]).find(x => x.source_id === sourceId) || null);
      q.onerror = () => r(null);
    });
  },

  async exportAll() {
    const events = await this.getAllEvents();
    const matches = await this.getAllMatches();
    return { format: 'wrestling-dashboard-v1', exported: new Date().toISOString(), stats: { events: events.length, matches: matches.length }, events, matches };
  },
  async exportEvents() {
    const events = await this.getAllEvents();
    return { format: 'wrestling-dashboard-events-v1', exported: new Date().toISOString(), events };
  },
  async exportMatches() {
    const matches = await this.getAllMatches();
    return { format: 'wrestling-dashboard-matches-v1', exported: new Date().toISOString(), matches };
  },

  async importFromFile(json) {
    if (json.format === 'wrestling-dashboard-v1' || json.events || json.matches) return this.importMany(json.events||[], json.matches||[]);
    if (json.format === 'wrestling-dashboard-events-v1') return this.importMany(json.events||[], []);
    if (json.format === 'wrestling-dashboard-matches-v1') return this.importMany([], json.matches||[]);
    throw new Error('Unrecognised format. Use the export format from this dashboard.');
  },

  async clearAll() {
    for (const name of ['events','matches','meta']) {
      try {
        const store = this._openStore(name, 'readwrite');
        await new Promise(r => { const q = store.clear(); q.onsuccess = () => r(); q.onerror = () => r(); });
      } catch {}
    }
  },

  // ── Cagematch Import ──
  async importFromCagematch(apiKey, endpoint, params) {
    const baseUrl = 'https://api.parse.bot/scraper/55c28715-08ab-4cda-9439-735e8c8c302e';
    const url = `${baseUrl}/${endpoint}?${new URLSearchParams(params)}`;
    const res = await fetch(url, { headers: { 'X-API-Key': apiKey } });
    if (!res.ok) throw new Error(`Cagematch API error: ${res.status}`);
    return res.json();
  },

  // ── Cagematch Event Search & Details (for event detail modal) ──
  async searchCagematchEvent(eventName, apiKey) {
    const data = await this.importFromCagematch(apiKey, 'search_events', { query: eventName, offset: 0 });
    return data?.data?.results || [];
  },

  async getCagematchEventDetails(eventId, apiKey) {
    const data = await this.importFromCagematch(apiKey, 'get_event_details', { id: eventId });
    return data?.data || null;
  },

  getCagematchApiKey() {
    try {
      const raw = localStorage.getItem('dashSettings');
      if (raw) {
        const s = JSON.parse(raw);
        return s.cagematchKey || '';
      }
    } catch {}
    return '';
  }
};
