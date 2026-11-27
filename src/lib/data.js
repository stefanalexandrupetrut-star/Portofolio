// ─────────────────────────────────────────────────────────────────
// Server-side data access. Everything here reads/writes the JSON
// files in /data using process.cwd() — never a hardcoded absolute
// path — so this works the same on your machine, a teammate's
// machine, or a deployed server.
//
// This is intentionally "just JSON files" rather than a database:
// for a personal portfolio it means every change is a normal git
// diff, there's nothing to provision, and you can hand-edit the
// files directly if you ever want to skip the admin UI.
// ─────────────────────────────────────────────────────────────────
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_PATH = path.join(DATA_DIR, "projects.json");
const SITE_PATH = path.join(DATA_DIR, "site.json");

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

// Writes to a temporary file first and then renames it over the real one. A rename is all-or-nothing,
// so a crash or a second save at the same moment can never leave a half-written (broken) JSON file.
async function writeJson(filePath, data) {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf-8");
  await fs.rename(tmp, filePath);
}

export async function getProjects() {
  return readJson(PROJECTS_PATH);
}

export async function getProject(slug) {
  const projects = await getProjects();
  return projects.find((p) => p.slug === slug) || null;
}

export async function saveProjects(projects) {
  await writeJson(PROJECTS_PATH, projects);
}

const CATEGORIES = new Set(["ui-ux", "personal"]);
const isString = (v) => typeof v === "string";
const stringList = (v) => (Array.isArray(v) ? v.filter(isString).map((x) => x.trim()).filter(Boolean) : []);

// Cleans the fields that came from the admin form (or any other caller of the API) so a wrong type —
// a string where a list belongs, say — can never be written into projects.json and break a page.
// Only the fields that are present are returned, so it works for both "create" and "update".
function cleanFields(input = {}) {
  const out = {};
  for (const key of ["title", "subtitle", "icon", "description", "link", "linkLabel", "badge", "hubUrl"]) {
    if (key in input && (isString(input[key]) || input[key] == null)) out[key] = (input[key] ?? "").toString();
  }
  if ("category" in input && CATEGORIES.has(input.category)) out.category = input.category;
  if ("wip" in input) out.wip = input.wip === true || input.wip === "true";
  for (const key of ["tags", "videos", "images"]) {
    if (key in input && Array.isArray(input[key])) out[key] = stringList(input[key]);
  }
  if ("textSections" in input && Array.isArray(input.textSections)) {
    out.textSections = input.textSections
      .filter((t) => t && typeof t === "object")
      .map((t) => ({ heading: isString(t.heading) ? t.heading : "", body: isString(t.body) ? t.body : "" }))
      .filter((t) => t.heading.trim() || t.body.trim());
  }
  if ("extraLinks" in input && Array.isArray(input.extraLinks)) {
    out.extraLinks = input.extraLinks
      .filter((l) => l && isString(l.label) && isString(l.url) && l.label.trim() && l.url.trim())
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }));
  }
  if ("modules" in input && Array.isArray(input.modules)) out.modules = input.modules.filter((m) => m && typeof m === "object");
  return out;
}

// Every project gets this shape. `images[0]` doubles as the cover
// image shown at the top of its page — the rest of the array is the
// gallery grid below. `videos` and `textSections` are open-ended:
// add or remove as many as you want, for any project.
export async function createProject(input = {}) {
  const projects = await getProjects();
  const fields = cleanFields(input);
  const slug = slugify(isString(input.slug) && input.slug ? input.slug : fields.title || "");
  if (!slug) throw new Error("A title is required to generate a slug.");
  if (projects.some((p) => p.slug === slug)) {
    throw new Error(`A project with slug "${slug}" already exists.`);
  }
  const project = {
    slug,
    title: fields.title || "Untitled Project",
    subtitle: fields.subtitle || "",
    icon: fields.icon || "✦",
    category: fields.category || "ui-ux",
    description: fields.description || "",
    textSections: fields.textSections || [],
    tags: fields.tags || [],
    link: fields.link || "",
    linkLabel: fields.linkLabel || "",
    videos: fields.videos || [],
    images: fields.images || [],
    // Optional: a project can grow into a multi-part case study by
    // adding modules — each { title, description, images, videos } —
    // rendered as its own titled block on the project page. Most
    // projects won't have this; it's only here so it round-trips
    // cleanly through create/update instead of being silently dropped.
    modules: fields.modules || [],
    // Optional extras, only written when they are used:
    //   wip: true → red "WIP" chip · badge: "On itch.io" → white chip ·
    //   extraLinks: [{label, url}] → more buttons on the project page.
    ...(fields.wip ? { wip: true } : {}),
    ...(fields.badge ? { badge: fields.badge } : {}),
    ...(fields.extraLinks && fields.extraLinks.length ? { extraLinks: fields.extraLinks } : {}),
  };
  projects.push(project);
  await saveProjects(projects);
  return project;
}

export async function updateProject(slug, updates) {
  const projects = await getProjects();
  const idx = projects.findIndex((p) => p.slug === slug);
  if (idx === -1) throw new Error(`No project found with slug "${slug}".`);
  // Slug itself is immutable via update — deleting and recreating is
  // simpler and safer than rewriting every link that points at it.
  projects[idx] = { ...projects[idx], ...cleanFields(updates), slug: projects[idx].slug };
  // The optional extras are only kept while they are switched on, so projects.json stays tidy.
  if (!projects[idx].wip) delete projects[idx].wip;
  if (!projects[idx].badge) delete projects[idx].badge;
  await saveProjects(projects);
  return projects[idx];
}

export async function deleteProject(slug) {
  const projects = await getProjects();
  const next = projects.filter((p) => p.slug !== slug);
  if (next.length === projects.length) {
    throw new Error(`No project found with slug "${slug}".`);
  }
  await saveProjects(next);
}

export async function getSite() {
  return readJson(SITE_PATH);
}

export async function saveSite(site) {
  await writeJson(SITE_PATH, site);
}

export function slugify(input) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
