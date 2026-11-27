// Converts a YouTube watch/share URL into an embeddable URL. Accepts
// whatever a person would normally paste — youtube.com/watch?v=...,
// youtu.be/..., youtube.com/shorts/..., or an already-embeddable URL —
// and returns something safe to drop into an <iframe src>.
//
// - Other web addresses (Vimeo's player link, a direct .mp4 …) pass through unchanged.
// - Site-relative paths ("/videos/clip.mp4") pass through unchanged.
// - Anything else — "javascript:…", "data:…", plain text — returns "" so it can never
//   end up in an iframe; callers skip empty results.
export function toEmbedUrl(url) {
  if (!url || typeof url !== "string") return "";
  const value = url.trim();
  if (/^\/(?!\/)/.test(value)) return value; // a path inside this site

  let u;
  try {
    u = new URL(value);
  } catch {
    return "";
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return "";

  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id ? `https://www.youtube.com/embed/${id}` : "";
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    const shorts = u.pathname.match(/^\/shorts\/([\w-]+)/);
    if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`;
    if (u.pathname.startsWith("/embed/")) return value; // already embeddable
  }
  return value;
}
