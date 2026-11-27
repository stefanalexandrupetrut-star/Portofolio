import { getProjects, createProject } from "@/lib/data";
import { isAuthorized, unauthorizedResponse } from "@/lib/auth";

// File-system access needs the Node.js runtime (not Edge).
export const runtime = "nodejs";
// Always read the current file — never cache stale project data.
export const dynamic = "force-dynamic";

export async function GET() {
  const projects = await getProjects();
  return Response.json(projects);
}

export async function POST(request) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body is not valid JSON." }, { status: 400 });
  }
  try {
    const project = await createProject(body);
    return Response.json(project, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
