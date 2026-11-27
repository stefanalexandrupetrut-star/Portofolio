# 1KeyForge Pro: key shape review

What was inspected, what was measured, what changed, and what the checks do not prove.

- **Original:** `docs/1keyforge-audit/1KeyForge_4.original.html` (the file as submitted, unmodified). Called **v4** below.
- **Refactor:** `private/apps/1keyforge-pro.html`. Called **v5** below. The app is private to its developer: the site serves it only at `/apps/1keyforge-pro` after Developer Mode is unlocked, and the project page shows visitors screenshots of it.
- **Evidence:** every number below comes from `docs/1keyforge-audit/results/*.json`, which the scripts in `docs/1keyforge-audit/` regenerate.

## Summary

v4 looked right at a glance. Measured the way a maker would use it (in millimetres, at the seams, with the exports opened in code), it had six visible outline defects, a preview scale that differed from key to key, and exports that did not match what was on screen: the STL was not a closed solid and the DXF contained only the blade.

All of it traced back to one cause. The bow and the blade were separate sub-paths, the cuts were an effect added afterwards, and each export rebuilt its own simplified version of the shape. v5 describes the key once, as one closed outline, and derives the preview, the SVG, the STL and the DXF from it. The UI, the key database, the tabs and the presets are unchanged: 618 of v4's 979 lines (63%) are identical in v5.

Checked with 1,040 generated geometry cases (8 profiles x 130 bittings) and 27 in-browser checks: 0 failures. The limits are in the last section; the main ones are that the key dimensions are approximations and that the exports were never loaded into a physical slicer or CNC.

## What was already good

- The profiles are data (`KEY_TYPES`): adding a key is adding a row, and everything downstream follows.
- One file, no dependencies, no network requests.
- The interface is quick to use: one slider per pin, presets, saved cuts, files named `<profile>_<bitting>`.
- Performance was never a problem. A redraw took 0.3 to 0.4 ms in v4.

## Method

1. Ran v4 unmodified in headless Chromium and called its own functions (`buildPath`, `buildSTL`, `exportDXF`, ...) on 36 bittings per profile (presets, extremes, alternating, staircase, 30 random).
2. Parsed what came out with libraries that share none of the app's code: shapely for outlines, trimesh for meshes, ezdxf for drawings.
3. Measured scale and zoom in the rendered page, in pixels per millimetre, at phone and desktop sizes.
4. Built v5 and ran the same measurements plus a wider set (see "How to verify").

## Findings

### Visual fidelity

| # | v4 | Evidence | v5 |
| --- | --- | --- | --- |
| 1 | The bow dips below the blade's bottom edge at the collar, a small hook. | 0.365 to 0.404 mm depending on the profile (0.372 mm on SC1). | One outline; the bow and blade meet at a filleted inside corner. Outline bounds are exact in every case. |
| 2 | Bow and blade are two sub-paths, so the stroke shows a seam where they meet. | 2 rings in the path for every key. | One closed outline. The key-ring hole is the only second ring. |
| 3 | The edge highlight is the outline shifted 0.4 mm and is never clipped, so it can show outside the silhouette. | Reading `renderKey`. | The highlight is clipped to the outline. |
| 4 | The tip crosses itself. | On SC1 and SC4 the blade polygon is invalid in 36 of 36 test bittings. At the end of the blade the top edge sits 0.032 mm below the bottom edge. | `shapely` reports a valid polygon in all 1,040 v5 cases. |
| 5 | No key-ring hole. | The bow is a plain slab. | A hole sized per profile: 4.05 to 5.20 mm diameter (4.84 mm on SC1). It is cut through in the STL and written as a circle in the DXF. |
| 6 | Cuts are cosine bumps, and the lowest cut value draws no cut at all. | Shallowest cut depth 0 mm on every profile. | Milled V-cuts: 45 degree flanks, a flat 0.8 mm root, and a minimum depth of 0.45 mm so every position has a seat. A deep cut's flank steepens if it would reach into the next pin. |

### Scaling, aspect ratio and zoom

