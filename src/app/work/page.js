import Link from "next/link";
import { getProjects, getSite } from "@/lib/data";
import WorkGrid from "@/components/WorkGrid";
import RevealOnScroll from "@/components/RevealOnScroll";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Work — Alex Stefan",
  description: "UI/UX design for AAA and mobile games, plus personal projects: apps, games and tools built independently.",
};

export default async function WorkPage({ searchParams }) {
  const projects = await getProjects();
  const site = await getSite();
  // /work?tab=personal opens on the Personal Projects tab (anything else → UI/UX).
  const { tab } = await searchParams;
  const initialTab = tab === "personal" ? "personal" : "ui-ux";

  return (
    <div className="page active">
      <div className="top-accent-bar"></div>
      <div className="section">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
          <div>
            <div className="section-label reveal">Portfolio</div>
            <h1 className="section-title reveal delay-1">All My<br />Work</h1>
            <div className="section-subtitle reveal delay-2">Browse by category, then click any project for the full case study.</div>
          </div>
          <Link href="/contact" className="btn btn-red reveal delay-3">Get In Touch</Link>
        </div>

        <WorkGrid projects={projects} behanceUrl={site.contact.behance} initialTab={initialTab} />
      </div>
      <RevealOnScroll />
    </div>
  );
}
