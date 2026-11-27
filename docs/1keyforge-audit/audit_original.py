"""Audit of the ORIGINAL (v4) key-shape code, run against the unmodified file in real Chromium.

Everything is measured, not assumed: path geometry, STL mesh validity, DXF content, scaling in px/mm, cost per render.
usage: python audit_original.py <1KeyForge_4.original.html> <report.json>
"""
import io, json, re, random, sys, math
import numpy as np
import trimesh, ezdxf
from shapely.geometry import Polygon
from shapely.ops import unary_union
from playwright.sync_api import sync_playwright

if len(sys.argv) != 3: sys.exit(__doc__)
import os
HTML = os.path.abspath(sys.argv[1]); REPORT = sys.argv[2]
SRC = 'file://' + HTML
random.seed(7)

def vectors(k):
    lo, hi, n = k['cutMin'], k['cutMax'], k['pinCount']
    v = {'preset': list(k['presets'][0]['b'])[:n] + [lo] * max(0, n - len(k['presets'][0]['b'])),
         'all-min': [lo] * n, 'all-max': [hi] * n,
         'alt-min-max': [lo if i % 2 == 0 else hi for i in range(n)],
         'alt-max-min': [hi if i % 2 == 0 else lo for i in range(n)],
         'staircase': [round(lo + (hi - lo) * i / max(1, n - 1)) for i in range(n)]}
    for i in range(30):
        v[f'rand{i}'] = [random.randint(lo, hi) for _ in range(n)]
    return v

