import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/data";
import MediaSection from "@/components/MediaSection";
import CopyLinkButton from "@/components/CopyLinkButton";
import ProjectBadges from "@/components/ProjectBadges";
import { isExternalUrl, metaDescription } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Project not found — Alex Stefan", robots: { index: false } };
  const title = `${project.title} — Alex Stefan`;
  const description = metaDescription(project.description);
  const image = project.images?.[0];
  return {
    title,
    description,
    openGraph: { title, description, type: "article", ...(image ? { images: [image] } : {}) },
  };
}

// A button-styled link. Web addresses (https://…) open in a new tab and get the ↗ mark;
// links inside the site (a case study under /case-studies) stay in the same tab.
function LinkButton({ href, className = "btn btn-red", children }) {
  const external = isExternalUrl(href);
  return (
    <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
      {external ? " ↗" : ""}
    </a>
  );
}

// Two layouts share this page:
// - A simple project: cover image, text sections, videos, gallery —
//   all from the project's own fields.
// - A multi-part case study (has `modules`): the same header/intro,
//   then each module renders as its own titled block with its own
//   images and videos. Watch Dogs: Legion is the first project big
//   enough to need this; any project can grow into it later just by
//   adding a `modules` array in data/projects.json.
//
// Optional fields that change what shows up (all in data/projects.json):
//   wip: true                      → red "WIP" chip and a "work in progress" note
//   badge: "On itch.io"            → white status chip next to the title
//   extraLinks: [{label, url}]     → more buttons next to the main link
//   textSections: [{heading, body}] → short written blocks under the intro
export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const modules = Array.isArray(project.modules) ? project.modules : [];
  const textSections = (Array.isArray(project.textSections) ? project.textSections : []).filter((s) => s && (s.heading || s.body));
  const extraLinks = (Array.isArray(project.extraLinks) ? project.extraLinks : []).filter((l) => l && l.url && l.label);
  const tags = Array.isArray(project.tags) ? project.tags : [];
  const personal = project.category === "personal";

  return (
    <div className="page active">
      <div className="top-accent-bar"></div>

      <div className="inner-page-header">
        <Link href={personal ? "/work?tab=personal" : "/work"} className="back-btn">
          {personal ? "← Personal Projects" : "← UI/UX Work"}
        </Link>
        <CopyLinkButton useCurrentPageUrl label="Copy Page Link" small={false} />
      </div>

      <header className="project-head">
        <p className="project-kicker">{project.subtitle}</p>
        <h1 className="project-title">
          <span aria-hidden="true">{project.icon}</span>
          <span>{project.title}</span>
          <ProjectBadges project={project} />
        </h1>
      </header>

      <div className="project-body">
        <p className="project-lead">{project.description}</p>

        {project.wip && (
          <p className="wip-note">
            <strong>Work in progress</strong>
            This project is still being built. New images and the full write-up will be added here as it takes shape.
          </p>
        )}

        {textSections.length > 0 && (
          <div className="project-text">
            {textSections.map((s, i) => (
              <section key={i}>
                {s.heading && <h2>{s.heading}</h2>}
                {s.body && <p>{s.body}</p>}
              </section>
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div className="tag-row">
            {tags.map((t) => (
              <span className="tag" key={t}>{t}</span>
            ))}
          </div>
        )}

        {(extraLinks.length > 0 || project.link) && (
          <div className="link-row">
            {extraLinks.map((l) => (
              <LinkButton key={l.url} href={l.url}>{l.label}</LinkButton>
            ))}
            {project.link && (
              <>
                <LinkButton href={project.link} className={extraLinks.length ? "btn btn-ghost" : "btn btn-red"}>
                  {project.linkLabel || "View Link"}
                </LinkButton>
                <CopyLinkButton value={project.link} label="Copy Link" small={false} />
              </>
            )}
          </div>
        )}
      </div>

      <div className="project-media">
        <MediaSection
          images={project.images || []}
          videos={project.videos || []}
          title={project.title}
          coverAlt={project.wip ? `${project.title} — work in progress` : undefined}
          showCover
        />
      </div>

      {modules.length > 0 && (
        <div className="project-modules">
          {modules.map((m, i) => (
            <section className="project-module" key={i}>
              <div className="project-module-kicker">{String(i + 1).padStart(2, "0")} — Sub-Project</div>
              <h2>{m.title}</h2>
              <p>{m.description}</p>
              {m.link && (
                <div className="link-row" style={{ marginTop: 4, marginBottom: 8 }}>
                  <LinkButton href={m.link}>{m.linkLabel || "View Link"}</LinkButton>
                  <CopyLinkButton value={m.link} label="Copy Link" small={false} />
                </div>
              )}
              <MediaSection images={m.images || []} videos={m.videos || []} title={m.title} showCover={false} />
            </section>
          ))}
        </div>
      )}

      <div className="project-cta">
        <div className="project-cta-box">
          <div>
            <div className="project-cta-title">Interested in {project.title}?</div>
            <div className="project-cta-sub">Let&apos;s talk about your project.</div>
          </div>
          <Link href="/contact" className="btn btn-red">Get In Touch →</Link>
        </div>
      </div>
    </div>
  );
}