| # | v4 | Evidence | v5 |
| --- | --- | --- | --- |
| 7 | Each profile fits its own viewBox, so keys are not drawn at the same scale. | 4.94 to 5.99 px/mm at 390 px wide (a 19.3% spread); 5.05 to 5.99 at 1280 px (17.1%). | One fixed 76 x 25 mm window (the longest key, 71 mm, plus a margin). 5.13 px/mm at 390 px and 9.47 px/mm from 768 px up, identical for all eight profiles. |
| 8 | The viewBox wastes space. | On SC1 the key is 67 x 19.7 mm inside a 75 x 37.7 mm viewBox: 52% of the height used. | The window is sized to the longest key. |
| 9 | Zoom works from the centre only: a two-finger pinch (touch only) or the slider, with no pan and no mouse or trackpad zoom. Every zoom step re-renders the scene. | At 3x on a phone about 37% of the key is visible on SC1 (37% to 40% across profiles). | Pinch, drag, Ctrl/Cmd + wheel and double-tap reset, as one CSS transform. The pan is clamped so at least 48 px of the key stays on screen. At 3x both ends of every key can be brought on screen. |

### Exports

| # | v4 | Evidence | v5 |
| --- | --- | --- | --- |
| 10 | The STL face does not match the key on screen. It is fanned from one corner of a simplified bow. | 34.1 mm² off, 5.0% of the face (SC1, bitting 32514). Note: `audit_original.py` prints 34.2 because it samples curves more coarsely than the figure script. | 0.5 mm², 0.08% (the arc-flattening tolerance of 0.02 mm). The face is cut from the same outline the screen draws. |
| 11 | The STL is not a closed solid. | 7 edges shared by more than two triangles (10 on Y1 and BEST); computed volume -533 mm³ on SC1 (the solid is inside-out). | Watertight, consistent winding, one through-hole (Euler number 0). Volume is outline area x thickness to within 0.035% in all 1,040 cases. |
| 12 | The STL is large. | 213 KB of ASCII and 1,180 facets (SC1, 32514). | 19 KB binary and 392 facets. Across the eight profiles the files are 10.7x smaller. The binary header does not start with `solid`, so tools that sniff the header do not mistake it for ASCII. |
| 13 | The DXF is loose LINE entities with no units, and only the blade. | 144 LINE entities on SC1 (114 to 151 across profiles); the X extent is 0 to 43 mm for a 67 mm key. | One closed POLYLINE with arc bulges, plus the key-ring CIRCLE. Millimetres declared in the header (`$INSUNITS` 4). The origin is at the blade shoulder. |
| 14 | The SVG export is a fixed 10 px per millimetre with pixel dimensions and uneven margins. | Margins of 4 mm at the sides, 10 mm above the bow and 7 to 9 mm below the blade, depending on the profile. | True size: width and height in millimetres on a 1:1 viewBox, with 0.5 mm of padding. |

### Edge cases

| Case | Result |
| --- | --- |
| NaN, out-of-range, too-short and negative bittings | `cleanBits` normalises them, and all four produce a valid, watertight solid on every profile. v4 was not tested with these inputs (the page only ever passes slider integers), so this is a property of v5's engine, not a v4 defect. |
| First preset, all-minimum, all-maximum, alternating minimum and maximum, staircase | Valid, watertight, depth exact. |
| 120 random bittings per profile | Valid, watertight, depth exact. |
| Cut depth at every pin centre | Equals `shoulderH - depth` to within 1.8e-15 mm in every case. |
| Shortest outline edge | 0.0425 mm (SC1 and SC4). The check fails below 0.0001 mm. |
| Keyhole wall | At least 5.4 mm of material between the hole and the outline in every case (the check fails below 2 mm). |
| Tip | SC1, SC4, Y1 and AR1 taper to a near-point (end face about 0.001 mm). No printer can reproduce a feature that fine, so expect the printed tip to be blunter than the drawing. |

### Performance

Not a problem in either version. A redraw fell from roughly 0.3 to 0.4 ms to roughly 0.07 to 0.10 ms across repeated runs, because moving a slider now rewrites path data instead of rebuilding the scene. Both are far below one frame (16.7 ms at 60 Hz). The SVG path data is 6.6x shorter (average of 8 profiles).

