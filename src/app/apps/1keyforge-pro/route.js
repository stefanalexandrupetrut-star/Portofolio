import fs from "node:fs/promises";
import path from "node:path";
import { isDeveloperRequest } from "@/lib/devAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────
// 1KeyForge Pro, the app itself — for the developer only.
//
// The app is a single HTML file kept OUTSIDE /public (in private/apps/), so the web server never
// hands it out by itself. This route is the only way to it, and it checks who is asking:
//   • `npm run dev`            → always you, the app opens.
//   • a deployed site          → opens only for a browser that has unlocked Developer Mode
//                                (the form on /admin, ADMIN_TOKEN — see src/lib/devAccess.js).
//   • everybody else           → a short "this app is private" page (HTTP 403). Nothing of the app is sent.
// The project pages show visitors screenshots instead.
//
// Two ways to open it, both developer-only:
//   /apps/1keyforge-pro            → the full app. Exports (SVG, STL, DXF) and Copy Bitting Code work.
//   /apps/1keyforge-pro?preview=1  → what the phone frame on the project page loads. Same app, but its export
//                                    buttons are grayed out and switched off (see PREVIEW_LOCK below), so the
//                                    preview can show the app without ever handing out a file.
// ─────────────────────────────────────────────────────────────────

const APP_FILE = path.join(process.cwd(), "private", "apps", "1keyforge-pro.html");

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Content-Type": "text/html; charset=utf-8",
};

// A small page in the portfolio's colours, for the two cases where the app is not served.
function notice(status, heading, text, links) {
  const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${heading} — Alex Stefan</title>
<style>
  *{box-sizing:border-box;margin:0}
  body{min-height:100vh;display:grid;place-items:center;padding:24px;background:#0a0a0a;color:#f5f4f0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  main{max-width:460px}
  .k{font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#e0263a;margin-bottom:14px}
  h1{font-size:clamp(30px,6vw,42px);line-height:1.05;margin-bottom:16px}
  p{font-size:15px;line-height:1.7;color:#a8a8a8;margin-bottom:26px}
  code{background:#1e1e1e;padding:2px 6px;border-radius:3px;font-size:13px;color:#f5f4f0}
  .row{display:flex;gap:10px;flex-wrap:wrap}
  a{display:inline-block;padding:12px 20px;border-radius:3px;border:1px solid rgba(224,38,58,.4);color:#f5f4f0;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase}
  a.p{background:#e0263a;border-color:#e0263a}
  a:focus-visible,a:hover{border-color:#ff3355}
</style>
</head>
<body>
<main>
  <div class="k">${status === 403 ? "Private" : "Not found"}</div>
  <h1>${heading}</h1>
  <p>${text}</p>
  <div class="row">${links}</div>
</main>
</body>
</html>`;
  return new Response(body, { status, headers: PRIVATE_HEADERS });
}

// Added to the end of the app (after its own script has run) when the phone preview asks for it. It does three things:
//   1. replaces the app's export / copy / download functions, so nothing can be triggered, however it is called;
//   2. grays out and disables every button in the Export panel;
//   3. adds one line of explanation under them.
// The app file itself is not changed: the full app at /apps/1keyforge-pro stays exactly as it is.
const PREVIEW_LOCK = `
<style id="kf-preview-lock">
#panel-export .xbtn[disabled]{background:#e5e7eb !important;color:#9ca3af !important;box-shadow:none !important;cursor:not-allowed;transform:none !important;filter:grayscale(1)}
#panel-export .kf-preview-note{margin:2px 2px 0;padding:10px 12px;border-radius:8px;background:#f3f4f6;color:#6b7280;font-size:12px;line-height:1.5;text-align:center}
</style>
<script id="kf-preview-lock-js">
(function(){
  var MSG='Exports are switched off in this preview.';
  function say(){ try{ if(typeof toast==='function') toast(MSG); }catch(e){} }
  ['exportSVG','exportSTL','exportDXF','copyBitting','dl'].forEach(function(n){ try{ window[n]=say; }catch(e){} });
  var panel=document.getElementById('panel-export');
  if(!panel) return;
  [].forEach.call(panel.querySelectorAll('button'),function(b){
    b.disabled=true; b.setAttribute('aria-disabled','true'); b.removeAttribute('onclick'); b.title='Switched off in this preview';
  });
  var note=document.createElement('div'); note.className='kf-preview-note'; note.textContent='Exports are switched off in this preview.';
  panel.appendChild(note);
})();
</script>
`;

function withPreviewLock(html) {
  const at = html.toLowerCase().lastIndexOf("</body>");
  return at === -1 ? html + PREVIEW_LOCK : html.slice(0, at) + PREVIEW_LOCK + html.slice(at);
}

export async function GET(request) {
  if (!isDeveloperRequest(request)) {
    return notice(
      403,
      "1KeyForge Pro is private",
      "Only the developer of this site can open the app. You can see how it looks, and read how it was built, on the project page.",
      '<a class="p" href="/case-studies/1keyforge-pro-detail.html">See the app screens</a><a href="/case-studies/1keyforge-pro.html">Read the case study</a>'
    );
  }

  let html;
  try {
    html = await fs.readFile(APP_FILE, "utf-8");
  } catch {
    // The developer is signed in, but the file is not on this machine or server.
    return notice(
      404,
      "The app file is not on this server",
      "Put the app at <code>private/apps/1keyforge-pro.html</code> next to <code>package.json</code> and restart. The README explains how to keep it private on GitHub and on your host.",
      '<a class="p" href="/admin">Back to Developer Mode</a>'
    );
  }
  if (new URL(request.url).searchParams.get("preview") === "1") html = withPreviewLock(html);
  return new Response(html, { status: 200, headers: PRIVATE_HEADERS });
}
