"""In-browser audit of the shipped (refactored) app: real UI clicks, real downloads, real rasterisation.
usage: python audit_app.py <1keyforge-pro.html> <report.json>"""
import sys, json, io, math, struct, tempfile, os, re, hashlib
import numpy as np, trimesh, ezdxf, shapely
from shapely.geometry import Polygon, Point
from playwright.sync_api import sync_playwright
HTML, REP = os.path.abspath(sys.argv[1]), sys.argv[2]
R = {'checks': [], 'fail': []}
def ok(name, cond, detail=''):
    R['checks'].append({'name': name, 'ok': bool(cond), 'detail': str(detail)})
    if not cond: R['fail'].append(f'{name}: {detail}')
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{detail}]' if detail else ''))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, accept_downloads=True)
    page = ctx.new_page()
    errs = []; page.on('pageerror', lambda e: errs.append(str(e))); page.on('console', lambda m: errs.append('console:' + m.text) if m.type in ('error', 'warning') else None)
    page.goto('file://' + HTML, wait_until='load'); page.wait_for_timeout(300)
    page.add_style_tag(content='.preview svg{transition:none!important}')
    KT = page.evaluate("JSON.parse(JSON.stringify(KEY_TYPES))")
    ok('page loads with no console errors/warnings', not errs, errs)

    def select(code, bits=None, sc=1.0):
        page.evaluate("""([c, bits, sc]) => { curKey = c; const nk = KEY_TYPES[c]; const p = nk.presets[0];
            bitting = bits ? bits.concat(Array(6).fill(nk.cutMin)).slice(0, 6) : Array.from({length: 6}, (_, i) => i < p.b.length ? p.b[i] : nk.cutMin);
            panX = panY = 0; setZoom(sc); renderKTGrid(); renderPins(); renderPresets(); renderKey(); }""", [code, bits, sc])

    # 1. constant px/mm across key types and viewports
    for vp in [(390, 844), (375, 667), (768, 1024), (1280, 800)]:
        page.set_viewport_size({'width': vp[0], 'height': vp[1]}); page.wait_for_timeout(80)
        vals = []
        for code, k in KT.items():
            select(code)
            m = page.evaluate("""() => { const svg = document.getElementById('key-svg'), vb = svg.viewBox.baseVal; const bb = scene.body.getBBox();
                const ctm = scene.body.getScreenCTM(); return {ppm: ctm.a, vbw: vb.width, bbw: bb.width, bbh: bb.height}; }""")
            vals.append(m['ppm'])
        spread = (max(vals) - min(vals)) / np.mean(vals)
        ok(f'px/mm identical for all 8 keys @ {vp[0]}x{vp[1]}', spread < 1e-6, f'{np.mean(vals):.3f} px/mm, spread {spread:.2e}')
    page.set_viewport_size({'width': 390, 'height': 844}); page.wait_for_timeout(80)

    # 2. whole key fits at 1x for every key type (phone), with the pin labels
    fits = []
    for code in KT:
        select(code)
        r = page.evaluate("""() => { const pv = document.getElementById('preview').getBoundingClientRect(); const bb = scene.body.getBoundingClientRect();
            const lab = [...document.querySelectorAll('#key-svg text')].map(t => t.getBoundingClientRect());
            const all = lab.concat([bb]); const l = Math.min(...all.map(x => x.left)), rr = Math.max(...all.map(x => x.right)), t = Math.min(...all.map(x => x.top)), bt = Math.max(...all.map(x => x.bottom));
            return {l: l - pv.left, r: pv.right - rr, t: t - pv.top, b: pv.bottom - bt}; }""")
        fits.append((code, r))
    ok('key + labels fully inside the preview at 1x (390x844), all types', all(min(r.values()) >= 4 for _, r in fits), {c: round(min(r.values()), 1) for c, r in fits})

    # 3. zoom 3x + pan reaches both ends of every key
    reach = []
    for code, k in KT.items():
        select(code, sc=3.0)
        res = {}
        for side, sign in (('left_end', 1), ('right_end', -1)):
            page.evaluate("() => { panX = 0; panY = 0; applyView(); }")
            box = page.evaluate("(() => { const r = document.getElementById('preview').getBoundingClientRect(); return {x: r.left + 20, y: r.top + r.height / 2, w: r.width}; })()")
            for _ in range(6):                      # six long drags: far more than the key is wide
                x0 = box['x'] if sign < 0 else box['x'] + box['w'] - 60
                page.mouse.move(x0 + (280 if sign < 0 else 0), box['y']); page.mouse.down()
                page.mouse.move(x0 + (280 if sign < 0 else 0) + sign * 150, box['y'], steps=5); page.mouse.move(x0 + (280 if sign < 0 else 0) + sign * 280, box['y'], steps=5); page.mouse.up()
            res[side] = page.evaluate("""() => { const pv = document.getElementById('preview').getBoundingClientRect(), bb = scene.body.getBoundingClientRect();
                return {leftVisible: bb.left >= pv.left - 1, rightVisible: bb.right <= pv.right + 1, pan: [panX, panY]}; }""")
        # dragging right (dx>0) brings the left end (bow) into view; dragging left brings the tip into view
        reach.append((code, res['left_end']['leftVisible'], res['right_end']['rightVisible']))
    ok('3x zoom: dragging brings the bow end and the tip fully on screen for every key', all(a and c for _, a, c in reach), reach)
    select('SC1', sc=1.0)

    # 4. gestures via synthetic pointer events: pinch about the midpoint, double tap, ctrl+wheel
    g = page.evaluate("""() => {
        const pv = document.getElementById('preview'); const r = pv.getBoundingClientRect(); const cx = r.left + r.width/2, cy = r.top + r.height/2;
        const fire = (type, id, x, y, extra) => pv.dispatchEvent(new PointerEvent(type, Object.assign({pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch', isPrimary: id === 1}, extra || {})));
        resetView();
        // key point under the midpoint before the pinch
        fire('pointerdown', 1, cx - 40, cy); fire('pointerdown', 2, cx + 40, cy);
        for (let i = 1; i <= 10; i++) { fire('pointermove', 1, cx - 40 - 6*i, cy); fire('pointermove', 2, cx + 40 + 6*i, cy); }
        fire('pointerup', 2, cx + 100, cy); fire('pointerup', 1, cx - 100, cy);
        const afterPinch = {scale, panX, panY, slider: scSl.value, disp: document.getElementById('sc-disp').textContent};
        // one-finger pan
        fire('pointerdown', 3, cx, cy); fire('pointermove', 3, cx + 30, cy + 10); fire('pointerup', 3, cx + 30, cy + 10);
        const afterPan = {panX, panY};
        resetView(); const afterReset = {scale, panX, panY};
        // ctrl+wheel
        pv.dispatchEvent(new WheelEvent('wheel', {deltaY: -100, ctrlKey: true, clientX: cx + 50, clientY: cy, bubbles: true, cancelable: true}));
        const afterWheel = {scale, panX};
        resetView();
        // two quick taps
        fire('pointerdown', 4, cx, cy, {timeStamp: 0}); fire('pointerup', 4, cx, cy); setZoom(2); fire('pointerdown', 5, cx + 2, cy); fire('pointerup', 5, cx + 2, cy);
        return {afterPinch, afterPan, afterReset, afterWheel};
    }""")
    ok('pinch zooms in (80px -> 200px spread => 2.5x)', abs(g['afterPinch']['scale'] - 2.5) < 0.05 and g['afterPinch']['disp'] == '2.5×' and abs(float(g['afterPinch']['slider']) - 2.5) < 0.06, g['afterPinch'])
    ok('pinch about the centre does not drift the key', abs(g['afterPinch']['panX']) < 1 and abs(g['afterPinch']['panY']) < 1, g['afterPinch'])
    ok('one-finger drag pans when zoomed in', abs(g['afterPan']['panX'] - (g['afterPinch']['panX'] + 30)) < 1 and abs(g['afterPan']['panY'] - 10) < 1, g['afterPan'])
    ok('reset returns to 1x with no pan', g['afterReset'] == {'scale': 1, 'panX': 0, 'panY': 0}, g['afterReset'])
    ok('ctrl+wheel zooms in about the cursor (pan shifts away from cursor side)', g['afterWheel']['scale'] > 1.5 and g['afterWheel']['panX'] < 0, g['afterWheel'])
    st = page.evaluate("({scale, panX, panY})")
    ok('double-tap resets zoom', st['scale'] == 1, st)

    # 5. real UI: sliders, key-type cards, presets, collapse; then real downloads
    select('SC1'); page.click('.tab[data-tab="bitting"]')
    sl = page.query_selector_all('#pins-grid input[type=range]')[0]
    page.evaluate("(el) => { el.value = 9; el.dispatchEvent(new Event('input', {bubbles: true})); }", sl)
    ok('pin slider drives the key and the code badge', page.inner_text('#badge') == '92514' and page.evaluate("bitting[0]") == 9, page.inner_text('#badge'))
    page.click('.tab[data-tab="keytype"]'); page.click('.kt-card:nth-child(3)'); page.wait_for_timeout(50)
    ok('key-type card switches profile (KW1) and rebuilds the scene', page.evaluate("curKey") == 'KW1' and page.inner_text('#kt-badge') == 'Kwikset KW1', page.inner_text('#kt-badge'))
    ok('KW1 shows 5 pin labels', page.evaluate("document.querySelectorAll('#key-svg line[stroke=\"#f97316\"]').length") == 5)
    page.click('.tab[data-tab="presets"]'); page.click('#preset-list .vcard:nth-child(2)'); page.wait_for_timeout(50)
    ok('preset applies', page.inner_text('#badge') == '65656', page.inner_text('#badge'))
    page.click('.tab[data-tab="export"]')
    outdir = tempfile.mkdtemp()
    dl = {}
    for label, sel in (('svg', 'text=Export SVG'), ('stl', 'text=Export STL'), ('dxf', 'text=Export DXF')):
        with page.expect_download(timeout=8000) as di: page.click(sel)
        d = di.value; path = os.path.join(outdir, d.suggested_filename); d.save_as(path); dl[label] = path
    print('downloads:', {k: os.path.basename(v) for k, v in dl.items()}, {k: os.path.getsize(v) for k, v in dl.items()})
    kw = KT['KW1']; bits = [6, 5, 6, 5, 6]
    ok('download names carry key code + bitting', all(os.path.basename(v).startswith('KW1_65656.') for v in dl.values()), list(map(os.path.basename, dl.values())))
    # STL
    m = trimesh.load(dl['stl'], process=True)
    ok('downloaded STL: watertight, consistent winding, positive volume, genus 1',
       m.is_watertight and m.is_winding_consistent and m.volume > 0 and m.euler_number == 0, f'vol {m.volume:.1f} mm3, tris {len(m.faces)}, euler {m.euler_number}')
    ok('downloaded STL: extents match key (X length, Z thickness)', abs((m.bounds[1][0] - m.bounds[0][0]) - (kw['bladeL'] + kw['bowW'])) < 1e-3 and abs(m.bounds[1][2] - kw['thick']) < 1e-4, m.bounds.round(3).tolist())
    # DXF
    doc = ezdxf.readfile(dl['dxf']); aud = doc.audit(); ents = sorted(e.dxftype() for e in doc.modelspace())
    ok('downloaded DXF: audit clean, mm units, closed outline + hole circle', not aud.errors and doc.units == 4 and ents == ['CIRCLE', 'POLYLINE'], f'units {doc.units}, {ents}')
    # SVG file: parse as an image in Chromium; physical size
    svgtxt = open(dl['svg']).read()
    mm = re.search(r'width="([\d.]+)mm" height="([\d.]+)mm" viewBox="0 0 ([\d.]+) ([\d.]+)"', svgtxt)
    ok('downloaded SVG: true-size (mm) with a 1:1 viewBox', mm and mm.group(1) == mm.group(3) and mm.group(2) == mm.group(4), mm.groups() if mm else None)
    ok('downloaded SVG: width = key length + padding', mm and abs(float(mm.group(1)) - (kw['bladeL'] + kw['bowW'] + 1)) < 0.01, mm.group(1) if mm else None)

    # 6. SVG path (true arcs) vs shapely polygon: rasterise in Chromium, compare to the flattened outline
    pg = ctx.new_page()
    iou_all = {}
    for code, k in KT.items():
        bits = k['presets'][-1]['b'][:k['pinCount']]
        info = page.evaluate("""([c, bits]) => { const k = KEY_TYPES[c]; const b = keyBounds(k); const S = 20, pad = 1;
            return {d: buildPath(k, bits, pad - b.minX, b.maxY + pad), W: (b.maxX - b.minX + 2*pad), H: (b.maxY - b.minY + 2*pad), outer: flattenContour(keyContour(k, bits)), hole: keyHole(k), minX: b.minX, maxY: b.maxY}; }""", [code, bits])
        S_, pad = 20, 1
        pg.set_viewport_size({'width': int(info['W'] * S_) + 2, 'height': int(info['H'] * S_) + 2})
        pg.set_content(f'<body style="margin:0;background:#fff"><svg width="{info["W"]*S_}" height="{info["H"]*S_}" viewBox="0 0 {info["W"]} {info["H"]}" style="display:block"><path d="{info["d"]}" fill="#000" fill-rule="evenodd"/></svg></body>')
        png = pg.screenshot(clip={'x': 0, 'y': 0, 'width': info['W'] * S_, 'height': info['H'] * S_}, scale='css')
        from PIL import Image
        im = np.array(Image.open(io.BytesIO(png)).convert('L')) < 128
        ho = info['hole']; ring = np.array(info['outer'])
        poly = Polygon((ring + [pad - info['minX'], 0]) * [1, 1], [[(ho['cx'] + pad - info['minX'] + ho['r'] * math.cos(a), ho['cy'] + ho['r'] * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 400)]])
        # flip y into image rows
        H_mm = info['H']; yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]]
        X = (xx + 0.5) / S_; Y = H_mm - (yy + 0.5) / S_ - (pad + 0)  # svg y = maxY+pad - y  =>  y = maxY + pad - svgy ; image row svgy = (yy+.5)/S
        Y = (info['maxY'] + pad) - (yy + 0.5) / S_
        X = (xx + 0.5) / S_ - (pad - info['minX'])
        truth = shapely.contains_xy(Polygon(ring, [[(ho['cx'] + ho['r'] * math.cos(a), ho['cy'] + ho['r'] * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 400)]]), X, Y)
        iou = (im & truth).sum() / (im | truth).sum(); iou_all[code] = round(float(iou), 5)
    ok('SVG path (true arcs) matches the polygon used for STL/DXF: IoU > 0.998 for all keys', min(iou_all.values()) > 0.998, iou_all)

    # 7. timing
    t = page.evaluate("""() => { select = null; const k = KEY_TYPES.SC4; const bits = [1,2,3,4,5,6]; const N = 400; let t0 = performance.now();
        for (let i = 0; i < N; i++){ bitting[0] = i % 9; renderKey(); } const render = (performance.now() - t0) / N;
        t0 = performance.now(); for (let i = 0; i < N; i++) buildPath(k, bits); const path = (performance.now() - t0) / N;
        t0 = performance.now(); for (let i = 0; i < 40; i++) buildSTL(k, bits); const stl = (performance.now() - t0) / 40;
        t0 = performance.now(); for (let i = 0; i < 40; i++) buildDXF(k, bits); const dxf = (performance.now() - t0) / 40;
        return {render, path, stl, dxf}; }""")
    print('timing ms/op:', {a: round(v, 3) for a, v in t.items()})
    R['timing_ms'] = t
    ok('renderKey well under a frame (<2 ms)', t['render'] < 2, round(t['render'], 3))
    ok('STL build well under 100 ms', t['stl'] < 100, round(t['stl'], 2))
    ok('no console errors after the whole session', not [e for e in errs], errs)
    # 8. path/DOM size
    sizes = page.evaluate("""() => { const out = {}; Object.keys(KEY_TYPES).forEach(c => { const k = KEY_TYPES[c]; out[c] = buildPath(k, k.presets[0].b.slice(0, k.pinCount)).length; }); return out; }""")
    R['path_chars'] = sizes; print('path chars:', sizes)
    R['file_bytes'] = os.path.getsize(HTML)
json.dump(R, open(REP, 'w'), indent=1)
print('FAILED:', len(R['fail'])); [print('  ', f) for f in R['fail']]
