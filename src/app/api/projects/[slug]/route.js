import { getProject, updateProject, deleteProject } from "@/lib/data";
import { isAuthorized, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(project);
}

export async function PUT(request, { params }) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  const { slug } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body is not valid JSON." }, { status: 400 });
  }
  try {
    const project = await updateProject(slug, body);
    return Response.json(project);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  if (!isAuthorized(request)) return unauthorizedResponse();

  const { slug } = await params;
  try {
    await deleteProject(slug);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
