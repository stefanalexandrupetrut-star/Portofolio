"use client";

import { useState } from "react";

// A small "copy this link" button used next to external links, the
// project's own share URL, and contact details. Tries the modern
// Clipboard API first and falls back to a hidden-textarea copy for
// browsers/contexts that restrict it.
//
// Pass `value` for a known URL (an external link, an email address).
// Pass `useCurrentPageUrl` instead to copy window.location.href at
// click time — the right choice for "copy this project's page link",
// since it always reflects wherever the site is actually deployed.
export default function CopyLinkButton({ value, useCurrentPageUrl = false, label = "Copy Link", small = true }) {
  const [copied, setCopied] = useState(false);

  function fallbackCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async function handleCopy() {
    let text = useCurrentPageUrl ? window.location.href : value;
    if (text && text.startsWith("/")) {
      text = window.location.origin + text;
    }
    let ok = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        ok = fallbackCopy(text);
      }
    } else {
      ok = fallbackCopy(text);
    }
    setCopied(ok);
    setTimeout(() => setCopied(false), 1400);
  }

  if (small) {
    return (
      <button type="button" className="copy-ic-btn" onClick={handleCopy} title={copied ? "Copied!" : label} aria-label={copied ? "Copied!" : label}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      </button>
    );
  }

  return (
    <button type="button" className="btn-outline-sm" onClick={handleCopy}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="12" height="12" rx="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
      </svg>
      <span aria-live="polite">{copied ? "Copied!" : label}</span>
    </button>
  );
}
