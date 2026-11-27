// Small status chips for a project, driven by two optional fields in data/projects.json:
//   "wip": true            → a red "WIP" chip (work in progress)
//   "badge": "On itch.io"  → a white chip with whatever short text you give it
// Used on the Work cards, the home page thumbnails and each project's own page.
// `size="sm"` is the tiny version for the 88 px thumbnails on the home page.
export default function ProjectBadges({ project, size = "md", className = "" }) {
  if (!project?.wip && !project?.badge) return null;
  return (
    <span className={`badge-row ${size === "sm" ? "sm" : ""} ${className}`.trim()}>
      {project.wip && <span className="badge-chip wip">WIP</span>}
      {project.badge && <span className="badge-chip live">{project.badge}</span>}
    </span>
  );
}
