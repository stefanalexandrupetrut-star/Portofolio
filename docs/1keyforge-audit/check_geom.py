"""Independent audit of a dumped geometry set: shapely (outline), trimesh (STL), ezdxf (DXF).
usage: check_geom.py <dump.json> [report.json]"""
import sys, json, base64, io, struct, tempfile, os, math
import numpy as np, trimesh, ezdxf
from ezdxf import recover
from shapely.geometry import Polygon, LineString, Point
D = json.load(open(sys.argv[1]))
rep = {'keys': {}, 'fail': []}
def fail(code, case, msg):
    rep['fail'].append(f'{code}/{case}: {msg}')
for code, rec in D['keys'].items():
    k = rec['k']; W, L = k['bowW'], k['bladeL']; H = k['shoulderH'] + k['bowH']; h = k['shoulderH']
    R = {'cases': len(rec['cases']), 'max_area_err_stl': 0, 'min_tip_face': 9e9, 'min_blade_thickness': 9e9, 'min_wall_hole': 9e9,
         'max_depth_err': 0, 'min_edge': 9e9, 'watertight_all': True, 'volume_pos_all': True, 'euler0_all': True, 'path_chars_max': 0, 'stl_bytes': 0, 'tris': 0, 'dxf_checked': 0}
    for name, c in rec['cases'].items():
        outer = np.array(c['outer']); ho = c['hole']
        hole = [(ho['cx'] + ho['r'] * math.cos(a), ho['cy'] + ho['r'] * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 361)]
        poly = Polygon(outer, [hole])
        if not poly.is_valid: fail(code, name, 'polygon invalid: ' + str(poly.is_valid))
        if not Polygon(outer).exterior.is_ccw: fail(code, name, 'outer ring not CCW')
        b = poly.bounds
        if abs(b[0] + W) > 1e-6 or abs(b[2] - L) > 1e-6 or abs(b[1]) > 1e-6 or abs(b[3] - H) > 1e-6: fail(code, name, f'bounds {b} != {(-W, 0, L, H)}')
        # edges
        e = np.hypot(*(np.roll(outer, -1, 0) - outer).T); R['min_edge'] = min(R['min_edge'], float(e.min()))
        if e.min() < 1e-4: fail(code, name, f'tiny edge {e.min():.6f}')
        # hole wall
        wall = poly.exterior.distance(Point(ho['cx'], ho['cy'])) - ho['r']; R['min_wall_hole'] = min(R['min_wall_hole'], wall)
        if wall < 2.0: fail(code, name, f'hole wall {wall:.2f} mm < 2')
        # bitting invariant: the profile at each pin centre sits exactly at (shoulderH - depth)
        for xc, d in zip(c['centers'], c['depths']):
            ln = LineString([(xc, h + 2), (xc, -1)]).intersection(poly)
            top = ln.bounds[3] if not ln.is_empty else None
            err = abs(top - (h - d)); R['max_depth_err'] = max(R['max_depth_err'], err)
            if err > 1e-6: fail(code, name, f'cut at x={xc:.2f}: top {top:.4f} expected {h-d:.4f}')
        # tip face + blade thickness along the blade
        ln = LineString([(L - 1e-4, -1), (L - 1e-4, h + 1)]).intersection(poly); R['min_tip_face'] = min(R['min_tip_face'], ln.length)
        for x in np.linspace(0.01, L - 0.2, 400):
            ln = LineString([(x, -1), (x, h + 1)]).intersection(poly); R['min_blade_thickness'] = min(R['min_blade_thickness'], ln.length)
        # STL
        raw = base64.b64decode(c['stl'])
        if raw[:5] == b'solid': fail(code, name, 'STL header starts with "solid"')
        n = struct.unpack_from('<I', raw, 80)[0]
        if len(raw) != 84 + 50 * n: fail(code, name, 'STL length mismatch')
        m = trimesh.load(io.BytesIO(raw), file_type='stl', process=True)
        R['stl_bytes'] = len(raw); R['tris'] = n
        if not m.is_watertight: R['watertight_all'] = False; fail(code, name, 'STL not watertight')
        if not m.is_winding_consistent: fail(code, name, 'STL winding inconsistent')
        if m.volume <= 0: R['volume_pos_all'] = False; fail(code, name, f'STL volume {m.volume}')
        vol_expect = poly.area * k['thick']
        R['max_area_err_stl'] = max(R['max_area_err_stl'], abs(m.volume - vol_expect) / vol_expect)
        if abs(m.volume - vol_expect) / vol_expect > 0.002: fail(code, name, f'STL volume {m.volume:.2f} vs {vol_expect:.2f}')
        if m.euler_number != 0: R['euler0_all'] = False; fail(code, name, f'euler {m.euler_number} (expected 0: one through-hole)')
        zb = m.bounds[:, 2]
        if abs(zb[0]) > 1e-5 or abs(zb[1] - k['thick']) > 1e-4: fail(code, name, f'z range {zb}')
        # stored normals agree with geometry
        fn = np.frombuffer(raw[84:], dtype=np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')]), count=n)
        v = fn['v'].astype(float); gn = np.cross(v[:, 1] - v[:, 0], v[:, 2] - v[:, 0]); gn /= np.linalg.norm(gn, axis=1)[:, None]
        if np.abs(gn - fn['n']).max() > 1e-4: fail(code, name, 'stored normals disagree with winding')
        if (m.area_faces < 1e-9).any(): fail(code, name, 'degenerate triangle')
        R['path_chars_max'] = max(R['path_chars_max'], len(c['d']))
        # DXF
        if c['dxf']:
            with tempfile.NamedTemporaryFile('w', suffix='.dxf', delete=False) as f: f.write(c['dxf']); p = f.name
            try:
                doc = ezdxf.readfile(p); aud = doc.audit()
                if aud.errors or aud.fixes: fail(code, name, f'DXF audit {len(aud.errors)} errors {len(aud.fixes)} fixes')
                if doc.units != 4: fail(code, name, f'DXF units {doc.units}')
                ents = list(doc.modelspace()); kinds = sorted(e.dxftype() for e in ents)
                if kinds != ['CIRCLE', 'POLYLINE']: fail(code, name, f'DXF entities {kinds}')
                pl = [e for e in ents if e.dxftype() == 'POLYLINE'][0]
                if not pl.is_closed: fail(code, name, 'DXF polyline not closed')
                from ezdxf import path as ezp
                pth = ezp.make_path(pl); pts = [(q.x, q.y) for q in pth.flattening(0.002)]
                pg = Polygon(pts); outer_poly = Polygon(outer)
                if abs(pg.area - outer_poly.area) > 0.6: fail(code, name, f'DXF outline area {pg.area:.2f} vs {outer_poly.area:.2f}')
                if not pg.buffer(0.05).contains(outer_poly.buffer(-0.05)) or not outer_poly.buffer(0.05).contains(pg.buffer(-0.05)): fail(code, name, 'DXF outline differs from SVG/STL outline by > 0.05 mm')
                circ = [e for e in ents if e.dxftype() == 'CIRCLE'][0]
                if abs(circ.dxf.radius - ho['r']) > 1e-3 or abs(circ.dxf.center.x - ho['cx']) > 1e-3: fail(code, name, 'DXF hole differs')
                R['dxf_checked'] += 1
            finally: os.unlink(p)
    rep['keys'][code] = R
    print(code, {a: (round(b, 6) if isinstance(b, float) else b) for a, b in R.items()})
print('FAILURES:', len(rep['fail']))
for f in rep['fail'][:40]: print('  ', f)
json.dump(rep, open(sys.argv[2] if len(sys.argv) > 2 else '/dev/null', 'w'), indent=1)
