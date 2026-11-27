"use client";

import { useEffect } from "react";

export default function SiteEffects() {
  // Cursor + ripple listeners only need to be attached once — they're
  // on `document`, so they keep working across client-side navigation.
  // (The scroll-reveal lives in RevealOnScroll, rendered inside each page — see the note there.)
  useEffect(() => {
    const root = document.documentElement;
    const cur = document.getElementById("cur");
    const ring = document.getElementById("ring");
    if (!cur || !ring) return;

    const onMove = (e) => {
      // The custom cursor appears (and the system pointer hides) with the first mouse move, so it never
      // sits at the top-left corner before the mouse has been used, and a visitor without a working
      // script keeps a normal pointer.
      if (!root.classList.contains("custom-cursor")) {
        root.classList.add("custom-cursor");
        cur.style.opacity = "1";
        ring.style.opacity = "1";
      }
      cur.style.left = e.clientX + "px";
      cur.style.top = e.clientY + "px";
      ring.style.left = e.clientX + "px";
      ring.style.top = e.clientY + "px";
    };
    const onOver = (e) => {
      const hovering = e.target.closest?.(
        'button,a,[role="button"],.catalog-card,.gallery-item,.cover-image,.bento-thumb,.skill-icon-item,.work-tab,.gear-btn'
      );
      ring.style.transform = hovering
        ? "translate(-50%,-50%) scale(1.6)"
        : "translate(-50%,-50%) scale(1)";
      cur.style.transform = hovering
        ? "translate(-50%,-50%) scale(.5)"
        : "translate(-50%,-50%) scale(1)";
    };
    const onClick = (e) => {
      const btn = e.target.closest?.(".btn");
      if (!btn) return;
      const r = document.createElement("span");
      r.style.position = "absolute";
      r.style.borderRadius = "50%";
      r.style.background = "rgba(255,255,255,.25)";
      r.style.pointerEvents = "none";
      r.style.animation = "ripple .6s linear";
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      r.style.width = r.style.height = size + "px";
      r.style.left = e.clientX - rect.left - size / 2 + "px";
      r.style.top = e.clientY - rect.top - size / 2 + "px";
      btn.appendChild(r);
      setTimeout(() => r.remove(), 600);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("click", onClick);
      root.classList.remove("custom-cursor");
    };
  }, []);

  return (
    <>
      <div className="cursor" id="cur" aria-hidden="true" />
      <div className="cursor-ring" id="ring" aria-hidden="true" />
    </>
  );
}
