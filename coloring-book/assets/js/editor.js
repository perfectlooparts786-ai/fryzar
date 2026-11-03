/* =========================================================
   Rangoli — editor.js
   SVG mount, fill/brush/eraser tools, history, zoom, export.
   ========================================================= */

(function () {
  'use strict';

  const RG = (window.RG = window.RG || {});
  const NS = 'http://www.w3.org/2000/svg';
  const LINE = '#2b2b33';
  const PAPER = '#ffffff';
  const MAX_HISTORY = 60;

  const isWhite = (c) => {
    const v = String(c || '').toLowerCase().replace(/\s+/g, '');
    return !v || v === '#fff' || v === '#ffffff' || v === 'rgb(255,255,255)' || v === 'white';
  };
  let mountId = 0;

  function scopeIds(root, prefix) {
    const map = new Map();
    root.querySelectorAll('[id]').forEach((el) => {
      const old = el.getAttribute('id');
      const next = `${prefix}-${old}`;
      map.set(old, next);
      el.setAttribute('id', next);
    });
    if (!map.size) return;
    root.querySelectorAll('*').forEach((el) => {
      ['clip-path', 'fill', 'mask', 'filter'].forEach((attr) => {
        const v = el.getAttribute(attr);
        if (v && v.indexOf('url(#') !== -1) {
          el.setAttribute(
            attr,
            v.replace(/url\(#([^)]+)\)/g, (m, id) => `url(#${map.get(id) || id})`)
          );
        }
      });
    });
  }

  function mount(svgEl, page, data) {
    svgEl.innerHTML = '';
    svgEl.setAttribute('viewBox', '0 0 800 800');

    const art = document.createElementNS(NS, 'g');
    art.setAttribute('class', 'art-root');
    art.setAttribute('fill', 'none');
    art.setAttribute('stroke', LINE);
    art.setAttribute('stroke-width', '3.2');
    art.setAttribute('stroke-linejoin', 'round');
    art.setAttribute('stroke-linecap', 'round');
    art.innerHTML = page.svg();

    const ink = document.createElementNS(NS, 'g');
    ink.setAttribute('class', 'ink-layer');
    ink.setAttribute('fill', 'none');
    ink.setAttribute('stroke-linecap', 'round');
    ink.setAttribute('stroke-linejoin', 'round');

    svgEl.appendChild(art);
    svgEl.appendChild(ink);

    scopeIds(art, page.id + '-' + (++mountId));

    const regions = [];
    art.querySelectorAll('path, circle, ellipse, rect, polygon, polyline, line').forEach((el) => {
      if (el.closest('defs') || el.classList.contains('ln')) return;
      el.classList.add('region');
      el.setAttribute('data-i', String(regions.length + 1));
      regions.push(el);
    });

    paintFills(regions, data.fills || {});
    paintInk(ink, data.ink || []);

    return { art, ink, regions };
  }

  function paintFills(regions, fills) {
    regions.forEach((el) => {
      const c = fills[el.getAttribute('data-i')];
      el.style.fill = c || PAPER;
    });
  }

  function paintInk(layer, strokes) {
    layer.textContent = '';
    strokes.forEach((s) => {
      if (!s || !s.d) return;
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', s.d);
      p.setAttribute('stroke', s.c || LINE);
      p.setAttribute('stroke-width', String(s.w || 12));
      p.setAttribute('class', 'ink');
      layer.appendChild(p);
    });
  }

  function smoothPath(pts) {
    if (!pts.length) return '';
    if (pts.length === 1) {
      const [x, y] = pts[0];
      return `M${x} ${y} L${x + 0.1} ${y + 0.1}`;
    }
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      d += ` Q${x0} ${y0} ${((x0 + x1) / 2).toFixed(2)} ${((y0 + y1) / 2).toFixed(2)}`;
    }
    return d;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function cloneState(s) {
    return {
      fills: Object.assign({}, s.fills),
      ink: s.ink.map((x) => ({ d: x.d, c: x.c, w: x.w }))
    };
  }

  class Editor {
    constructor(opts) {
      this.svg = opts.svg;
      this.stage = opts.stage;
      this.shell = opts.shell;
      this.cb = opts.callbacks || {};
      this.page = null;
      this.data = null;
      this.regions = [];
      this.ink = null;
      this.tool = 'fill';
      this.color = '#ff7a59';
      this.size = 14;
      this.zoom = 1;
      this.base = 600;
      this.history = [];
      this.cursor = -1;
      this.drawing = false;
      this.erasing = false;
      this.stroke = null;
      this.dirty = false;
      this._raf = 0;

      this.stage.dataset.tool = this.tool;
      this.bind();
    }

    /* ------------------------------ mount ------------------------------ */

    load(page, data, opts = {}) {
      this.page = page;
      this.data = data;
      const mounted = mount(this.svg, page, data);
      this.art = mounted.art;
      this.ink = mounted.ink;
      this.regions = mounted.regions;

      this.zoom = 1;
      if (!opts.keepHistory) {
        this.history = [this.snapshot()];
        this.cursor = 0;
      }
      this.layout();
      this.emitHistory();
      this.emitProgress();
    }

    reload() {
      if (this.page) this.load(this.page, this.data, { keepHistory: true });
    }

    layout() {
      cancelAnimationFrame(this._raf);
      this._raf = requestAnimationFrame(() => {
        const st = this.stage;
        const cs = getComputedStyle(st);
        const availW = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const availH = st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        this.base = Math.max(160, Math.min(availW, availH));
        this.applySize();
      });
    }

    applySize() {
      const size = Math.round(this.base * this.zoom);
      this.shell.style.width = size + 'px';
      this.shell.style.height = size + 'px';
      if (this.cb.onZoom) this.cb.onZoom(this.zoom);
    }

    /* ------------------------------ tools ------------------------------ */

    setTool(tool) {
      this.tool = tool;
      this.stage.dataset.tool = tool;
    }

    setColor(color) { this.color = color; }
    setSize(size) { this.size = Math.max(2, Math.min(64, Number(size) || 14)); }

    /* ------------------------------ history ------------------------------ */

    snapshot() {
      return {
        fills: Object.assign({}, this.data ? this.data.fills : {}),
        ink: this.ink
          ? Array.from(this.ink.children).map((p) => ({
              d: p.getAttribute('d'),
              c: p.getAttribute('stroke'),
              w: p.getAttribute('stroke-width')
            }))
          : []
      };
    }

    pushHistory() {
      const snap = this.snapshot();
      this.history = this.history.slice(0, this.cursor + 1);
      this.history.push(snap);
      if (this.history.length > MAX_HISTORY) this.history.shift();
      this.cursor = this.history.length - 1;
      this.emitHistory();
    }

    emitHistory() {
      if (this.cb.onHistory) {
        this.cb.onHistory({ canUndo: this.cursor > 0, canRedo: this.cursor < this.history.length - 1 });
      }
    }

    emitProgress() {
      if (!this.cb.onProgress) return;
      const total = this.regions.length || 1;
      const done = this.regions.filter((el) => !isWhite(el.style.fill)).length;
      this.cb.onProgress({ done, total, pct: Math.round((done / total) * 100) });
    }

    commit() {
      this.pushHistory();
      this.data.ink = Array.from(this.ink.children).map((p) => ({
        d: p.getAttribute('d'),
        c: p.getAttribute('stroke'),
        w: p.getAttribute('stroke-width')
      }));
      if (this.cb.onChange) this.cb.onChange(this.data);
      this.emitProgress();
    }

    applySnapshot(snap) {
      this.data.fills = Object.assign({}, snap.fills);
      paintFills(this.regions, this.data.fills);
      this.data.ink = snap.ink.map((x) => ({ d: x.d, c: x.c, w: x.w }));
      paintInk(this.ink, this.data.ink);
      if (this.cb.onChange) this.cb.onChange(this.data);
      this.emitProgress();
    }

    undo() {
      if (this.cursor <= 0) return false;
      this.cursor--;
      this.applySnapshot(this.history[this.cursor]);
      this.emitHistory();
      return true;
    }

    redo() {
      if (this.cursor >= this.history.length - 1) return false;
      this.cursor++;
      this.applySnapshot(this.history[this.cursor]);
      this.emitHistory();
      return true;
    }

    clear() {
      this.data.fills = {};
      this.data.ink = [];
      paintFills(this.regions, {});
      paintInk(this.ink, []);
      this.commit();
    }

    /* ------------------------------ zoom ------------------------------ */

    setZoom(z) {
      this.zoom = Math.max(0.5, Math.min(3, z));
      this.applySize();
    }

    zoomIn() { this.setZoom(this.zoom + 0.25); }
    zoomOut() { this.setZoom(this.zoom - 0.25); }
    fit() { this.setZoom(1); }

    /* ------------------------------ pointer ------------------------------ */

    toSvg(e) {
      const pt = this.svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const m = this.svg.getScreenCTM();
      if (!m) return { x: 0, y: 0 };
      const p = pt.matrixTransform(m.inverse());
      return { x: p.x, y: p.y };
    }

    bind() {
      const svg = this.svg;

      svg.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (this.tool === 'fill') {
          const region = e.target.closest ? e.target.closest('.region') : null;
          if (region) {
            e.preventDefault();
            this.fill(region);
          }
          return;
        }
        if (this.tool === 'brush') {
          e.preventDefault();
          this.startStroke(e);
          return;
        }
        if (this.tool === 'eraser') {
          e.preventDefault();
          this.erasing = true;
          this.dirty = false;
          try { svg.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
          this.eraseAt(e);
        }
      });

      svg.addEventListener('pointermove', (e) => {
        if (this.drawing) {
          e.preventDefault();
          this.extendStroke(e);
        } else if (this.erasing) {
          this.eraseAt(e);
        }
      });

      const end = (e) => {
        if (this.drawing) this.endStroke();
        if (this.erasing) {
          this.erasing = false;
          if (this.dirty) this.commit();
        }
        if (e && e.pointerId !== undefined) {
          try { svg.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
        }
      };
      svg.addEventListener('pointerup', end);
      svg.addEventListener('pointercancel', end);

      svg.addEventListener('wheel', (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        this.setZoom(this.zoom + (e.deltaY > 0 ? -0.15 : 0.15));
      }, { passive: false });

      const ro = new ResizeObserver(() => this.layout());
      ro.observe(this.stage);
      this._ro = ro;
    }

    fill(el) {
      const i = el.getAttribute('data-i');
      if (!i) return;
      const prev = this.data.fills[i];
      if (prev && prev.toLowerCase() === this.color.toLowerCase()) return;
      this.data.fills[i] = this.color;
      el.style.fill = this.color;
      if (el.animate) {
        el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
      }
      this.commit();
    }

    startStroke(e) {
      this.drawing = true;
      this.dirty = true;
      this.svg.classList.add('is-drawing');
      try { this.svg.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      const p = this.toSvg(e);
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('stroke', this.color);
      path.setAttribute('stroke-width', String(this.size));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('class', 'ink');
      path.setAttribute('d', smoothPath([[p.x, p.y]]));
      this.ink.appendChild(path);
      this.stroke = { path, pts: [[p.x, p.y]] };
      this._historyDirty = false;
    }

    extendStroke(e) {
      if (!this.stroke) return;
      const p = this.toSvg(e);
      const pts = this.stroke.pts;
      const last = pts[pts.length - 1];
      const dx = p.x - last[0];
      const dy = p.y - last[1];
      if (dx * dx + dy * dy < 2.25) return;
      pts.push([p.x, p.y]);
      this.stroke.path.setAttribute('d', smoothPath(pts));
    }

    endStroke() {
      this.drawing = false;
      this.svg.classList.remove('is-drawing');
      if (this.stroke) {
        this.stroke = null;
        this.commit();
      }
    }

    eraseAt(e) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || !el.classList || !el.classList.contains('ink')) return;
      el.remove();
      this.dirty = true;
    }

    /* ------------------------------ export ------------------------------ */

    serialize() {
      const clone = this.svg.cloneNode(true);
      clone.setAttribute('xmlns', NS);
      clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      clone.setAttribute('viewBox', '0 0 800 800');
      clone.setAttribute('width', '800');
      clone.setAttribute('height', '800');
      return new XMLSerializer().serializeToString(clone);
    }

    toBlob(size = 1800) {
      const svgString = this.serialize();
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      return loadImage(url)
        .then((img) => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        })
        .catch((err) => {
          URL.revokeObjectURL(url);
          throw err;
        });
    }

    filename() {
      const name = this.page ? this.page.id : 'rangoli';
      return `rangoli-${name}.png`;
    }

    async download() {
      const blob = await this.toBlob(1800);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.filename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    async share() {
      if (!navigator.canShare) return false;
      const blob = await this.toBlob(1400);
      if (!blob) return false;
      const file = new File([blob], this.filename(), { type: 'image/png' });
      if (!navigator.canShare({ files: [file] })) return false;
      try {
        await navigator.share({ files: [file], title: this.page ? this.page.title : 'My coloring page' });
        return true;
      } catch (err) {
        return false;
      }
    }

    print() {
      const w = window.open('', '_blank');
      if (!w) return false;
      const svg = this.serialize();
      w.document.write(
        '<!doctype html><html><head><meta charset="utf-8"><title>' +
          (this.page ? this.page.title : 'Rangoli') +
          '</title><style>@page{margin:12mm}html,body{margin:0;padding:0;background:#fff}' +
          'svg{width:100%;height:auto;max-height:calc(100vh - 24mm);display:block}</style></head><body>' +
          svg +
          '</body></html>'
      );
      w.document.close();
      setTimeout(() => { w.focus(); w.print(); }, 350);
      return true;
    }
  }

  RG.Editor = Editor;
  RG.mountArt = mount;
  RG.paintFills = paintFills;
})();
