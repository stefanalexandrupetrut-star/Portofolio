import fs from "fs/promises";
import path from "path";
import { isAuthorized, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────
// Saves an uploaded image into /public/images/<folder>/<filename>.
//
// Every path here is built from process.cwd() + path.join() — never
// a hardcoded absolute path — so the same code works identically on
// your laptop, a teammate's machine, or a Node server in production.
// Files land inside /public, which is the normal, git-trackable home
// for static assets in a Next.js project: commit them like any other
// file and they deploy with the rest of the site.
//
// IMPORTANT — read this if you're deploying to Vercel/Netlify/etc.:
// most serverless hosts give your app a READ-ONLY filesystem at
// runtime (or an ephemeral one that resets on every deploy). This
// route works perfectly for local development — that's the intended
// workflow: curate content with `npm run dev`, then commit and push
// the new files in /public/images. It will likely fail (or silently
// not persist) if called against a live serverless deployment.
// If you want visitors — or you, without redeploying — to upload
// images on a live site, swap the "save to disk" step below for an
// upload to Cloudinary or Supabase Storage instead. See README.md.
// ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
// SVG is intentionally excluded from uploads — an uploaded SVG can
// contain a <script>, which is a real XSS risk for user-supplied
// files. The placeholder SVGs shipped in this repo are fine because
// *you* wrote them, not because SVG uploads are generally safe.

// Only allow known, simple folder names — prevents "../../etc" style
// path traversal from ever reaching the filesystem.
function sanitizeFolder(folder) {
  const clean = String(folder || "misc").replace(/[^a-z0-9\-\/]/gi, "");
  const parts = clean.split("/").filter(Boolean).slice(0, 2); // e.g. "projects/1keyforge-pro"
  return parts.length ? parts.join("/") : "misc";
}

// The extension is decided by the image type that was accepted above, never by what the file is called, so
// an upload can never be saved as .html or .js and then served as a page.
const EXTENSIONS = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

function sanitizeFilename(name, type) {
  const ext = EXTENSIONS[type];
  const base = path
    .basename(name || "image", path.extname(name || ""))
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "image";
  return `${Date.now()}-${base}${ext}`;
}

export async function POST(request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Send the picture as a multipart form upload." }, { status: 400 });
  }
  const file = formData.get("file");
  const folder = sanitizeFolder(formData.get("folder"));

  if (!file || typeof file === "string") {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: "Unsupported file type. Use JPG, PNG, WEBP, or GIF." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "File is larger than 8MB." }, { status: 400 });
  }

  const filename = sanitizeFilename(file.name, file.type);
  const relativeDir = path.join("images", folder);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);

  await fs.mkdir(absoluteDir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(absoluteDir, filename), bytes);

  // Root-relative URL — this is what gets stored in projects.json /
  // site.json, and it resolves the same way in dev and in production.
  const url = `/${relativeDir}/${filename}`.replace(/\\/g, "/");

  return Response.json({ url });
}
