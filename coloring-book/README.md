# Rangoli — a calm coloring studio

A complete, professional coloring-book web app that runs entirely in the browser.
No build step, no server, no account, no tracking.

Designed and built as a static site: **open `index.html` and start coloring.**

---

## Run it

**Option 1 — just open the file**

Double-click `index.html` (works from `file://`). All artwork, styles and scripts are local.

**Option 2 — serve it (recommended for sharing)**

```bash
# any static server works
npx serve coloring-book
# or
python -m http.server 8080 --directory coloring-book
```

Then visit `http://localhost:8080`.

---

## What it does

- **11 hand-built coloring pages** — Butterfly Garden, Cozy Cat, Sky Balloon, Sweet Treat,
  Little Cottage, Flower Bouquet, Ocean Friends, Night Owl, Mandala Bloom, Leafy Wreath,
  Kaleidoscope. Every page is real SVG line art, so it stays crisp at any zoom level.
  Link straight to a page with the URL hash, e.g. `index.html#mandala`.
- **Fill, brush and eraser tools.** Tap a region to flood it with the active color; draw
  freehand with the brush; erase whole strokes with the eraser.
- **28-color curated palette** plus a free color picker and a recent-colors tray.
- **Undo / redo** with a 60-step history per page.
- **Zoom** from 50% to 300% — buttons, `Ctrl` + scroll, or keyboard.
- **Download a 1800 × 1800 PNG** or send the page to a printer.
- **Share** on devices that support the Web Share API.
- **Autosave.** Every fill, stroke and favorite is stored in `localStorage` and restored
  on your next visit — including gallery thumbnails that show your progress.
- **Favorites and filters** (easy / medium / detailed / favorites).
- **Dark and light themes** with system-preference detection.
- **Responsive by design:** three-column studio on desktop, drawers on tablet, a bottom
  sheet and quick-action bar on phones.
- **Accessible:** keyboard shortcuts, focus rings, ARIA labels, reduced-motion support,
  native `<dialog>` for help.

---

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `F` / `B` / `E` | Fill / Brush / Eraser |
| `Ctrl` + `Z` | Undo |
| `Ctrl` + `Shift` + `Z` | Redo |
| `+` / `−` | Zoom in / out |
| `0` | Reset zoom |
| `Ctrl` + `S` | Download PNG |
| `[` / `]` | Smaller / larger brush |

---

## Project layout

```
coloring-book/
├── index.html
├── assets/
│   ├── css/
│   │   ├── base.css        design tokens, shell, topbar, toolbar, dialogs
│   │   ├── studio.css      gallery, palette, panels, mobile bar
│   │   └── responsive.css  breakpoints, drawers, print styles
│   └── js/
│       ├── art-basic.js    artwork 1–6 + shared SVG helpers
│       ├── art-detail.js   artwork 7–11
│       ├── store.js        state, palette, localStorage persistence
│       ├── editor.js       SVG mount, tools, history, zoom, PNG export
│       └── ui.js           gallery, palette, drawers, theme, shortcuts
└── tools/
    └── build-preview.js    dev helper: exports every page as an SVG preview
```

---

## Customize it

**Change the palette** — edit `PALETTE` in `assets/js/store.js`.

**Add a coloring page** — add an object to `RG.pages`:

```js
page({
  id: 'my-page',
  title: 'My Page',
  difficulty: 'Easy',       // Easy | Medium | Hard
  category: 'Nature',
  svg() {
    return `<path d="..."/> <circle cx="400" cy="400" r="80"/>`;
  }
});
```

Any shape **without** `class="ln"` automatically becomes a clickable coloring region.
Shapes with `class="ln"` are decorative outlines. The canvas is always `0 0 800 800`.
Nothing else needs to change — the gallery, saving and export pick it up automatically.

**Rebrand** — the tokens at the top of `base.css` drive the whole look; the logo is an
inline SVG in `index.html`.

---

## Privacy

Everything lives in your browser. There is no backend, no analytics, no network request
except the optional Google Fonts stylesheet — remove that `<link>` if you want the site
to be 100% self-contained and offline-first.

---

## Browser support

Current Chrome, Edge, Safari and Firefox. The app uses SVG, Pointer Events,
`localStorage`, `ResizeObserver`, CSS custom properties and `color-mix` with fallbacks.
