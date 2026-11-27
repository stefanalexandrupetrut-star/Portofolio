// Dump geometry for many bittings so Python (shapely, trimesh, ezdxf) can audit it independently.
// usage: node dump_geom.js <app.html> <out.json> [seed]
// The geometry engine and the key database are read straight out of the app's HTML, so the audit runs on the shipped code.
const fs = require('fs'), vm = require('vm');
const [htmlPath, outPath, seedArg] = process.argv.slice(2);
if (!htmlPath || !outPath) { console.error('usage: node dump_geom.js <app.html> <out.json> [seed]'); process.exit(1); }
const html = fs.readFileSync(htmlPath, 'utf8');
const kt = html.match(/const KEY_TYPES = (\{[\s\S]*?\n\});/)[1];
// the engine is the block between the "KEY GEOMETRY" and "RENDER KEY SVG" banners (each banner has a rule line above it)
const lineStart = i => html.lastIndexOf('\n', i) + 1;
const bannerRule = text => lineStart(lineStart(html.indexOf(text)) - 1);
const src = html.slice(bannerRule('// KEY GEOMETRY'), bannerRule('// RENDER KEY SVG'));
const ctx = {}; vm.createContext(ctx);
vm.runInContext(`const KEY_TYPES = ${kt};\n${src}\nthis.api = {KEY_TYPES, keyContour, keyHole, buildPath, buildSTL, buildDXF, flattenContour, holeRing, triangulate, cleanBits, keyBounds, cutDepth, flankRun, pinCenters, TIPS, CUT};`, ctx);
const A = ctx.api;
let seed = Number(seedArg || 7);
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const out = { keys: {}, consts: { CUT: A.CUT } };
for (const [code, k] of Object.entries(A.KEY_TYPES)) {
  const lo = k.cutMin, hi = k.cutMax, n = k.pinCount;
  const vs = { preset: k.presets[0].b.slice(0, n), 'all-min': Array(n).fill(lo), 'all-max': Array(n).fill(hi),
    'alt-min-max': Array.from({length: n}, (_, i) => i % 2 ? hi : lo), 'alt-max-min': Array.from({length: n}, (_, i) => i % 2 ? lo : hi),
    staircase: Array.from({length: n}, (_, i) => Math.round(lo + (hi - lo) * i / Math.max(1, n - 1))) };
  for (let i = 0; i < 120; i++) vs['rand' + i] = Array.from({length: n}, () => lo + Math.floor(rnd() * (hi - lo + 1)));
  // hostile inputs: the page only ever passes clean ints, but the engine should not fall over
  vs['bad-nan'] = Array(n).fill(NaN); vs['bad-range'] = Array(n).fill(999); vs['bad-short'] = [hi]; vs['bad-neg'] = Array(n).fill(-50);
  const rec = { k, cases: {} };
  for (const [name, bits] of Object.entries(vs)) {
    const clean = A.cleanBits(k, bits);
    const c = A.keyContour(k, bits), hole = A.keyHole(k);
    const stl = A.buildSTL(k, bits), dxf = A.buildDXF(k, bits);
    const slim = (name === 'preset' || name.startsWith('bad') || name === 'all-min' || name === 'all-max' || name === 'alt-min-max' || name.startsWith('rand0') || name.startsWith('rand1'));
    rec.cases[name] = { bits: clean, outer: A.flattenContour(c), hole, centers: A.pinCenters(k, clean), depths: clean.map(b => A.cutDepth(k, b)), d: A.buildPath(k, bits),
      stl: Buffer.from(stl).toString('base64'), dxf: slim ? dxf : null, nseg: c.segs.length };
  }
  rec.bounds = A.keyBounds(k); rec.run = A.flankRun(k); rec.tip = A.TIPS[k.tipStyle] || A.TIPS.flat;
  out.keys[code] = rec;
}
fs.writeFileSync(outPath, JSON.stringify(out));
console.log('dumped', Object.keys(out.keys).length, 'keys,', Object.keys(out.keys.SC1.cases).length, 'cases each');
