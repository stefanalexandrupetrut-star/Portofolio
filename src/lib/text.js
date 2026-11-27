// Small text helpers shared by the Work grid, the project pages and the page metadata.

/**
 * The first sentence of a description, with its closing punctuation kept (and never doubled).
 * Splitting on the first "." used to cut "…in v1.5. …" or "e.g." in the wrong place and added a
 * second full stop to sentences ending in "!" or "?".
 */
export function firstSentence(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const match = clean.match(/^.*?[.!?](?=\s|$)/);
  return match ? match[0] : clean;
}

/** A description shortened to fit a <meta name="description"> (about 160 characters), cut at a word. */
export function metaDescription(text, max = 160) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : cut.length).replace(/[,;:\s]+$/, "") + "…";
}

/** True for absolute web addresses (opened in a new tab); site-relative paths stay in the same tab. */
export function isExternalUrl(url) {
  return /^https?:\/\//i.test(String(url || ""));
}