def parse_path(d):
    toks = re.findall(r'[MLQZ]|-?\d+(?:\.\d+)?', d)
    rings, cur, i = [], [], 0
    def num(): 
        nonlocal i; v = float(toks[i]); i += 1; return v
    while i < len(toks):
        t = toks[i]; i += 1
        if t == 'M':
            if cur: rings.append(cur)
            cur = [(num(), num())]
        elif t == 'L':
            cur.append((num(), num()))
        elif t == 'Q':
            cx, cy, x, y = num(), num(), num(), num(); x0, y0 = cur[-1]
            for s in range(1, 9):
                u = s / 8; cur.append(((1-u)**2*x0 + 2*(1-u)*u*cx + u*u*x, (1-u)**2*y0 + 2*(1-u)*u*cy + u*u*y))
        elif t == 'Z':
            if cur: rings.append(cur); cur = []
        else:  # implicit L continuation
            i -= 1; cur.append((num(), num()))
    if cur: rings.append(cur)
    return rings

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(SRC, wait_until='load'); page.wait_for_timeout(300)
    page.add_style_tag(content='.preview svg{transition:none!important}')
    page.evaluate("(() => { window.__cap = null; window.dl = (blob, name) => { blob.text().then(t => { window.__cap = {name, text: t}; }); }; })()")
    KT = page.evaluate("JSON.parse(JSON.stringify(KEY_TYPES))")
    res = {'keys': {}, 'errors': errs}
    for code, k in KT.items():
        r = {'name': k['name'], 'cases': {}}
        vs = vectors(k)
        # ---- path geometry ----
        stats = {'points': [], 'dlen': [], 'invalid': 0, 'tip_inverted': 0, 'dups': 0, 'bow_has_hole': False}
        for name, bits in vs.items():
            d = page.evaluate("([c,b]) => buildPath(KEY_TYPES[c], b)", [code, bits])
            rings = parse_path(d)
            blade = rings[0]; bow = rings[1] if len(rings) > 1 else []
            stats['points'].append(len(blade)); stats['dlen'].append(len(d))
            # near-duplicate consecutive points (zero-length edges)
            stats['dups'] += sum(1 for a, c in zip(blade, blade[1:] + blade[:1]) if math.hypot(a[0]-c[0], a[1]-c[1]) < 1e-3)
            pg = Polygon(blade)
            if not pg.is_valid: stats['invalid'] += 1
            # tip: top vs bottom at x = bladeL (y negated in svg, so 'top' has the more negative y)
            tip = page.evaluate("([c,b]) => { const k = KEY_TYPES[c]; return [bladeTopY(k,b,k.bladeL), bladeBottomY(k,k.bladeL)]; }", [code, bits])
            if tip[0] < tip[1] - 1e-9: stats['tip_inverted'] += 1
        r['path'] = {'blade_points_mean': float(np.mean(stats['points'])), 'd_chars_mean': float(np.mean(stats['dlen'])),
                     'invalid_blade_polygons': stats['invalid'], 'of': len(vs), 'zero_length_edges_total': stats['dups'],
                     'tip_top_below_bottom_cases': stats['tip_inverted']}
        tipv = page.evaluate("([c]) => { const k = KEY_TYPES[c]; const b = Array(k.pinCount).fill(k.cutMin); return {top: bladeTopY(k,b,k.bladeL), bottom: bladeBottomY(k,k.bladeL)}; }", [code])
        r['tip_at_end'] = tipv
        # ---- STL mesh ----
        mesh_res = []
        for name in ('preset', 'all-min', 'all-max', 'alt-min-max'):
            bits = vs[name]
            stl = page.evaluate("([c,b]) => buildSTL(KEY_TYPES[c], b)", [code, bits])
            m = trimesh.load(io.BytesIO(stl.encode()), file_type='stl', process=True)
            # true profile area = polygon of blade (CCW) union bow
            d = page.evaluate("([c,b]) => buildPath(KEY_TYPES[c], b)", [code, bits]); rings = parse_path(d)
            truth = unary_union([Polygon(rg).buffer(0) for rg in rings])
            # front face triangles (z == 0) -> union area and symmetric difference with the truth
            fv = m.vertices[m.faces]; front = [f for f in fv if np.allclose(f[:, 2], 0)]
            tris = [Polygon(f[:, :2]) for f in front if Polygon(f[:, :2]).area > 1e-9]
            cover = unary_union(tris) if tris else Polygon()
            # the mesh is built in math coords (y up), the path in svg coords (y down): flip for comparison
            from shapely import affinity
            truth_up = affinity.scale(truth, 1, -1, origin=(0, 0))
            mesh_res.append({'case': name, 'watertight': bool(m.is_watertight), 'winding_consistent': bool(m.is_winding_consistent),
                             'volume_mm3': float(m.volume), 'faces': int(len(m.faces)),
                             'front_cover_vs_truth_symdiff_mm2': float(cover.symmetric_difference(truth_up).area),
                             'truth_area_mm2': float(truth_up.area), 'bytes': len(stl)})
        r['stl'] = mesh_res
        # edge statistics of the first mesh (open boundary edges / non-manifold edges)
        stl0 = page.evaluate("([c,b]) => buildSTL(KEY_TYPES[c], b)", [code, vs['preset']])
        m0 = trimesh.load(io.BytesIO(stl0.encode()), file_type='stl', process=True)
        ec = np.bincount(np.unique(np.sort(m0.edges, axis=1), axis=0, return_inverse=True)[1])
        r['stl_edges'] = {'boundary_edges(used_once)': int((ec == 1).sum()), 'nonmanifold_edges(used>2)': int((ec > 2).sum()), 'total_edges': int(len(ec))}
        # bow ring geometry (svg coords, y down) and where the keyring hole would be: there is none
        d0 = page.evaluate("([c,b]) => buildPath(KEY_TYPES[c], b)", [code, vs['preset']]); rings0 = parse_path(d0)
        bow = np.array(rings0[1]); bl = np.array(rings0[0])
        r['bow'] = {'rings_in_path': len(rings0), 'x_range': [float(bow[:,0].min()), float(bow[:,0].max())], 'y_range_svg': [float(bow[:,1].min()), float(bow[:,1].max())],
                    'blade_bottom_y_svg': float(bl[:,1].max()), 'bow_bottom_above_blade_bottom_mm': float(bl[:,1].max() - bow[:,1].max())}
        # shallowest cut: is it visibly different from an uncut blade?
        r['shallowest_cut_depth_mm'] = page.evaluate("([c]) => { const k = KEY_TYPES[c]; const b = Array(k.pinCount).fill(k.cutMax); b[0] = k.cutMin; const x = pinCenters(k, b)[0]; return k.shoulderH - bladeTopY(k, b, x); }", [code])
        r['deepest_cut_depth_mm'] = page.evaluate("([c]) => { const k = KEY_TYPES[c]; const b = Array(k.pinCount).fill(k.cutMin); b[0] = k.cutMax; const x = pinCenters(k, b)[0]; return k.shoulderH - bladeTopY(k, b, x); }", [code])
        # ---- DXF ----
        page.evaluate("([c]) => { curKey = c; }", [code])
        page.evaluate("window.__cap = null; exportDXF();"); page.wait_for_timeout(120)
        cap = page.evaluate("window.__cap")
        doc = ezdxf.read(io.StringIO(cap['text']))
        ents = list(doc.modelspace())
        kinds = {}
        for e in ents: kinds[e.dxftype()] = kinds.get(e.dxftype(), 0) + 1
        xs = [v for e in ents for v in (e.dxf.start.x, e.dxf.end.x)]; ys = [v for e in ents for v in (e.dxf.start.y, e.dxf.end.y)]
        r['dxf'] = {'entities': kinds, 'insunits': doc.header.get('$INSUNITS'), 'bbox_x': [min(xs), max(xs)], 'bbox_y': [min(ys), max(ys)],
                    'expected_total_length_mm': k['bowW'] + k['bladeL']}
        # ---- px/mm at scale 1.0 on a phone and on a desktop viewport ----
        pm = {}
        for (w, h) in ((390, 844), (1280, 800)):
            page.set_viewport_size({'width': w, 'height': h}); page.wait_for_timeout(80)
            page.evaluate("([c]) => { curKey = c; scale = 1.0; renderKTGrid(); renderPins(); renderPresets(); renderKey(); }", [code])
            pm[f'{w}x{h}'] = page.evaluate("""([c]) => { const k = KEY_TYPES[c]; const p = document.querySelector('#key-svg path'); const r = p.getBoundingClientRect();
               // path bbox includes bow (-bowW..0) and blade (0..bladeL): length in mm = bowW + bladeL
               return r.width / (k.bowW + k.bladeL); }""", [code])
        r['px_per_mm_at_1x'] = pm
        page.set_viewport_size({'width': 390, 'height': 844}); page.wait_for_timeout(60)
        page.evaluate("([c]) => { curKey = c; scale = 1.0; renderKTGrid(); renderPins(); renderPresets(); renderKey(); }", [code])
        r['viewbox_use'] = page.evaluate("""() => { const svg = document.getElementById('key-svg'); const vb = svg.viewBox.baseVal; const bb = document.querySelector('#key-svg path').getBBox();
            return {viewBox_mm: [vb.width, vb.height], key_bbox_mm: [bb.width, bb.height], height_used: bb.height / vb.height, width_used: bb.width / vb.width,
                    svg_px: [svg.getBoundingClientRect().width, svg.getBoundingClientRect().height]}; }""")
        # ---- clipping at 3.0x on a phone ----
        page.set_viewport_size({'width': 390, 'height': 844}); page.wait_for_timeout(80)
        page.evaluate("([c]) => { curKey = c; scale = 3.0; document.getElementById('sc-sl').value = 3; renderKey(); }", [code]); page.wait_for_timeout(120)
        r['visible_fraction_at_3x_phone'] = page.evaluate("""() => { const pv = document.getElementById('preview').getBoundingClientRect(); const p = document.querySelector('#key-svg path').getBoundingClientRect();
            const iw = Math.max(0, Math.min(pv.right, p.right) - Math.max(pv.left, p.left)); const ih = Math.max(0, Math.min(pv.bottom, p.bottom) - Math.max(pv.top, p.top)); return (iw*ih) / (p.width*p.height); }""")
        page.evaluate("() => { scale = 1.0; document.getElementById('sc-sl').value = 1; }")
        res['keys'][code] = r
    # ---- cost per render ----
    page.set_viewport_size({'width': 390, 'height': 844}); page.wait_for_timeout(80)
    res['render_ms_per_input'] = page.evaluate("""() => { curKey = 'SC1'; renderKey(); const N = 300; const t0 = performance.now();
        for (let i = 0; i < N; i++) { bitting[0] = i % 10; renderKey(); } return (performance.now() - t0) / N; }""")
    res['buildPath_ms'] = page.evaluate("""() => { const k = KEY_TYPES.SC1; const N = 500; const t0 = performance.now(); for (let i = 0; i < N; i++) buildPath(k, [i % 10, 1, 3, 2, 5]); return (performance.now() - t0) / N; }""")
    res['file_bytes'] = len(open(HTML, 'rb').read())
    json.dump(res, open(REPORT, 'w'), indent=1)
    b.close()
print(json.dumps({k: res[k] for k in ('render_ms_per_input', 'buildPath_ms', 'file_bytes', 'errors')}, indent=1))
for code, r in res['keys'].items():
    print(f"\n== {code} {r['name']}")
    print(' path :', r['path'])
    print(' tip@end (cuts min):', {k: round(v, 3) for k, v in r['tip_at_end'].items()})
    for m in r['stl']: print(' stl  :', {k: (round(v, 2) if isinstance(v, float) else v) for k, v in m.items()})
    print(' dxf  :', r['dxf'])
    print(' edges:', r['stl_edges'], '| bow:', r['bow'])
    print(' cut depth shallowest/deepest (mm):', round(r['shallowest_cut_depth_mm'], 3), round(r['deepest_cut_depth_mm'], 3), '| viewBox use:', {k: (round(v, 2) if isinstance(v, float) else v) for k, v in r['viewbox_use'].items()})
    print(' px/mm:', {k: round(v, 2) for k, v in r['px_per_mm_at_1x'].items()}, '| visible@3x phone:', round(r['visible_fraction_at_3x_phone'], 2))
