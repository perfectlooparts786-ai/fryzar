/* =========================================================
   Rangoli — ui.js
   Gallery, palette, tools, drawers, theme, shortcuts.
   ========================================================= */

(function () {
  'use strict';

  const RG = window.RG;
  const NS = 'http://www.w3.org/2000/svg';
  const S = RG.store;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  S.load();

  const byId = new Map(RG.pages.map((p) => [p.id, p]));

  const els = {
    gallery: $('#gallery'),
    filters: $('#filters'),
    swatches: $('#swatches'),
    recent: $('#recent'),
    colorInput: $('#colorInput'),
    brushSize: $('#brushSize'),
    brushSizeVal: $('#brushSizeVal'),
    pageTitle: $('#pageTitle'),
    pageDiff: $('#pageDiff'),
    progressText: $('#progressText'),
    ring: $('#ringValue'),
    stage: $('#stage'),
    shell: $('#canvasShell'),
    svg: $('#artSvg'),
    undo: $('#btnUndo'),
    redo: $('#btnRedo'),
    zoomLabel: $('#btnZoomFit'),
    hint: $('#hint'),
    toasts: $('#toasts'),
    scrim: $('#scrim'),
    saveState: $('#saveState'),
    savePill: $('#savePill'),
    help: $('#helpDialog'),
    libraryCount: $('#libraryCount')
  };

  let current = byId.has(S.data.current) ? S.data.current : RG.pages[0].id;
  const fromHash = location.hash.slice(1);
  if (byId.has(fromHash)) current = fromHash;

  /* ------------------------------ theme ------------------------------ */

  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function effectiveTheme() {
    return S.data.theme || (media.matches ? 'dark' : 'light');
  }

  function applyTheme(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#121118' : '#f4f1ec');
    if (persist) S.setTheme(theme);
  }

  applyTheme(effectiveTheme(), false);
  media.addEventListener('change', () => {
    if (!S.data.theme) applyTheme(effectiveTheme(), false);
  });

  /* ------------------------------ editor ------------------------------ */

  const editor = new RG.Editor({
    svg: els.svg,
    stage: els.stage,
    shell: els.shell,
    callbacks: {
      onProgress(p) {
        els.progressText.textContent = p.pct + '%';
        els.ring.style.strokeDashoffset = String(97.4 * (1 - p.pct / 100));
        els.ring.style.strokeDasharray = '97.4';
      },
      onHistory(h) {
        els.undo.disabled = !h.canUndo;
        els.redo.disabled = !h.canRedo;
      },
      onZoom(z) {
        els.zoomLabel.textContent = Math.round(z * 100) + '%';
      },
      onChange() {
        markSaving();
        S.save();
        hideHint();
        scheduleThumb();
      }
    }
  });

  editor.setColor(S.data.color);
  editor.setSize(S.data.size);
  RG.editor = editor;

  /* ------------------------------ toast ------------------------------ */

  function toast(message, opts = {}) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg><span></span>';
    t.querySelector('span').textContent = message;

    let timer = 0;
    const dismiss = () => {
      clearTimeout(timer);
      t.classList.add('is-out');
      setTimeout(() => t.remove(), 250);
    };

    if (opts.action) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = opts.action;
      btn.addEventListener('click', () => {
        if (opts.onAction) opts.onAction();
        dismiss();
      });
      t.appendChild(btn);
    }

    while (els.toasts.children.length > 2) els.toasts.firstElementChild.remove();
    els.toasts.appendChild(t);
    timer = setTimeout(dismiss, opts.duration || 3200);
    return dismiss;
  }

  /* ------------------------------ save ------------------------------ */

  let savingTimer = 0;
  let thumbTimer = 0;

  function markSaving() {
    if (!els.savePill) return;
    els.savePill.classList.add('is-saving');
    els.saveState.textContent = 'Saving…';
    clearTimeout(savingTimer);
    savingTimer = setTimeout(() => {
      const ok = S.flush();
      els.savePill.classList.remove('is-saving');
      els.saveState.textContent = ok ? 'Saved locally' : 'Storage unavailable';
    }, 650);
  }

  function scheduleThumb() {
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(() => refreshThumb(current), 450);
  }

  /* ------------------------------ hint ------------------------------ */

  function hideHint() {
    if (!els.hint || els.hint.classList.contains('is-hidden')) return;
    els.hint.classList.add('is-hidden');
    S.data.hintSeen = true;
    S.save();
  }

  function showHint() {
    if (!els.hint || S.data.hintSeen) return;
    els.hint.classList.remove('is-hidden');
  }

  $('#hintClose').addEventListener('click', hideHint);

  /* ------------------------------ gallery ------------------------------ */

  function renderGallery() {
    els.gallery.textContent = '';
    RG.pages.forEach((page) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('role', 'listitem');
      card.dataset.page = page.id;

      const main = document.createElement('button');
      main.type = 'button';
      main.className = 'card-main';
      main.setAttribute('aria-label', 'Open ' + page.title);
      main.setAttribute('title', page.title + ' · ' + page.difficulty);
      main.innerHTML =
        '<span class="card-art"></span>' +
        '<span class="card-meta"><span class="card-title">' + page.title +
        '</span><span class="card-diff">' + page.difficulty + '</span></span>';

      const thumb = document.createElementNS(NS, 'svg');
      thumb.setAttribute('viewBox', '0 0 800 800');
      thumb.setAttribute('aria-hidden', 'true');
      $('.card-art', main).appendChild(thumb);
      RG.mountArt(thumb, page, S.page(page.id));

      const fav = document.createElement('button');
      fav.type = 'button';
      fav.className = 'fav';
      fav.setAttribute('aria-label', 'Favorite ' + page.title);
      fav.setAttribute('title', 'Favorite');
      fav.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-heart"/></svg>';

      main.addEventListener('click', () => openPage(page.id));
      fav.addEventListener('click', (e) => {
        e.stopPropagation();
        const added = S.toggleFav(page.id);
        syncFav(page.id);
        toast(added ? 'Added to favorites' : 'Removed from favorites');
        if (S.data.filter === 'fav') applyFilter();
      });

      card.appendChild(main);
      card.appendChild(fav);
      els.gallery.appendChild(card);
      syncCard(page.id);
      syncFav(page.id);
    });
    applyFilter();
    els.libraryCount.textContent = RG.pages.length + ' pages';
  }

  function syncCard(id) {
    const card = els.gallery.querySelector('.card[data-page="' + id + '"]');
    if (!card) return;
    const active = id === current;
    card.classList.toggle('is-active', active);
    const main = $('.card-main', card);
    if (active) main.setAttribute('aria-current', 'true');
    else main.removeAttribute('aria-current');
  }

  function syncFav(id) {
    const card = els.gallery.querySelector('.card[data-page="' + id + '"]');
    if (!card) return;
    const on = S.isFav(id);
    card.classList.toggle('is-fav', on);
    const fav = $('.fav', card);
    if (fav) {
      fav.setAttribute('aria-pressed', on ? 'true' : 'false');
      fav.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + 'favorite');
    }
  }

  function refreshThumb(id) {
    const card = els.gallery.querySelector('.card[data-page="' + id + '"]');
    if (!card) return;
    const svg = $('.card-art svg', card);
    if (svg) RG.mountArt(svg, byId.get(id), S.page(id));
  }

  function applyFilter() {
    const f = S.data.filter || 'all';
    let shown = 0;
    RG.pages.forEach((p) => {
      const card = els.gallery.querySelector('.card[data-page="' + p.id + '"]');
      if (!card) return;
      let show = true;
      if (f === 'fav') show = S.isFav(p.id);
      else if (f !== 'all') show = p.difficulty.toLowerCase() === f;
      card.style.display = show ? '' : 'none';
      if (show) shown++;
    });

    const empty = $('.gallery-empty', els.gallery);
    if (!shown) {
      if (!empty) {
        const d = document.createElement('div');
        d.className = 'gallery-empty';
        d.innerHTML = f === 'fav'
          ? '<strong>No favorites yet</strong>Tap the heart on a page to keep it close.'
          : '<strong>Nothing here</strong>Try a different filter.';
        els.gallery.appendChild(d);
      }
    } else if (empty) {
      empty.remove();
    }

    $$('.chip', els.filters).forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.filter === f);
    });
  }

  /* ------------------------------ page switch ------------------------------ */

  function openPage(id, opts) {
    if (!byId.has(id)) return;
    current = id;
    const page = byId.get(id);
    S.data.current = id;
    S.save();
    if (!opts || !opts.fromHash) {
      try { history.replaceState(null, '', '#' + id); } catch (err) { /* file:// safe */ }
    }

    editor.load(page, S.page(id));
    editor.setColor(S.data.color);
    editor.setSize(S.data.size);
    editor.setTool(S.data.tool);

    els.pageTitle.textContent = page.title;
    els.pageDiff.textContent = page.difficulty;
    document.title = page.title + ' · Rangoli';

    RG.pages.forEach((p) => syncCard(p.id));
    syncThumbOfActive();
    closeDrawers();

    const active = els.gallery.querySelector('.card.is-active');
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function syncThumbOfActive() { scheduleThumb(); }

  /* ------------------------------ palette ------------------------------ */

  function luminance(hex) {
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const r = parseInt(n.slice(0, 2), 16) / 255;
    const g = parseInt(n.slice(2, 4), 16) / 255;
    const b = parseInt(n.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function renderPalette() {
    els.swatches.textContent = '';
    S.palette.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.style.background = c;
      b.dataset.color = c;
      b.dataset.light = luminance(c) > 0.8 ? 'true' : 'false';
      b.setAttribute('aria-label', 'Color ' + c);
      b.setAttribute('title', c);
      b.addEventListener('click', () => setColor(c, true));
      els.swatches.appendChild(b);
    });
    syncSwatches();
  }

  function syncSwatches() {
    const c = editor.color.toLowerCase();
    $$('.swatch', els.swatches).forEach((b) => {
      b.classList.toggle('is-active', b.dataset.color.toLowerCase() === c);
    });
    els.colorInput.value = editor.color;
    const face = $('.custom-face');
    if (face) face.style.background = editor.color;
  }

  function renderRecent() {
    els.recent.textContent = '';
    if (!S.data.recent.length) {
      const span = document.createElement('span');
      span.className = 'empty';
      span.textContent = '—';
      els.recent.appendChild(span);
      return;
    }
    S.data.recent.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'recent-swatch';
      b.style.background = c;
      b.dataset.color = c;
      b.setAttribute('aria-label', 'Recent color ' + c);
      b.setAttribute('title', c);
      b.addEventListener('click', () => setColor(c, false));
      els.recent.appendChild(b);
    });
  }

  function setColor(color, remember) {
    editor.setColor(color);
    S.data.color = color;
    syncSwatches();
    if (remember) {
      S.pushRecent(color);
      renderRecent();
      S.save();
    }
  }

  /* ------------------------------ tools ------------------------------ */

  function setTool(tool) {
    editor.setTool(tool);
    S.data.tool = tool;
    S.save();
    $$('.tool[data-tool]').forEach((b) => {
      const on = b.dataset.tool === tool;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  $$('.tool[data-tool]').forEach((b) => {
    b.addEventListener('click', () => setTool(b.dataset.tool));
  });

  /* ------------------------------ controls ------------------------------ */

  els.undo.addEventListener('click', () => editor.undo());
  els.redo.addEventListener('click', () => editor.redo());

  $('#btnZoomIn').addEventListener('click', () => editor.zoomIn());
  $('#btnZoomOut').addEventListener('click', () => editor.zoomOut());
  els.zoomLabel.addEventListener('click', () => editor.fit());

  els.colorInput.addEventListener('input', (e) => setColor(e.target.value, false));
  els.colorInput.addEventListener('change', (e) => setColor(e.target.value, true));

  els.brushSize.addEventListener('input', (e) => {
    const v = Number(e.target.value);
    editor.setSize(v);
    els.brushSizeVal.textContent = v + ' px';
    S.data.size = v;
    S.save();
  });

  $('#btnRandom').addEventListener('click', () => {
    const pool = S.palette.filter((c) => c.toLowerCase() !== editor.color.toLowerCase());
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setColor(pick, true);
    toast('Surprise color applied');
  });

  $('#btnTheme').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
  });

  /* ------------------------------ actions ------------------------------ */

  const btnDownload = $('#btnDownload');
  const btnDownloadMobile = $('#btnDownloadMobile');

  async function download() {
    try {
      btnDownload.disabled = true;
      await editor.download();
      toast('PNG downloaded');
    } catch (err) {
      console.error(err);
      toast('Could not create the image');
    } finally {
      btnDownload.disabled = false;
    }
  }

  btnDownload.addEventListener('click', download);
  btnDownloadMobile.addEventListener('click', download);

  $('#btnPrint').addEventListener('click', () => {
    const ok = editor.print();
    if (!ok) toast('Allow pop-ups to print');
  });

  const btnShare = $('#btnShare');
  if (navigator.canShare) {
    btnShare.hidden = false;
    btnShare.addEventListener('click', async () => {
      const done = await editor.share();
      if (!done) toast('Sharing is not available here');
    });
  }

  $('#btnClear').addEventListener('click', () => {
    editor.clear();
    toast('Page cleared', {
      action: 'Undo',
      onAction: () => editor.undo(),
      duration: 6000
    });
  });

  $('#btnHelp').addEventListener('click', () => els.help.showModal());

  $$('[data-close-dialog]').forEach((b) => {
    b.addEventListener('click', () => b.closest('dialog').close());
  });

  els.help.addEventListener('click', (e) => {
    if (e.target === els.help) els.help.close();
  });

  /* ------------------------------ drawers ------------------------------ */

  function openDrawer(side) {
    closeDrawers();
    document.body.classList.add(side === 'left' ? 'drawer-left' : 'drawer-right');
    els.scrim.hidden = false;
    const btn = side === 'left' ? $('#btnOpenLibrary') : $('#btnOpenStudio');
    if (btn) btn.classList.add('is-active');
  }

  function closeDrawers() {
    document.body.classList.remove('drawer-left', 'drawer-right');
    els.scrim.hidden = true;
    $('#btnOpenLibrary').classList.remove('is-active');
    $('#btnOpenStudio').classList.remove('is-active');
  }

  $('#btnOpenLibrary').addEventListener('click', () => openDrawer('left'));
  $('#btnOpenStudio').addEventListener('click', () => openDrawer('right'));
  $('#btnCloseLibrary').addEventListener('click', closeDrawers);
  $('#btnCloseStudio').addEventListener('click', closeDrawers);
  els.scrim.addEventListener('click', closeDrawers);

  /* ------------------------------ keyboard ------------------------------ */

  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
    if (document.querySelector('dialog[open]')) return;

    const meta = e.ctrlKey || e.metaKey;

    if (meta && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) editor.redo();
      else editor.undo();
      return;
    }
    if (meta && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      editor.redo();
      return;
    }
    if (meta && e.key.toLowerCase() === 's') {
      e.preventDefault();
      download();
      return;
    }
    if (meta) return;

    switch (e.key.toLowerCase()) {
      case 'f': setTool('fill'); break;
      case 'b': setTool('brush'); break;
      case 'e': setTool('eraser'); break;
      case '+': case '=': editor.zoomIn(); break;
      case '-': case '_': editor.zoomOut(); break;
      case '0': editor.fit(); break;
      case '[': bumpBrush(-2); break;
      case ']': bumpBrush(2); break;
      case 'escape': closeDrawers(); break;
      default: break;
    }
  });

  function bumpBrush(delta) {
    const v = Math.max(4, Math.min(44, Number(els.brushSize.value) + delta));
    els.brushSize.value = String(v);
    els.brushSize.dispatchEvent(new Event('input'));
  }

  /* ------------------------------ init ------------------------------ */

  renderPalette();
  renderRecent();
  renderGallery();

  els.brushSize.value = String(S.data.size);
  els.brushSizeVal.textContent = S.data.size + ' px';

  $$('.chip', els.filters).forEach((chip) => {
    chip.addEventListener('click', () => {
      S.data.filter = chip.dataset.filter;
      S.save();
      applyFilter();
    });
  });

  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (byId.has(id) && id !== current) openPage(id, { fromHash: true });
  });

  setTool(S.data.tool || 'fill');
  setColor(S.data.color || '#ff7a59', false);
  openPage(current);
  applyFilter();

  if (!S.data.hintSeen) {
    setTimeout(showHint, 900);
    setTimeout(hideHint, 12000);
  }

  window.addEventListener('pagehide', () => S.flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') S.flush();
  });

  window.addEventListener('resize', () => {
    editor.layout();
    if (window.innerWidth > 1040) closeDrawers();
  });
})();
