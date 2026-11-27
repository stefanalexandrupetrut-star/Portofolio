import { getSite, saveSite } from "@/lib/data";
import { isAuthorized, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const site = await getSite();
  return Response.json(site);
}

export async function PUT(request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  let updates;
  try {
    updates = await request.json();
  } catch {
    return Response.json({ error: "The request body is not valid JSON." }, { status: 400 });
  }
  const current = await getSite();
  // Only sections that already exist can be changed, and each keeps its kind (text, list or group of fields),
  // so a typo in a request can never break the homepage.
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    return Response.json({ error: "Send an object such as { \"hero\": { … } }." }, { status: 400 });
  }
  for (const key of Object.keys(updates)) {
    const kind = (v) => (Array.isArray(v) ? "list" : v === null ? "null" : typeof v);
    if (!(key in current) || kind(updates[key]) !== kind(current[key])) {
      return Response.json({ error: `"${key}" is not a section of the site, or has the wrong kind of value.` }, { status: 400 });
    }
  }
  // Shallow-merge one level deep so a partial update (e.g. just
  // `hero`) doesn't wipe out unrelated sections like `contact`.
  const next = { ...current, ...updates };
  for (const key of Object.keys(updates)) {
    if (
      updates[key] &&
      typeof updates[key] === "object" &&
      !Array.isArray(updates[key]) &&
      current[key] &&
      typeof current[key] === "object"
    ) {
      next[key] = { ...current[key], ...updates[key] };
    }
  }
  await saveSite(next);
  return Response.json(next);
}
