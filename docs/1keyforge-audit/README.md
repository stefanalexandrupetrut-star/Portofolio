# 1KeyForge audit kit

Independent checks of the key geometry in 1KeyForge Pro. The scripts measure the app from the outside: they open its exports with libraries that share none of its code (shapely, trimesh, ezdxf) and drive the page in a real browser. The `results/` folder holds the output that the case study quotes.

This is a measuring kit, not part of the website. Nothing in `src/`, `public/` or the Next.js build depends on it.

## What is in here

| File | What it does |
| --- | --- |
| `dump_geom.js` | Runs the app's geometry engine in Node, read straight out of the app's HTML, on 130 bittings per profile: the first preset, all-minimum, all-maximum, two alternating patterns, a staircase, 120 random bittings and four hostile inputs (NaN, out of range, too short, negative). It writes the outline, SVG path, STL and DXF of each case to one JSON file (about 30 MB, so it is not kept in the repository). |
| `check_geom.py` | Reads that JSON with shapely, trimesh and ezdxf. For every case it checks the outline (valid, counter-clockwise, exact bounds, no tiny edges, key-ring wall at least 2 mm), the cut depth at every pin centre, the blade and tip thickness, and the STL (watertight, consistent winding, positive volume equal to outline area x thickness, one through-hole, correct z range, stored normals agree with the winding, no degenerate triangles). For 40 of the 130 bittings per profile (320 files) it also opens the DXF (audit clean, millimetre units, one closed polyline plus one circle, outline and hole within 0.05 mm of the engine's outline). |
| `audit_app.py` | Opens the shipped HTML in headless Chromium and uses it like a person would: 27 checks covering scale at four viewport sizes, keys fitting the preview, zoom and pan at 3x, pinch, drag, Ctrl + wheel, double-tap, sliders, key type switching, presets, the three downloads (names, STL mesh, DXF content, true-size SVG), the SVG path against the polygon used for STL and DXF, timings and a clean console. |
| `audit_original.py` | Measures the original file (the same checks that found the defects: sub-paths, tip inversion, STL mesh validity, DXF content, pixels per millimetre, visible fraction at 3x, render cost). |
| `compare.py` | Runs the same measurements on both builds side by side: pixels per millimetre per profile at 390 px and 1280 px, redraw time, SVG node count, file size. |
| `1KeyForge_4.original.html` | The original single file, unmodified. It is the app's source, so it is listed in `.gitignore` and never pushed to GitHub; keep your own copy. |
| `results/*.json` | The reference output of each script. |

## Set up

```bash
pip install numpy shapely trimesh ezdxf playwright
playwright install chromium
node --version   # any current Node
```

Versions used for the reference results: Python 3.13, numpy 2.5, shapely 2.2, trimesh 5.1, ezdxf 1.4, Playwright 1.63 (Chromium), Node 22.

## Run

From the repository root:

```bash
APP=private/apps/1keyforge-pro.html
ORIG=docs/1keyforge-audit/1KeyForge_4.original.html
OUT=docs/1keyforge-audit/results

node docs/1keyforge-audit/dump_geom.js $APP /tmp/keyforge-dump.json
python docs/1keyforge-audit/check_geom.py /tmp/keyforge-dump.json $OUT/geometry-audit.json
python docs/1keyforge-audit/audit_app.py $APP $OUT/app-audit.json
python docs/1keyforge-audit/audit_original.py $ORIG $OUT/original-audit.json
python docs/1keyforge-audit/compare.py $ORIG $APP $OUT/compare.json
```

Expected output:

- `check_geom.py` ends with `FAILURES: 0` (8 profiles x 130 bittings = 1,040 cases).
- `audit_app.py` ends with `FAILED: 0` (27 checks).
- `audit_original.py` and `compare.py` print the measurements of the original next to the refactor.

Re-running reproduces the files in `results/` exactly, apart from the timing figures (redraw and build times), which vary a little with the machine and from run to run.

## What the results do not show

- The STL and DXF files were opened and measured with libraries. They were not loaded into a physical slicer, printed, or run on a CNC or laser.
- The key dimensions in the app's `KEY_TYPES` table are working approximations of common profiles. The audit measures whether the app draws and exports the shape it describes, not whether the description matches any manufacturer's drawing.
- The browser checks ran in Chromium only. Safari and Firefox were not tested.
- The DXF was opened in 320 of the 1,040 cases (40 per profile), not in all of them.
