// ─────────────────────────────────────────────────────────────────
// Guards every WRITE operation (create/update/delete project, image
// upload, site settings update).
//
// - In development, everything is allowed — it's just you, running
//   this on your own machine.
// - In production, writes are blocked unless an ADMIN_TOKEN is set
//   in your environment AND the request proves it comes from you:
//   either by sending the same token in an `x-admin-token` header, or
//   by carrying the developer cookie that the unlock form on /admin
//   sets (see src/lib/devAccess.js). No token configured = admin
//   disabled. This is what stops a deployed site from being publicly
//   editable by anyone who finds /admin.
//
// This is a lightweight gate, not a full auth system — if you want
// real login/sessions later, swap this out for NextAuth or similar.
// ─────────────────────────────────────────────────────────────────
import { isDevMode, tokenMatches, isDeveloperRequest, isSameOrigin } from "@/lib/devAccess";

export function isAuthorized(request) {
  if (isDevMode()) return true;

  if (!process.env.ADMIN_TOKEN) return false;

  // Scripts and curl: the token itself, in a header.
  if (tokenMatches(request.headers.get("x-admin-token"))) return true;

  // The browser: the developer cookie, and only for requests made from this very site.
  return isSameOrigin(request) && isDeveloperRequest(request);
}

export function unauthorizedResponse() {
  return Response.json(
    {
      error:
        "Admin write access is disabled. Set ADMIN_TOKEN in your environment and unlock Developer Mode on /admin to enable it in production.",
    },
    { status: 401 }
  );
}
