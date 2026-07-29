// ── Dashboard Store — Match & Event Database (IndexedDB) ──
// Consistent data model for cross-source import/export
// Version 1.0 — Universal wrestling data format
// ======================================================

const DashboardStore = {
  DB_NAME: 'WrestlingDashboardDB',
  DB_VERSION: 1,
  db: null,

  // ── Data Schema (Universal Format) ──
  // MATCH:
  //   id, source, source_id, event_id, event_name, promotion, date,
  //   match_type, stipulation, participants[], winner, result_type,
  //   rating, won_rating, title_match, title_name, notes
  //
  // EVENT:
  //   id, source, source_id, name, promotion, date, venue, location,
  //   attendance, event_type, rating, match_ids[]

  async ready() {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id' });
          eventStore.createIndex('promotion', 'promotion', { unique: false });
          eventStore.createIndex('date', 'date', { unique: false });
          eventStore.createIndex('source', 'source', { unique: false });
        }
        if (!db.objectStoreNames.contains('matches')) {
          const matchStore = db.createObjectStore('matches', { keyPath: 'id' });
          matchStore.createIndex('promotion', 'promotion', { unique: false });
          matchStore.createIndex('date', 'date', { unique: false });
          matchStore.createIndex('event_id', 'event_id', { unique: false });
          matchStore.createIndex('source', 'source', { unique: false });
          matchStore.createIndex('participants', 'participants', { unique: false, multiEntry: true });
        }
      };
      req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  // ── Helpers ──
  _generateId() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); },
  _openStore(name, mode) {
    const tx = this.db.transaction(name, mode);
    return tx.objectStore(name);
  },
  _normaliseDate(d) {
    if (!d) return '';
    // Accept YYYY-MM-DD, DD.MM.YYYY, "2026-07-29", or Date objects
    if (d instanceof Date) return d.toISOString().split('T')[0];
    if (typeof d === 'string' && d.includes('.')) {
      const parts = d.split('.');
      if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    }
    if (typeof d === 'string' && d.includes('/')) {
      const parts = d.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
    }
    return String(d).trim();
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
      match_ids: data.match_ids || [],
      created: Date.now()
    };
    if (!event.name) throw new Error('Event name is required');
    const store = this._openStore('events', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.add(event);
      req.onsuccess = () => resolve(event);
      req.onerror = () => reject(req.error);
    });
  },

  async updateEvent(id, data) {
    const existing = await this.getEvent(id);
    if (!existing) throw new Error('Event not found');
    Object.assign(existing, data);
    // Re-normalise date if changed
    if (data.date) existing.date = this._normaliseDate(data.date);
    existing.updated = Date.now();
    const store = this._openStore('events', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(existing);
      req.onsuccess = () => resolve(existing);
      req.onerror = () => reject(req.error);
    });
  },

  async getEvent(id) {
    const store = this._openStore('events', 'readonly');
    return new Promise((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  },

  async getAllEvents() {
    const store = this._openStore('events', 'readonly');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  },

  async deleteEvent(id) {
    // Also delete all matches associated with this event
    const matches = await this.getMatchesForEvent(id);
    for (const match of matches) await this.deleteMatch(match.id);
    const store = this._openStore('events', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getMatchesForEvent(eventId) {
    const store = this._openStore('matches', 'readonly');
    const index = store.index('event_id');
    return new Promise((resolve) => {
      const req = index.getAll(eventId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  },

  // ── Matches CRUD ──
  async createMatch(data) {
    const match = {
      id: this._generateId(),
      source: data.source || 'manual',
      source_id: data.source_id || '',
      event_id: data.event_id || '',
      event_name: (data.event_name || '').trim(),
      promotion: (data.promotion || '').trim(),
      date: this._normaliseDate(data.date),
      match_type: (data.match_type || 'Singles').trim(),
      stipulation: (data.stipulation || '').trim(),
      participants: Array.isArray(data.participants) ? data.participants.map(p => String(p).trim()).filter(Boolean) : [],
      winner: (data.winner || '').trim(),
      result_type: (data.result_type || '').trim(),
      rating: data.rating != null ? parseFloat(data.rating) : null,
      won_rating: data.won_rating != null ? parseFloat(data.won_rating) : null,
      title_match: !!data.title_match,
      title_name: (data.title_name || '').trim(),
      notes: (data.notes || '').trim(),
      created: Date.now()
    };
    if (!match.participants.length) throw new Error('At least one participant is required');
    const store = this._openStore('matches', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.add(match);
      req.onsuccess = () => resolve(match);
      req.onerror = () => reject(req.error);
    });
  },

  async updateMatch(id, data) {
    const existing = await this.getMatch(id);
    if (!existing) throw new Error('Match not found');
    Object.assign(existing, data);
    if (data.date) existing.date = this._normaliseDate(data.date);
    if (data.participants) existing.participants = data.participants.map(p => String(p).trim()).filter(Boolean);
    existing.updated = Date.now();
    const store = this._openStore('matches', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(existing);
      req.onsuccess = () => resolve(existing);
      req.onerror = () => reject(req.error);
    });
  },

  async getMatch(id) {
    const store = this._openStore('matches', 'readonly');
    return new Promise((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  },

  async getAllMatches() {
    const store = this._openStore('matches', 'readonly');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  },

  async deleteMatch(id) {
    const store = this._openStore('matches', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async searchMatches(query) {
    const all = await this.getAllMatches();
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(m =>
      m.participants.some(p => p.toLowerCase().includes(q)) ||
      m.event_name.toLowerCase().includes(q) ||
      m.promotion.toLowerCase().includes(q)
    );
  },

  // ── Bulk Operations ──
  async importMany(events, matches) {
    const imported = { events: 0, matches: 0, skipped: 0 };
    // Import events
    for (const e of (events || [])) {
      try {
        // Skip duplicates by source_id
        if (e.source && e.source_id) {
          const existing = await this.findBySourceId('events', e.source, e.source_id);
          if (existing) { imported.skipped++; continue; }
        }
        await this.createEvent(e);
        imported.events++;
      } catch (err) {
        console.warn('Skipped event:', e.name, err.message);
        imported.skipped++;
      }
    }
    // Import matches
    for (const m of (matches || [])) {
      try {
        if (m.source && m.source_id) {
          const existing = await this.findBySourceId('matches', m.source, m.source_id);
          if (existing) { imported.skipped++; continue; }
        }
        await this.createMatch(m);
        imported.matches++;
      } catch (err) {
        console.warn('Skipped match:', m.event_name, err.message);
        imported.skipped++;
      }
    }
    return imported;
  },

  async findBySourceId(storeName, source, sourceId) {
    const store = this._openStore(storeName, 'readonly');
    const index = store.index('source');
    return new Promise((resolve) => {
      const req = index.getAll(source);
      req.onsuccess = () => {
        const match = (req.result || []).find(r => r.source_id === sourceId);
        resolve(match || null);
      };
      req.onerror = () => resolve(null);
    });
  },

  async getUpcomingEvents() {
    const all = await this.getAllEvents();
    const today = new Date().toISOString().split('T')[0];
    return all.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  },

  async getUniquePromotions() {
    const events = await this.getAllEvents();
    const matches = await this.getAllMatches();
    const promos = new Set();
    events.forEach(e => e.promotion && promos.add(e.promotion));
    matches.forEach(m => m.promotion && promos.add(m.promotion));
    return Array.from(promos).sort();
  },

  // ── Export ──
  async exportAll() {
    const events = await this.getAllEvents();
    const matches = await this.getAllMatches();
    return {
      format: 'wrestling-dashboard-v1',
      exported: new Date().toISOString(),
      stats: { events: events.length, matches: matches.length },
      events,
      matches
    };
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
    // Validate format
    if (json.format === 'wrestling-dashboard-v1' || (json.events || json.matches)) {
      return this.importMany(json.events || [], json.matches || []);
    }
    if (json.format === 'wrestling-dashboard-events-v1') {
      return this.importMany(json.events || [], []);
    }
    if (json.format === 'wrestling-dashboard-matches-v1') {
      return this.importMany([], json.matches || []);
    }
    throw new Error('Unrecognised format. Use the export format from this dashboard.');
  },

  async clearAll() {
    // Clear both stores
    for (const name of ['events', 'matches']) {
      const store = this._openStore(name, 'readwrite');
      await new Promise((resolve) => {
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    }
  },

  // ── Cagematch Import (via Parse.bot API) ──
  async importFromCagematch(apiKey, endpoint, params) {
    const baseUrl = 'https://api.parse.bot/scraper/55c28715-08ab-4cda-9439-735e8c8c302e';
    const url = `${baseUrl}/${endpoint}?${new URLSearchParams(params)}`;
    const res = await fetch(url, {
      headers: { 'X-API-Key': apiKey }
    });
    if (!res.ok) throw new Error(`Cagematch API error: ${res.status} ${res.statusText}`);
    return res.json();
  },

  // ── OWDB Import ──
  async importFromOwdb(path) {
    const baseUrl = 'https://wrestlingdb.org';
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`OWDB error: ${res.status}`);
    return res.json();
  }
};
