"use client";

// Thin wrapper around fetch() for the admin dashboard.
//
// Nothing to attach by hand: with `npm run dev` every write is allowed, and on a deployed
// site the browser sends the developer cookie that /admin sets when you unlock Developer
// Mode with ADMIN_TOKEN (see src/lib/devAccess.js and src/lib/auth.js).
export async function adminFetch(url, options = {}) {
  const res = await fetch(url, { credentials: "same-origin", ...options });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message);
  }
  return res.json();
}
