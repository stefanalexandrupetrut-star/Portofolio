# Alex Stefan — Portfolio

A Next.js portfolio with a real content-management layer: add, edit, duplicate,
and delete projects, and upload images, without touching code.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the site. Click the
gear icon in the bottom-right corner (or go to
[http://localhost:3000/admin](http://localhost:3000/admin)) for the content
manager — "Developer Mode."

Before you upload the site, run these two checks. The build should finish
without errors, and the audit should report `found 0 vulnerabilities`:

```bash
npm run build
npm audit
```

Node.js 20.9 or newer is required (Next.js 16). If you installed an earlier
copy of this project, run `npm install` again after replacing the files so the
newer, patched versions are fetched (see "Dependencies and `npm audit`" below).

## Getting this into Git

```bash
git init
git add .
git commit -m "Initial portfolio"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

`node_modules` and `.next` are git-ignored. `public/images` **is** tracked —
your uploaded photos are meant to be committed like any other file, which is
what keeps this free to host (no database, no paid storage required).

## How the content works

No database — content lives in two JSON files:

- `data/site.json` — hero text, skills/software list, studios list, contact info
- `data/projects.json` — every project: title, category, description, tags,
  external link, extra text sections, videos, and its image gallery

Images live in `public/images/...` and are referenced by root-relative paths
like `/images/projects/military-ops/my-shot.jpg` — never an absolute file
path — so the same file works identically in development and once deployed.

### Adding, editing, and duplicating projects

Open Developer Mode (the gear icon) while running `npm run dev`. You can:

- Edit the hero text and the skills/software and studios lists
- Add a new project — pick a category (**UI/UX Design** or **Personal
  Projects**), title, description, tags, and an optional external link
- **Duplicate** an existing project (keeps all its text — swap the images
  and you're done) instead of retyping everything from scratch
- Tick **Work in progress** to put a red **WIP** chip on the project's cards
  and a "work in progress" note on its page, or type a **status chip** such as
  "On itch.io" (see "WIP markers and status chips" below)
- Upload images into a project's gallery, or remove one — the *first* image
  becomes that project's cover image, shown large at the top of its page
- Add or remove **videos** — paste any normal YouTube link (a `watch?v=...`
  or `youtu.be/...` URL); it's converted to an embeddable player
  automatically. Add as many or as few as a project actually has — there's
  no fixed limit, and an empty list just shows nothing instead of a broken
  player.
- Add extra **text sections** (a heading + a paragraph) for projects that
  need more than the one main description — also unlimited, also optional.
- Delete a project

Every change writes directly to the JSON files and to `public/images`. When
you're happy with it:

```bash
git add .
git commit -m "Update portfolio content"
git push
```

You can also skip the admin UI and hand-edit `data/projects.json` /
`data/site.json` directly — they're just JSON.

## Image uploads — how they work, and their limits

The upload button in Developer Mode sends the file to `/api/upload`
(`src/app/api/upload/route.js`), which saves it under `public/images/...`
using `process.cwd()` + `path.join()` — never a hardcoded path — and hands
back a URL like `/images/projects/military-ops/169..._shot.jpg`.

**This works great for local development** — curate your content with
`npm run dev`, then commit and push the new files.

**It will not persist on most serverless hosts in production** (Vercel,
Netlify, etc. typically give your app a read-only or ephemeral filesystem at
runtime). Developer Mode is meant for local content editing, not as a public
admin panel on the live site.

### If you want live, in-production uploads

Swap the "save to disk" step in `src/app/api/upload/route.js` for a call to
Cloudinary or Supabase Storage instead — both accept a file and return a
public URL, exactly like the local version does now. `.env.example` has
placeholders for Cloudinary credentials to get you started.

## Developer Mode access & security

Two things on this site are for the developer only: **Developer Mode** (`/admin`
and everything that saves changes) and the **1KeyForge Pro app**. Visitors
never get either.

- **`npm run dev` (your own computer):** you are always the developer. Nothing to
  set up. `/admin` opens straight away and the 1KeyForge Pro app opens in its
  phone frame (with its export buttons grayed out; "Launch app" opens the full
  app, where exporting works).
- **A deployed site:** set `ADMIN_TOKEN` in your host's environment variables
  (see `.env.example`). Then open `/admin` on the live site once and type the
  token. The browser is unlocked for 14 days: the content manager opens, saving
  works, and the 1KeyForge Pro app opens. "Lock again" on `/admin` locks it
  sooner.
- **No `ADMIN_TOKEN` on a deployed site:** nobody is the developer. `/admin`
  shows a notice, nothing can be saved and the app stays shut.

How it works, in short (all of it is in `src/lib/devAccess.js`): the token is
checked on the server and is never stored in the browser. A successful unlock
sets a cookie that is HttpOnly (page scripts cannot read it), SameSite=Strict
and signed with the token, so it cannot be forged or edited, and it expires by
itself. Wrong guesses are slowed down (8 tries per ten minutes per address).
Use a long random token: `openssl rand -hex 24`.

The gear icon links to `/admin` on every page, so you can always find it. A
visitor who clicks it only sees the sign-in form. For anything beyond "just me
editing my own site," swap `src/lib/auth.js` for real authentication (for
example NextAuth).

## Project structure

```
data/                    ← your content (git-tracked JSON)
public/images/           ← your images (git-tracked)
public/case-studies/     ← hand-built case study and project pages (static HTML)
private/apps/            ← the 1KeyForge Pro app — NOT public, served only to you (see below)
docs/                    ← notes and measuring scripts; not part of the site
src/app/                 ← pages (Home, Work, Work/[slug], Contact, Admin)
src/app/apps/            ← the gated route that serves the private app
src/app/api/             ← API routes (projects, upload, site, dev/session)
src/components/          ← UI components (RevealOnScroll is rendered inside each page, not the layout; see the note at the top of that file)
src/lib/                 ← data access, developer access, auth, YouTube-embed conversion
```

The project has no lint tooling on purpose (see "Dependencies and `npm audit`"
below), so there is no `eslint.config.mjs` and no `npm run lint`.

## Hand-built case studies and apps

Some projects are bigger than the generic project page, so they live as plain
HTML in `public/case-studies/` and are linked from `data/projects.json`:

- `hubUrl` — the page a project's card opens (for example
  `/case-studies/1keyforge-pro-detail.html`). With a `hubUrl` the card is an
  ordinary link to that file; without one it opens `/work/<slug>`.
- `link` / `linkLabel` — the button on the project's generic `/work/<slug>`
  page (for 1KeyForge Pro that is the full case study).

These pages are not edited in Developer Mode; change the HTML files directly.
On a Personal project's page, the back button ("← Personal Projects") links to
`/work?tab=personal`, so the Work page reopens on the Personal tab instead of
the UI/UX one.

**1KeyForge Pro** is the example with all three layers:

| File | What it is |
| --- | --- |
| `private/apps/1keyforge-pro.html` | The app itself, one self-contained file. **Private:** not in `public/`, so the web server never hands it out. Only `src/app/apps/1keyforge-pro/route.js` serves it, and only to the developer, at `/apps/1keyforge-pro`. |
| `public/case-studies/1keyforge-pro-detail.html` | The project page: for visitors, four screenshots in a phone frame (nothing in them can be clicked, so nothing can be exported); for you, the live app in the same frame, with its export buttons grayed out, plus "Launch app". |
| `public/images/projects/1keyforge-pro/preview-*.webp` | The four screenshots (Bitting, Key Type, Presets, Export) shown to visitors. Retake them if the app's look changes. In the Export one the buttons are grayed out, as they are in your own phone frame; to retake it, open `/apps/1keyforge-pro?preview=1` on your computer. |
| `public/case-studies/1keyforge-pro.html` | The full case study. |
| `docs/1keyforge-key-shape-review.md` | The key shape review: findings, what changed, limits. |
| `docs/1keyforge-audit/` | The scripts and results behind that review (see its own README). |

### 1KeyForge Pro is private — and how to keep it that way

The project page asks the server (`/api/dev/session`) whether the visitor is the
developer. If not, or if anything goes wrong, it shows the screenshots; the app
is never sent. Opening `/apps/1keyforge-pro` directly shows a "this app is
private" page (HTTP 403) to everyone but you, and the old address
`/apps/1keyforge-pro.html` redirects to it.

### Exports: grayed out in the phone frame, working in the app

The app has two addresses, both for you only:

| Address | What it is |
| --- | --- |
| `/apps/1keyforge-pro` | The real app. Export SVG, Export STL (3D Print), Export DXF (CNC) and Copy Bitting Code all work. "Launch app" and "Copy app link" use this address. |
| `/apps/1keyforge-pro?preview=1` | The same app, for the phone frame on the project page. All four buttons in the Export tab are grayed out and switched off, and a note says exports are off in this preview. |

The `?preview=1` copy is made on the fly by `src/app/apps/1keyforge-pro/route.js`,
which adds a small style and script to the page just before it is sent. The
app file in `private/apps/` is not changed, so the real app still exports. The
switch-off is the `PREVIEW_LOCK` block in that route file. Visitors get neither
address (HTTP 403), so they can never reach an export, grayed out or not.

The app's source also has to stay out of places the public can read:

- `private/` and the original upload
  `docs/1keyforge-audit/1KeyForge_4.original.html` are listed in `.gitignore`,
  so `git add .` will not publish them.
- If you remove those lines (see the next section), keep the GitHub repository
  **private**. A public repository shows the app's source to everyone.

### Putting the app on your server

By default the app opens on your own computer (`npm run dev`) but is not pushed
to GitHub, so a site deployed from GitHub shows you the "app file is not on this
server" notice. To open it on the live site as well:

1. Make sure the GitHub repository is **private** (Vercel can deploy private
   GitHub repositories).
2. Delete the two lines under "Private: the 1KeyForge Pro app" in `.gitignore`.
3. Commit and push (`git add .`, `git commit`, `git push`).
4. Set `ADMIN_TOKEN` on the host, open `/admin` on the live site, unlock, and
   open the 1KeyForge Pro project page.

If you deploy by uploading the folder instead of using Git, `private/` is part of
the upload and nothing else is needed.

## WIP markers and status chips

Three optional fields in `data/projects.json` (or the Edit form in Developer
Mode) change how a project is labelled:

| Field | Effect |
| --- | --- |
| `"wip": true` | A red **WIP** chip on the project's card, on the home page thumbnail and by the title on its page, plus a "work in progress" note. |
| `"badge": "On itch.io"` | A white chip with that text, next to the WIP chip. |
| `"extraLinks": [{ "label": "…", "url": "…" }]` | More buttons on the project page, before the main link. |

**Isometric Islands Project**, **Space Adventure** and **The Beekeeper's
Journey** are marked WIP and use a generated red-on-black cover
(`public/images/projects/<slug>/wip.webp`, 1600 × 1000). When a project is
ready, upload its real images in Developer Mode, drag the real cover to the
front (the first image is the cover), delete `wip.webp` from the list, and untick
"Work in progress".

## ChibiChum on itch.io

ChibiChum is already available on itch.io, and the site says so in five places:
the white "On itch.io" chip on its Work card, the button on `/work/chibichum`,
the project page (`chibichum-detail.html`), and the case study
(`chibichum.html`, cover and outcome).

The link in all of them is currently

`https://itch.io/search?q=CHIBICHUM`

which is a search on itch.io, not the game's own page. When you have the direct
address (`https://<your-name>.itch.io/chibichum`), replace the search address in:

- `data/projects.json` → `chibichum` → `extraLinks`
- `public/case-studies/chibichum-detail.html` (one link)
- `public/case-studies/chibichum.html` (two links)

A find-and-replace of `https://itch.io/search?q=CHIBICHUM` across the project
does all of it.

**Urban Strife** is built like Military Ops: a project page that leads on to
the full case study.

| File | What it is |
| --- | --- |
| `public/case-studies/urbanstrife-detail.html` | The project page the card opens: official art, overview, video, screens, and the link to the case study. |
| `public/case-studies/urbanstrife.html` | The full case study. Its "Back to Urban Strife" button returns to the project page. |
| `public/images/projects/urbanstrife/` | The 25 screens. |

The official art is loaded from Steam's servers and is not stored in this
repo:

- The card on the Work and home pages uses the Steam header image: the first
  entry of `images` for `urbanstrife` in `data/projects.json`.
- The banner at the top of the project page tries Steam's wide library hero,
  then Steam's page background, then your own `hero-journal.jpg`, so it never
  shows a broken picture (the `data-fallbacks` list on `#hero-img`).

To keep a copy of the art in the repo instead, save it as
`public/images/projects/urbanstrife/official.jpg`, make
`/images/projects/urbanstrife/official.jpg` the first entry of `images` in
`data/projects.json`, and use the same path as the `src` of `#hero-img` in the
project page.

The video is the `videos` entry in `data/projects.json` (used by the generic
`/work/urbanstrife` page) and the `<figure class="video">` block in the
project page. To add another, copy that block; two or more lay out side by
side.

**ChibiChum** (formerly Retro PetZ) is built like 1KeyForge Pro, minus the
demo: the Work card opens a project page, which leads on to the full case
study.

| File | What it is |
| --- | --- |
| `public/case-studies/chibichum-detail.html` | The project page the card opens: overview, facts, the four screens, closing notes. |
| `public/case-studies/chibichum.html` | The full case study: identity, product vision, game systems, architecture, gallery, lessons. |
| `public/images/projects/chibichum/` | The four screens and three figure images. |

The pictures are built from your own boards of the game: panels cut out of the
boards, at their original size where the layout allows it, and placed on a dark
1600 × 900 ground. Nothing is redrawn. To change one, replace the file with a
PNG of the same name (16:9, 1600 × 900). No code change is needed. The
project-page banner (21:9) and the Work card (16:10) crop the picture to fit, so
keep the main action near the middle.

| File | Shows | Used in |
| --- | --- | --- |
| `main_room.png` | The main screen between the Halloween and Christmas sets | Work/home card, project-page banner, case-study cover and gallery |
| `minigames.png` | Bath, teeth, fitness and Fruit Slash | Project-page carousel, case-study gallery |
| `shop_customization.png` | The Menu, the Shop's Room tab and the Holiday shelf | Project-page "Full Case Study" card, carousel, gallery |
| `desktop_widget.png` | The Electron widget on a Linux desktop: on the desktop, its tray menu, a normal window | Carousel, gallery, and the case study's overview |
| `ad_break.png` | Out of GP: the commercial break, in four screens | Case study, board 03 (Monetization card) |
| `window_sizes.png` | The same screen at four window sizes | Case study, board 04 (after the platform table) |
| `device_body.png` | The handheld's casing, v1.5 against v1.6, with the corner zoomed | Case study, board 06 (under the engineering lessons) |

The three figure images show as 21:9 strips on the page (the middle of the
picture) and whole, at 16:9, in the viewer. The viewer steps through all seven
pictures of the case study, gallery first.

Notes:

- The project was renamed. Its slug is now `chibichum`, and `next.config.mjs`
  redirects the old `/work/retro-petz` address to `/work/chibichum`.
- The desktop captures were taken on a Linux desktop, and the board they came
  from says Windows was not tried, so every caption says "Linux" rather than
  Windows. They also still show the old name, "Retro petZ", in the tray menu and
  the window title. When you have a capture of the renamed widget on Windows,
  replace `desktop_widget.png` and change those captions.
- The sketchbook screen is not in the boards. The Shop slot shows the Menu
  (which has a Sketchbook tile) instead, and its caption says so.
- Two of the ten boards are not used: the Android icons and launch screen, and
  the phone app rehearsed in a browser. Both say they are simulated, not
  captures from a phone.
- Three captions quote numbers from the boards that are not in the case-study
  brief: the 30 s cooldown and 5 a day on the commercial break, and the 420 px
  cap on a desktop. Check them against the game before publishing.
- The pages describe the stack as TypeScript, HTML5 Canvas, Tauri and
  Electron, CSS3 and the Web Audio API, as in the case-study brief. The boards
  show Electron and Capacitor; Tauri does not appear in them. An earlier
  version of the card described a React Native / Expo mobile app; the case
  study therefore refers to "the original mobile build" where it mentions
  `resizeMode` and `useDeviceMetrics`. Edit those lines if the history should
  read differently.
- The brief gave no store links or download numbers. The only release
  information shown is that ChibiChum is available on itch.io (see "ChibiChum on
  itch.io" above); no download counts are shown.

## Dependencies and `npm audit`

The project has three dependencies: `next`, `react` and `react-dom` (about 30
packages once installed). With the versions in `package-lock.json` (Next.js
16.4.6, React 19.2.8), `npm audit` reports **0 vulnerabilities**.

Two things were behind the red `npm audit` warnings on the first copy
("15 vulnerabilities (14 high, 1 critical)"):

- **1 critical: Next.js.** Versions up to 16.4.4 have published security
  advisories. The project is on 16.4.6, which is past all of them.
- **14 high: one `picomatch` advisory (GHSA-fc5q-39xc-vjpf), counted once for
  every package that uses it.** All of them sat in the ESLint tool chain
  (`eslint`, `eslint-config-next` and the packages under them), which is a
  development aid and was never part of the site. No patched `picomatch`
  exists yet, so there was nothing to upgrade to, and npm's own suggested fix
  (going back to `eslint-config-next` 14) is not a real fix. The lint tools were
  therefore removed: `eslint`, `eslint-config-next`, `eslint.config.mjs` and the
  `lint` script. The pages and API routes are unaffected.

If you want linting back later, `npm install -D eslint eslint-config-next`,
add an `eslint.config.mjs`, and run `npm audit` straight away. If it lists the
`picomatch` advisory again with no fix available, leave linting out until a
patched version exists.

Run `npm audit` before each deploy. If it ever lists a new advisory for `next`,
run `npm install next@latest`, then `npm run build`.

`next.config.mjs` also sets `agentRules: false`. Without it, Next.js 16.4 writes
an `AGENTS.md` file (instructions for AI coding tools) into the project folder
each time `npm run dev` starts, and that file would end up in your Git commits.

## Troubleshooting

**`npm run dev` prints "A tree hydrated but some attributes of the server rendered HTML didn't match".**
React prints this in development only. The usual cause is a browser extension
(a spell checker, a dark-mode add-on, a password manager, a translator) that adds
attributes to the page before React starts. `src/app/layout.js` already tells
React to ignore that on `<html>` and `<body>`. If the message still appears, open
the site in a private window with extensions off. If it is still there, the lines
starting with `+` and `-` under the message name the element and attribute that
differ; those lines are what is needed to track it down.

## Deploying

Any host that runs a Node.js server works (Vercel is the simplest for
Next.js — connect the GitHub repo and it deploys on every push, for free on
Vercel's Hobby tier for a personal site like this).

Environment variables to set on the host (see `.env.example`):

| Variable | Needed for |
| --- | --- |
| `ADMIN_TOKEN` | Developer Mode and the private 1KeyForge Pro app on the live site. Without it, neither opens there. |
| `NEXT_PUBLIC_SITE_URL` | The public address (for example `https://alexstefan.com`), so a link shared on social media shows the right picture. Vercel fills this in by itself. |

Checklist before you upload:

1. `npm run build` finishes without errors and `npm audit` reports 0 vulnerabilities.
2. The repository is private if you chose to publish `private/` (see above).
3. `ADMIN_TOKEN` is set, so you can open Developer Mode on the live site.
4. Content edits made in Developer Mode on a live serverless site do **not**
   persist (the host's disk is read-only); make content changes locally with
   `npm run dev`, commit, and push.
