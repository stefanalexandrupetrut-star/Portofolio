"""Same measurements, same browser, both builds: the original (v4) against the refactor (v5).
usage: python compare.py <1KeyForge_4.original.html> <1keyforge-pro.html> <out.json>"""
import json, sys, os
from playwright.sync_api import sync_playwright
if len(sys.argv) != 4: sys.exit(__doc__)
FILES = {'v4': os.path.abspath(sys.argv[1]), 'v5': os.path.abspath(sys.argv[2])}; OUT = sys.argv[3]
out = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for ver in ('v4', 'v5'):
        r = {}
        for vp in ((390, 844), (1280, 800)):
            page = b.new_page(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=1)
            page.goto('file://' + FILES[ver]); page.wait_for_timeout(250)
            page.add_style_tag(content='.preview svg{transition:none!important}')
            ppm = {}
            for code in page.evaluate("Object.keys(KEY_TYPES)"):
                page.evaluate("""(c) => { curKey = c; const nk = KEY_TYPES[c]; const p = nk.presets[0]; bitting = Array.from({length: 6}, (_, i) => i < p.b.length ? p.b[i] : nk.cutMin); scale = 1; renderKTGrid(); renderPins(); renderPresets(); renderKey(); }""", code)
                ppm[code] = page.evaluate("document.querySelector('#key-svg path').getScreenCTM().a")
            r[f'ppm_{vp[0]}'] = ppm
            if vp[0] == 390:
                r['render_ms'] = page.evaluate("""() => { const N = 600; const t0 = performance.now(); for (let i = 0; i < N; i++){ bitting[0] = i % 9; renderKey(); } return (performance.now() - t0) / N; }""")
                r['render_ms_SC4'] = page.evaluate("""() => { curKey = 'SC4'; bitting = [2,5,3,6,3,4]; renderKey(); const N = 600; const t0 = performance.now(); for (let i = 0; i < N; i++){ bitting[0] = i % 9; renderKey(); } return (performance.now() - t0) / N; }""")
                r['dom_nodes_in_svg'] = page.evaluate("document.getElementById('key-svg').querySelectorAll('*').length")
                r['file_bytes'] = len(open(FILES[ver], 'rb').read())
            page.close()
        out[ver] = r
    for ver in out:
        for k in ('ppm_390', 'ppm_1280'):
            v = list(out[ver][k].values()); out[ver][k + '_spread_pct'] = round((max(v) - min(v)) / (sum(v) / len(v)) * 100, 1); out[ver][k + '_range'] = [round(min(v), 2), round(max(v), 2)]
json.dump(out, open(OUT, 'w'), indent=1)
for ver in out:
    r = out[ver]; print(ver, 'render ms', round(r['render_ms'], 3), round(r['render_ms_SC4'], 3), '| svg nodes', r['dom_nodes_in_svg'], '| ppm390', r['ppm_390_range'], f"{r['ppm_390_spread_pct']}%", '| ppm1280', r['ppm_1280_range'], f"{r['ppm_1280_spread_pct']}%", '| file', r['file_bytes'])
