/* =========================================================
   Rangoli — store.js
   Local state, persistence and palette data.
   ========================================================= */

(function () {
  'use strict';

  const RG = (window.RG = window.RG || {});
  const KEY = 'rangoli.v1';

  const PALETTE = [
    '#ef476f', '#ff7a59', '#f78c6b', '#ffb703', '#ffd166', '#f9e2ae',
    '#8ac926', '#06d6a0', '#2ec4b6', '#4cc9f0', '#3a86ff', '#4361ee',
    '#6c5ce7', '#8b7cf6', '#b5179e', '#f72585', '#cdb4db', '#ffc8dd',
    '#bde0fe', '#a2d2ff', '#90be6d', '#9d4edd', '#5a189a', '#3c096c',
    '#8d6e63', '#d8b08c', '#404040', '#ffffff'
  ];

  const DEFAULTS = {
    version: 1,
    current: 'butterfly',
    theme: null,          // null = follow system
    favs: [],
    color: '#ff7a59',
    size: 14,
    tool: 'fill',
    recent: [],
    filter: 'all',
    hintSeen: false,
    pages: {}             // { pageId: { fills: { index: color }, ink: [{d,c,w}] } }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  const Store = {
    key: KEY,
    palette: PALETTE,
    data: clone(DEFAULTS),
    _timer: 0,

    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!saved || typeof saved !== 'object') return;
        const next = clone(DEFAULTS);
        Object.keys(DEFAULTS).forEach((k) => {
          if (saved[k] !== undefined && saved[k] !== null) next[k] = saved[k];
        });
        if (!next.pages || typeof next.pages !== 'object') next.pages = {};
        if (!Array.isArray(next.favs)) next.favs = [];
        if (!Array.isArray(next.recent)) next.recent = [];
        this.data = next;
      } catch (err) {
        console.warn('Rangoli: could not read saved work.', err);
      }
    },

    save() {
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.flush(), 260);
    },

    flush() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
        return true;
      } catch (err) {
        console.warn('Rangoli: could not save (storage full or blocked).', err);
        return false;
      }
    },

    page(id) {
      if (!this.data.pages[id]) this.data.pages[id] = { fills: {}, ink: [] };
      const p = this.data.pages[id];
      if (!p.fills || typeof p.fills !== 'object') p.fills = {};
      if (!Array.isArray(p.ink)) p.ink = [];
      return p;
    },

    isFav(id) { return this.data.favs.indexOf(id) !== -1; },

    toggleFav(id) {
      const i = this.data.favs.indexOf(id);
      if (i === -1) this.data.favs.push(id);
      else this.data.favs.splice(i, 1);
      this.save();
      return i === -1;
    },

    pushRecent(color) {
      const color2 = String(color).toLowerCase();
      const list = this.data.recent.filter((c) => c.toLowerCase() !== color2);
      list.unshift(color);
      this.data.recent = list.slice(0, 8);
    },

    setTheme(theme) {
      this.data.theme = theme;
      this.save();
    },

    resetPage(id) {
      this.data.pages[id] = { fills: {}, ink: [] };
      this.save();
    },

    hasWork(id) {
      const p = this.data.pages[id];
      if (!p) return false;
      return Object.keys(p.fills || {}).length > 0 || (p.ink || []).length > 0;
    }
  };

  RG.store = Store;
})();
