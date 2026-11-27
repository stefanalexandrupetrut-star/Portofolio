"use client";

import { useState } from "react";
import Link from "next/link";
import CoverImage from "@/components/CoverImage";
import ProjectBadges from "@/components/ProjectBadges";
import { firstSentence } from "@/lib/text";

// Client-side tab filter for the Work page — "UI/UX Design" vs
// "Personal Projects". Splitting projects into these two categories
// (rather than one long list) was a specific ask; a project's
// `category` field ('ui-ux' | 'personal') in data/projects.json
// controls which tab it appears under.
//
// The active tab is mirrored into the URL (/work?tab=personal) so that
// the browser Back button, and links such as "← Personal Projects" on a
// project page, return to the tab you were on instead of resetting to
// UI/UX. `initialTab` comes from that query string (see work/page.js).
//
// Status chips on the cards come from the project data: `wip: true`
// shows a red "WIP" chip, `badge: "On itch.io"` shows a white chip.
export default function WorkGrid({ projects, behanceUrl, initialTab = "ui-ux" }) {
  const [tab, setTab] = useState(initialTab);
  const [seenInitialTab, setSeenInitialTab] = useState(initialTab);
  // Clicking "Work" in the menu while on /work?tab=personal loads /work again with a new
  // `initialTab`; React keeps this component alive, so follow the new value (the documented
  // "adjust state while rendering" pattern, rather than an effect that renders twice).
  if (seenInitialTab !== initialTab) {
    setSeenInitialTab(initialTab);
    setTab(initialTab);
  }
  const filtered = projects.filter((p) => p.category === tab);

  const selectTab = (next) => {
    setTab(next);
    try {
      // replaceState (not push): switching tabs shouldn't add history entries.
      window.history.replaceState(null, "", next === "ui-ux" ? window.location.pathname : `?tab=${next}`);
    } catch {
      /* URL sync is a convenience; the tab still works without it */
    }
  };

  return (
    <>
      <div className="work-tabs" role="group" aria-label="Project categories">
        <button type="button" className={`work-tab ${tab === "ui-ux" ? "active" : ""}`} aria-pressed={tab === "ui-ux"} onClick={() => selectTab("ui-ux")}>
          UI/UX Design
        </button>
        <button type="button" className={`work-tab ${tab === "personal" ? "active" : ""}`} aria-pressed={tab === "personal"} onClick={() => selectTab("personal")}>
          Personal Projects
        </button>
      </div>

      <div className="catalog-grid">
        {filtered.map((p, i) => {
          // A project with a `hubUrl` opens a hand-built page in /public
          // (not a Next route), so it gets a plain <a> — a full page load —
          // rather than a client-side <Link> that would try to fetch an
          // app-router payload for a static .html file.
          const Card = p.hubUrl ? "a" : Link;
          const blurb = firstSentence(p.description);
          return (
            <Card href={p.hubUrl ? p.hubUrl : `/work/${p.slug}`} className="catalog-card reveal" key={p.slug} style={{ transitionDelay: `${(i % 3) * 0.1}s` }}>
              <span className="catalog-arrow" aria-hidden="true">↗</span>
              <div className="catalog-thumb">
                {/* The name is printed below the picture, so the picture itself is decorative (alt="") —
                    otherwise a screen reader announces every project name twice. If the first picture
                    cannot load, the next one is tried before falling back to the project's emoji. */}
                <CoverImage
                  srcs={p.images.slice(0, 3)}
                  alt=""
                  fallback={<span style={{ fontSize: 40 }} aria-hidden="true">{p.icon}</span>}
                />
                <ProjectBadges project={p} />
                <div className="catalog-thumb-icon" aria-hidden="true">{p.icon}</div>
              </div>
              <div className="catalog-body">
                <div className="catalog-card-num">{String(i + 1).padStart(2, "0")}</div>
                <div className="catalog-name">{p.title}</div>
                <div className="catalog-desc">{p.subtitle ? `${p.subtitle} — ${blurb}` : blurb}</div>
              </div>
            </Card>
          );
        })}

        {tab === "ui-ux" && behanceUrl && (
          <a href={behanceUrl} target="_blank" rel="noopener noreferrer" className="catalog-card">
            <span className="catalog-arrow" aria-hidden="true">↗</span>
            <div className="catalog-thumb" style={{ background: "var(--surface2)" }}>
              <span style={{ fontSize: 40 }} aria-hidden="true">🔗</span>
            </div>
            <div className="catalog-body">
              <div className="catalog-card-num">{String(filtered.length + 1).padStart(2, "0")}</div>
              <div className="catalog-name">More on Behance</div>
              <div className="catalog-desc">The complete set of UI/UX case studies.</div>
            </div>
          </a>
        )}
      </div>
    </>
  );
}
