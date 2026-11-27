import {
  isDevMode,
  isDeveloperRequest,
  isSameOrigin,
  isSecureRequest,
  makeCookieValue,
  cookieHeader,
  tokenMatches,
} from "@/lib/devAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────
// "Who is the developer?" — one small endpoint for three jobs:
//   GET    → { developer: true|false }   (the project pages ask this to
//            decide between the live 1KeyForge app and the public preview)
//   POST   → unlock: { token } → sets the developer cookie
//   DELETE → lock again: clears the cookie
// See src/lib/devAccess.js for how the cookie works.
// ─────────────────────────────────────────────────────────────────

const NO_STORE = { "Cache-Control": "private, no-store", Vary: "Cookie" };

// A few wrong guesses per address per ten minutes, then a pause. This is
// kept in memory, so on a serverless host it is per instance: it slows
// guessing down, it is not a substitute for a long random ADMIN_TOKEN.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 8;
const failures = new Map();

function clientKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip")) || "local";
}

function recentFailures(key, now) {
  const list = (failures.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

export async function GET(request) {
  return Response.json({ developer: isDeveloperRequest(request) }, { headers: NO_STORE });
}

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Not allowed." }, { status: 403, headers: NO_STORE });
  }

  // npm run dev: you are always the developer, there is nothing to unlock.
  if (isDevMode() && !process.env.ADMIN_TOKEN) {
    return Response.json({ developer: true, mode: "development" }, { headers: NO_STORE });
  }
  if (!process.env.ADMIN_TOKEN) {
    return Response.json(
      { error: "Developer access is not set up on this server. Set ADMIN_TOKEN in its environment variables." },
      { status: 503, headers: NO_STORE }
    );
  }

  const key = clientKey(request);
  const now = Date.now();
  const recent = recentFailures(key, now);
  if (recent.length >= MAX_FAILURES) {
    const retry = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    return Response.json(
      { error: "Too many wrong tries. Wait a few minutes and try again." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(retry) } }
    );
  }

  let token = "";
  try {
    token = String((await request.json())?.token ?? "");
  } catch {
    /* an unreadable body counts as a wrong token */
  }

  if (!tokenMatches(token)) {
    failures.set(key, [...recent, now]);
    return Response.json({ error: "That token is not right." }, { status: 401, headers: NO_STORE });
  }

  failures.delete(key);
  return Response.json(
    { developer: true },
    {
      headers: {
        ...NO_STORE,
        "Set-Cookie": cookieHeader(makeCookieValue(), { secure: isSecureRequest(request) }),
      },
    }
  );
}

export async function DELETE(request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Not allowed." }, { status: 403, headers: NO_STORE });
  }
  return Response.json(
    { developer: false },
    { headers: { ...NO_STORE, "Set-Cookie": cookieHeader("", { secure: isSecureRequest(request) }) } }
  );
}
