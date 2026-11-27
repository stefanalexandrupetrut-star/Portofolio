// ─────────────────────────────────────────────────────────────────
// "Developer access" — who is allowed to open the private parts of
// the site: Developer Mode (/admin) and the 1KeyForge Pro app.
//
// - `npm run dev` (NODE_ENV !== "production"): you are always the
//   developer. Nothing to configure.
// - A deployed site: you are the developer only after unlocking it
//   once with ADMIN_TOKEN (the form on /admin). That sets an HttpOnly,
//   SameSite=Strict cookie holding a signed expiry — never the token
//   itself — so the browser can open /apps/1keyforge-pro (a plain page
//   load cannot send a custom header) and the project pages can tell
//   whether to show the live app or the public preview.
//
// Everything here runs on the server only. If ADMIN_TOKEN is not set,
// a deployed site has no developer at all: the private pages stay shut.
// ─────────────────────────────────────────────────────────────────
import crypto from "node:crypto";

export const DEV_COOKIE = "dev_access";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // two weeks, then unlock again

const adminToken = () => process.env.ADMIN_TOKEN || "";

/** True while running `npm run dev` (anything but a production build). */
export function isDevMode() {
  return process.env.NODE_ENV !== "production";
}

// Compare two strings without leaking, through timing, how much of them matched.
// Hashing first makes both inputs the same length, which timingSafeEqual requires.
function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Does the value typed into the unlock form equal ADMIN_TOKEN? */
export function tokenMatches(provided) {
  const token = adminToken();
  if (!token || typeof provided !== "string" || provided.length === 0) return false;
  return safeEqual(provided, token);
}

function sign(expiry) {
  return crypto.createHmac("sha256", adminToken()).update(`dev-access:${expiry}`).digest("hex");
}

/** The value of a fresh developer cookie: "<expiry ms>.<signature>". */
export function makeCookieValue(now = Date.now()) {
  const expiry = now + COOKIE_MAX_AGE_SECONDS * 1000;
  return `${expiry}.${sign(expiry)}`;
}

/** Is this cookie value one we signed, and not yet expired? */
export function cookieValueValid(value, now = Date.now()) {
  if (!adminToken() || typeof value !== "string") return false;
  const dot = value.indexOf(".");
  if (dot < 1) return false;
  const expiry = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!/^\d{10,16}$/.test(expiry) || Number(expiry) < now) return false;
  return safeEqual(signature, sign(expiry));
}

/** Reads one cookie out of a raw `Cookie:` header. */
export function readCookie(header, name) {
  if (!header) return "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return "";
}

/** Is the request that produced this `Request` coming from the developer? */
export function isDeveloperRequest(request) {
  if (isDevMode()) return true;
  return cookieValueValid(readCookie(request.headers.get("cookie"), DEV_COOKIE));
}

/** Same check for server components, which read cookies through next/headers. */
export function isDeveloperCookie(value) {
  return isDevMode() || cookieValueValid(value);
}

/** Browsers always send Origin on cross-site writes; refuse any that is not this site. */
export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // not a cross-site browser request (curl, server-to-server, same-origin GET)
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/** The Set-Cookie header for the developer cookie (`value` "" clears it). */
export function cookieHeader(value, { secure }) {
  const parts = [
    `${DEV_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${value ? COOKIE_MAX_AGE_SECONDS : 0}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** Was this request made over HTTPS (directly, or behind the host's proxy)? */
export function isSecureRequest(request) {
  if (request.headers.get("x-forwarded-proto") === "https") return true;
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}
