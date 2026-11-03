const fs = require('fs');
const os = require('os');
const path = require('path');
global.window = {};
const root = path.join(__dirname, '..');
require(path.join(root, 'assets/js/art-basic.js'));
require(path.join(root, 'assets/js/art-detail.js'));
const RG = global.window.RG;
const outDir = path.join(os.tmpdir(), 'rangoli-check');
fs.mkdirSync(outDir, { recursive: true });
const report = [];
for (const p of RG.pages) {
  const inner = p.svg();
  const count = (inner.match(/<(path|circle|ellipse|rect|polygon)\b/g) || []).length;
  const xml = `<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><g fill="none" stroke="#2b2b33" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;
  fs.writeFileSync(path.join(outDir, p.id + '.svg'), xml, 'utf8');
  report.push(`${p.id.padEnd(14)} ${p.difficulty.padEnd(7)} shapes=${count}`);
}
console.log(report.join('\n'));
console.log('written to ' + outDir);
