// ── Dashboard Store — Match & Event Database (IndexedDB) ──
// v1.1 — Universal wrestling data format + auto-population
// ======================================================

const DashboardStore = {
  DB_NAME: 'WrestlingDashboardDB',
  DB_VERSION: 2,
  db: null,
  CACHE_TTL_MS: 6 * 60 * 60 * 1000, // 6 hours

  // ── Data Schema ──
  // EVENT: id, source, source_id, name, promotion, date, venue, location,
  //        attendance, event_type, rating, match_ids[], image_url, description
  // MATCH: id, source, source_id, event_id, event_name, promotion, date,
  //        match_type, stipulation, participants[], winner, result_type,
  //        rating, won_rating, title_match, title_name, notes

  // ── Seed Data: Upcoming Major Events (Aug–Oct 2026) ──
  // Auto-populated on first visit. Updated silently from Wikipedia API.
  get SEED_EVENTS() {
    const today = new Date().toISOString().split('T')[0];
    return [
      { name: 'SummerSlam', promotion: 'WWE', date: '2026-08-01', venue: 'U.S. Bank Stadium', location: 'Minneapolis, MN', event_type: 'PPV', source: 'seed' },
      { name: 'AEW Dynamite — 2026-08-05', promotion: 'All Elite Wrestling', date: '2026-08-05', event_type: 'TV', source: 'seed' },
      { name: 'AEW Dynamite — 2026-08-12', promotion: 'All Elite Wrestling', date: '2026-08-12', event_type: 'TV', source: 'seed' },
      { name: 'NXT Heatwave', promotion: 'WWE', date: '2026-08-09', event_type: 'PPV', source: 'seed' },
      { name: 'TNA Lockdown', promotion: 'Total Nonstop Action Wrestling', date: '2026-08-23', event_type: 'PPV', source: 'seed' },
      { name: 'AEW All In', promotion: 'All Elite Wrestling', date: '2026-08-30', location: 'London, England', event_type: 'PPV', source: 'seed' },
      { name: 'AEW Dynamite — 2026-09-02', promotion: 'All Elite Wrestling', date: '2026-09-02', event_type: 'TV', source: 'seed' },
      { name: 'NXT No Mercy', promotion: 'WWE', date: '2026-09-06', event_type: 'PPV', source: 'seed' },
      { name: 'WWE Money in the Bank', promotion: 'WWE', date: '2026-09-07', event_type: 'PPV', source: 'seed' },
      { name: 'AEW Grand Slam', promotion: 'All Elite Wrestling', date: '2026-09-15', event_type: 'PPV', source: 'seed' },
      { name: 'NXT Halloween Havoc', promotion: 'WWE', date: '2026-10-04', event_type: 'PPV', source: 'seed' },
      { name: 'WWE Bad Blood', promotion: 'WWE', date: '2026-10-11', event_type: 'PPV', source: 'seed' },
      { name: 'TNA Bound for Glory', promotion: 'Total Nonstop Action Wrestling', date: '2026-10-11', event_type: 'PPV', source: 'seed' },
      { name: 'AEW WrestleDream', promotion: 'All Elite Wrestling', date: '2026-10-18', event_type: 'PPV', source: 'seed' },
      { name: 'WWE Crown Jewel', promotion: 'WWE', date: '2026-10-31', location: 'Riyadh, Saudi Arabia', event_type: 'PPV', source: 'seed' },
    ].filter(e => e.date >= today).slice(0, 12);
  },

  // ── DB Init ──
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
          // v2: add image_url, description, last_fetched to events
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
      notes: (data.notes || '').trim(), created: Date.now()
    };
    if (!match.participants.length) throw new Error('At least one participant is required');
    const store = this._openStore('matches', 'readwrite');
    return new Promise((resolve, reject) => { const r = store.add(match); r.onsuccess = () => resolve(match); r.onerror = () => reject(r.error); });
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
    return all.filter(e => e.date < today && e.date).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 10);
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

    // Fallback to seed data
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
      return { source: 'seed', count: imported };
    }
    return { source: 'existing', count: existing.length };
  },

  // ── Wikipedia API Fetcher ──
  // Searches for upcoming major wrestling events and parses infoboxes
  async _fetchFromWikipedia() {
    const promotions = ['WWE', 'AEW', 'TNA'];
    const queries = promotions.map(p => `2026 ${p} events`);
    let totalImported = 0;

    // Check what we already have to avoid duplicates
    const existing = await this.getAllEvents();
    const existingNames = new Set(existing.map(e => e.name.toLowerCase()));

    // Known upcoming events to enrich from Wikipedia
    const knownEvents = [
      { search: 'SummerSlam (2026)', promo: 'WWE', type: 'PPV' },
      { search: 'NXT_Heatwave_(2026)', promo: 'WWE', type: 'PPV' },
      { search: 'Money_in_the_Bank_(2026)', promo: 'WWE', type: 'PPV' },
      { search: 'Saturday_Night%27s_Main_Event_%E2%80%93_2026-07-18', promo: 'WWE', type: 'Special' },
    ];

    for (const ev of knownEvents) {
      try {
        const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${ev.search}&prop=text&section=0&format=json&origin=*`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const json = await resp.json();
        if (!json.parse?.text?.['*']) continue;

        const html = json.parse.text['*'];
        const title = json.parse.title || '';

        // Extract infobox data using regex
        const findField = (label) => {
          const re = new RegExp(label + '\\s*<td[^>]*>([\\s\\S]*?)<\\/td>', 'i');
          const m = html.match(re);
          if (!m) return '';
          return m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
        };

        const dateStr = findField('Date');
        const venue = findField('Venue');
        const city = findField('City') || findField('Location');

        // Parse date
        let date = '';
        if (dateStr) {
          // Try "August 1–2, 2026" format → "2026-08-01"
          const dateMatch = dateStr.match(/(\w+)\s+(\d+)[–-]?\d*,\s*(\d{4})/);
          if (dateMatch) {
            const months = { 'January':'01','February':'02','March':'03','April':'04','May':'05','June':'06','July':'07','August':'08','September':'09','October':'10','November':'11','December':'12' };
            const mon = months[dateMatch[1]];
            if (mon) date = `${dateMatch[3]}-${mon}-${dateMatch[2].padStart(2,'0')}`;
          }
        }

        const eventName = title.replace(/_/g, ' ').replace(/\(2026\)/g, '').trim();
        const nameLower = eventName.toLowerCase();

        // Skip if we already have this event
        if (existingNames.has(nameLower)) continue;

        await this.createEvent({
          source: 'wikipedia',
          source_id: `wiki_${json.parse.pageid}`,
          name: `WWE ${eventName}`,
          promotion: ev.promo,
          date,
          venue,
          location: city,
          event_type: ev.type
        });
        totalImported++;
      } catch (err) {
        console.warn('[DashboardStore] Wikipedia fetch error for', ev.search, err.message);
      }
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
  }
};
