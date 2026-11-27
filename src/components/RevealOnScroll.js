"use client";

import { useEffect } from "react";

// Scroll-reveal for .reveal / .reveal-left / .reveal-right elements.
//
// Where this lives matters. It is rendered at the END OF EACH PAGE (home, work, contact), not in the root
// layout. React hydrates a page's content a moment after the layout's own components, so an observer started
// from the layout could add the "visible" class to a card before React had hydrated it — and `npm run dev`
// would then warn "…some attributes of the server rendered HTML didn't match the client properties".
// Rendered inside the page, its effect only runs once everything above it has been hydrated.
//
// Elements reach the page in two ways, and both have to be watched:
//   1. They are already in the DOM when the page loads.
//   2. React mounts them later WITHOUT a route change — e.g. the cards that appear when you switch between
//      the "UI/UX Design" and "Personal Projects" tabs, or a project added in Developer Mode.
//      Before a MutationObserver watched for these, every card created by a tab switch was never observed and
//      stayed at opacity:0 (the "content disappears when I switch tabs" bug).
export default function RevealOnScroll() {
  useEffect(() => {
    const SELECTOR = ".reveal, .reveal-left, .reveal-right";

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target); // reveal once, then stop watching
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    const watch = (node) => {
      if (node.nodeType !== 1) return; // elements only
      if (node.matches(SELECTOR)) io.observe(node);
      node.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    };

    watch(document.body);
    const mo = new MutationObserver((mutations) => {
      mutations.forEach((m) => m.addedNodes.forEach(watch));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return null;
}