## What changed

All of it is in four blocks of the app's script and one CSS rule. Everything else is copied unchanged.

| Block | What it does now |
| --- | --- |
| `KEY GEOMETRY` (about 325 lines, `geom.js` in the audit history) | `keyContour` builds one closed, counter-clockwise outline as a polygon whose corners carry fillet radii. The V-cuts are vertices of that polygon, taken from the lower envelope of every cut trapezoid, so neighbouring cuts cannot overlap. `buildPath` writes true SVG arcs. `flattenContour` turns arcs into segments (0.02 mm tolerance) for the STL. `triangulate` joins the hole to the outline with a bridge and clips ears, keeping every vertex so the side walls and faces share them. `buildSTL` writes a binary STL; `buildDXF` writes R12. The tunable constants are `CUT` (base 0.45, flat 0.8, flank 1.0) and `FLATTEN_TOL` (0.02). |
| `RENDER KEY SVG` | The scene (gradients, clip path, grooves, labels) is built once per key type in a fixed 76 x 25 mm viewBox. Moving a slider only rewrites path data and label values. |
| `PINCH ZOOM` | Pointer Events for pinch and drag-to-pan, Ctrl/Cmd + wheel zoom, double-tap reset and a clamped pan. |
| `EXPORT` | SVG in millimetres, binary STL, DXF R12. File names are unchanged. |
| CSS | `.preview svg` sized to its container; text selection off in the preview so a drag that starts on a pin label pans instead of selecting. |

## How to verify

See `docs/1keyforge-audit/README.md` for set-up and the five commands. The short version:

```bash
node docs/1keyforge-audit/dump_geom.js private/apps/1keyforge-pro.html /tmp/keyforge-dump.json
python docs/1keyforge-audit/check_geom.py /tmp/keyforge-dump.json   # FAILURES: 0
python docs/1keyforge-audit/audit_app.py private/apps/1keyforge-pro.html /tmp/app.json   # FAILED: 0, 27 checks
```

What each covers:

| Script | Cases | What it checks |
| --- | --- | --- |
| `check_geom.py` | 1,040 (8 x 130) for outline and STL; 320 (8 x 40) for DXF | Outline validity and bounds, cut depths, STL mesh properties, DXF content and agreement with the outline. |
| `audit_app.py` | 27 checks in Chromium | Scale at four viewports, zoom and pan, UI flow, the three downloads, SVG against the polygon (IoU above 0.998 on all eight profiles), timings, clean console. |

## Limitations

- **Dimensions are approximations.** The numbers in `KEY_TYPES` are working approximations. The original source carries a comment citing ANSI/BHMA, but nothing in the audit or the file establishes where the values come from, and they have not been compared with manufacturer drawings. The audit measures whether the app draws and exports the shape it describes, not whether the description is right.
- **Exports were not tried on real machines.** The STL and DXF were opened and measured with libraries. They were not loaded into a slicer, printed, or cut. The STL toast still reads "Bambu A1 Mini optimized", which is the original wording; nothing here tests that printer, so consider "STL ready".
- **Chromium only.** The browser checks ran in headless Chromium. Safari (the main target, given the Apple home-screen tags) and Firefox were not tested.
- **Not a PWA yet.** There is no manifest and no service worker, and the viewport disables browser zoom (`user-scalable=no`). Saved Cuts live in memory and vanish on reload.
- **Intended use.** For visualising, learning and prototyping, not for copying a key you do not own or are not authorised to duplicate.

## Suggested next steps

1. Mark each profile as an approximation in the interface, and record where each dimension comes from in `KEY_TYPES`.
2. Open one STL in a slicer and one DXF in a CAM or laser tool, and note what they report.
3. Add a web manifest and a service worker; persist Saved Cuts in `localStorage`; add share links such as `?k=SC1&b=32514`.
4. Accessibility: allow browser zoom, check the contrast of the orange labels, add a reduced-motion path.
5. Run `check_geom.py` and `audit_app.py` in CI so a geometry regression fails the build.
