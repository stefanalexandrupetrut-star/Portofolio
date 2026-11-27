import Link from "next/link";

// A project in the footer lists. Projects with a hand-built page in /public (`hubUrl`) are
// plain links (a full page load); the others are normal Next.js links to /work/<slug>.
function ProjectLink({ project }) {
  const label = project.wip ? `${project.title} (WIP)` : project.title;
  return project.hubUrl ? <a href={project.hubUrl}>{label}</a> : <Link href={`/work/${project.slug}`}>{label}</Link>;
}

export default function Footer({ site, projects }) {
  const year = new Date().getFullYear();
  const uiux = projects.filter((p) => p.category === "ui-ux");
  const personal = projects.filter((p) => p.category === "personal");
  const [first, ...restName] = site.name.split(" ");

  return (
    <footer>
      <div className="footer-grid">
        <div>
          <div className="f-logo">{first.toUpperCase()}</div>
          <div className="f-sub">{restName.join(" ")} · Portfolio</div>
          <div className="f-desc">{site.role} building interfaces for games — professionally and independently.</div>
        </div>
        <div>
          <h2>UI/UX</h2>
          <ul>
            {uiux.map((p) => (
              <li key={p.slug}><ProjectLink project={p} /></li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Personal</h2>
          <ul>
            {personal.map((p) => (
              <li key={p.slug}><ProjectLink project={p} /></li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Contact</h2>
          <ul>
            <li><a href={`mailto:${site.contact.email}`}>{site.contact.email}</a></li>
            <li><Link href="/contact">{site.contact.location}</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {year} {site.name}. All rights reserved.</p>
        <div style={{ display: "flex", gap: 6 }} aria-hidden="true">
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--red)", opacity: 0.4 }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--red)", opacity: 0.7 }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--red)" }} />
        </div>
      </div>
    </footer>
  );
}
