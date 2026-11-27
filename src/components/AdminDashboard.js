"use client";

import { useState, useId, cloneElement } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/adminFetch";
import ImageUploader from "@/components/ImageUploader";
import { SKILL_ICONS } from "@/components/SkillIcons";

const EMPTY_PROJECT = {
  title: "", subtitle: "", icon: "✦", category: "ui-ux",
  description: "", tags: "", link: "", linkLabel: "", wip: false, badge: "",
};

const SELECT_STYLE = { background: "var(--bg2)", border: "1px solid var(--border2)", color: "var(--white)", borderRadius: 3, padding: "12px 16px" };

// A label tied to its field (so a click on the label focuses the field and screen readers announce it).
// Usage: <Field label="Title"><input value=… onChange=… /></Field>
function Field({ label, children }) {
  const id = useId();
  return (
    <div className="fg">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}

export default function AdminDashboard({ initialSite, initialProjects, mode = "development" }) {
  const [site, setSite] = useState(initialSite);
  const [projects, setProjects] = useState(initialProjects);
  const [message, setMessage] = useState(null);

  function flash(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function saveSiteSection(section, updates) {
    try {
      const next = await adminFetch("/api/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [section]: updates }),
      });
      setSite(next);
      flash("ok", "Saved.");
    } catch (err) {
      flash("error", err.message);
    }
  }

  async function addProject(form) {
    try {
      const created = await adminFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      setProjects((prev) => [...prev, created]);
      flash("ok", `Added "${created.title}".`);
      return true;
    } catch (err) {
      flash("error", err.message);
      return false;
    }
  }

  async function duplicateProject(project) {
    let baseTitle = `${project.title} Copy`;
    let n = 2;
    while (projects.some((p) => p.title === baseTitle)) {
      baseTitle = `${project.title} Copy ${n}`;
      n++;
    }
    try {
      // The copy keeps the text; the original's own status chip and extra buttons (e.g. an itch.io link) stay behind.
      const created = await adminFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...project, title: baseTitle, slug: undefined, badge: "", extraLinks: [] }),
      });
      setProjects((prev) => [...prev, created]);
      flash("ok", `Duplicated as "${created.title}" — swap its images below.`);
    } catch (err) {
      flash("error", err.message);
    }
  }

  async function saveProject(slug, updates) {
    try {
      const updated = await adminFetch(`/api/projects/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setProjects((prev) => prev.map((p) => (p.slug === slug ? updated : p)));
      flash("ok", "Saved.");
    } catch (err) {
      flash("error", err.message);
    }
  }

  async function removeProject(slug) {
    if (!confirm("Delete this project? This can't be undone.")) return;
    try {
      await adminFetch(`/api/projects/${slug}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.slug !== slug));
      flash("ok", "Deleted.");
    } catch (err) {
      flash("error", err.message);
    }
  }

  function addImage(slug, url) {
    const project = projects.find((p) => p.slug === slug);
    saveProject(slug, { images: [...(project.images || []), url] });
  }
  function removeImage(slug, url) {
    const project = projects.find((p) => p.slug === slug);
    saveProject(slug, { images: (project.images || []).filter((i) => i !== url) });
  }

  return (
    <div className="admin-shell">
      <div className="section-label">Admin</div>
      <h1 className="section-title" style={{ fontSize: "clamp(36px,5vw,56px)", marginBottom: 8 }}>Content Manager</h1>
      <p style={{ color: "var(--gray)", fontSize: 13, marginBottom: 32 }}>
        Changes write directly to <code>data/site.json</code> and <code>data/projects.json</code>, and uploaded
        images land in <code>public/images</code>. Commit and push when you&apos;re happy with them.
      </p>

      <div aria-live="polite">{message && <div className={`admin-msg ${message.type}`}>{message.text}</div>}</div>

      <DeveloperAccess mode={mode} />
      <HeroSettings hero={site.hero} onSave={(u) => saveSiteSection("hero", u)} />
      <SkillsSettings skills={site.skills} onSave={(u) => saveSiteSection("skills", u)} />
      <StudiosSettings studios={site.studios} onSave={(u) => saveSiteSection("studios", u)} />
      <ContactSettings contact={site.contact} onSave={(u) => saveSiteSection("contact", u)} />

      <div className="admin-card">
        <h2>Projects</h2>
        <p>Add, edit, duplicate, or remove projects. Each one gets its own page, image gallery, and video section.</p>
        {projects.map((p) => (
          <ProjectRow
            key={p.slug}
            project={p}
            onSave={saveProject}
            onDelete={removeProject}
            onDuplicate={duplicateProject}
            onAddImage={addImage}
            onRemoveImage={removeImage}
          />
        ))}
        <AddProjectForm onAdd={addProject} />
      </div>
    </div>
  );
}

// Who is allowed in, and how to lock the door again. See src/lib/devAccess.js.
function DeveloperAccess({ mode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function lock() {
    setBusy(true);
    try {
      await fetch("/api/dev/session", { method: "DELETE", credentials: "same-origin" });
    } finally {
      setBusy(false);
    }
    router.refresh();
  }

  return (
    <div className="admin-card">
      <h2>Developer access</h2>
      <div className="admin-status">
        {mode === "development" ? (
          <p style={{ marginBottom: 0 }}>
            You are running <code>npm run dev</code>, so you are always the developer here: this page, saving changes and the
            private 1KeyForge Pro app are open to you. On the deployed site they ask for the access token first.
          </p>
        ) : (
          <>
            <p style={{ marginBottom: 0 }}>
              Unlocked in this browser (it locks itself after 14 days). While unlocked you can edit the site and open the
              private 1KeyForge Pro app.
            </p>
            <button type="button" className="btn btn-ghost btn-small" onClick={lock} disabled={busy}>
              {busy ? "Locking…" : "Lock again"}
            </button>
          </>
        )}
      </div>
      <div style={{ marginTop: 18 }}>
        <a className="btn btn-red btn-small" href="/apps/1keyforge-pro" target="_blank" rel="noopener noreferrer">
          Open 1KeyForge Pro ↗
        </a>
      </div>
    </div>
  );
}

function HeroSettings({ hero, onSave }) {
  const [form, setForm] = useState(hero);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="admin-card">
      <h2>Homepage Hero</h2>
      <p>No photo by design — the hero is text-first, with an animated name.</p>
      <div className="admin-row">
        <Field label={`Script Line (e.g. "Hello, I'm")`}><input value={form.hello} onChange={set("hello")} /></Field>
        <Field label="Background Word"><input value={form.bgWord} onChange={set("bgWord")} /></Field>
        <Field label="First Name"><input value={form.firstName} onChange={set("firstName")} /></Field>
        <Field label="Last Name (animated)"><input value={form.lastName} onChange={set("lastName")} /></Field>
        <Field label="Role Tag"><input value={form.roleTag} onChange={set("roleTag")} /></Field>
        <Field label="Available Text"><input value={form.availableText} onChange={set("availableText")} /></Field>
      </div>
      <Field label="Description"><textarea rows={3} value={form.description} onChange={set("description")} /></Field>
      <button type="button" className="btn btn-red btn-small" onClick={() => onSave(form)}>Save Hero</button>
    </div>
  );
}

function SkillsSettings({ skills, onSave }) {
  const [list, setList] = useState(skills);
  const iconKeys = Object.keys(SKILL_ICONS);
  function update(i, field, val) {
    setList((l) => l.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));
  }
  function remove(i) {
    setList((l) => l.filter((_, idx) => idx !== i));
  }
  function add() {
    setList((l) => [...l, { icon: iconKeys[0], label: "" }]);
  }
  return (
    <div className="admin-card">
      <h2>Skills &amp; Software</h2>
      <p>The icon grid on your homepage. Pick from the built-in icon set, or add a new glyph in <code>src/components/SkillIcons.js</code>.</p>
      {list.map((s, i) => (
        <div className="admin-list-row" key={i}>
          <select aria-label={`Icon for skill ${i + 1}`} value={s.icon} onChange={(e) => update(i, "icon", e.target.value)} style={{ background: "var(--bg2)", border: "1px solid var(--border2)", color: "var(--white)", borderRadius: 3, padding: "8px 10px" }}>
            {iconKeys.map((k) => <option value={k} key={k}>{k}</option>)}
          </select>
          <input aria-label={`Label for skill ${i + 1}`} value={s.label} onChange={(e) => update(i, "label", e.target.value)} placeholder="Label shown next to the icon" />
          <button type="button" className="admin-x" onClick={() => remove(i)} aria-label={`Remove skill ${i + 1}`}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button type="button" className="btn btn-ghost btn-small" onClick={add}>+ Add Skill</button>
        <button type="button" className="btn btn-red btn-small" onClick={() => onSave(list)}>Save Skills</button>
      </div>
    </div>
  );
}

function StudiosSettings({ studios, onSave }) {
  const [text, setText] = useState(studios.join(", "));
  return (
    <div className="admin-card">
      <h2>Studios &amp; Companies</h2>
      <p>Comma-separated list shown as badges on your homepage.</p>
      <Field label="Studios (comma separated)"><textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} /></Field>
      <button type="button" className="btn btn-red btn-small" onClick={() => onSave(text.split(",").map((s) => s.trim()).filter(Boolean))}>Save Studios</button>
    </div>
  );
}

function ContactSettings({ contact, onSave }) {
  const [form, setForm] = useState(contact);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="admin-card">
      <h2>Contact Info</h2>
      <div className="admin-row">
        <Field label="Email"><input value={form.email} onChange={set("email")} /></Field>
        <Field label="Location"><input value={form.location} onChange={set("location")} /></Field>
        <Field label="Behance URL"><input value={form.behance} onChange={set("behance")} /></Field>
      </div>
      <button type="button" className="btn btn-red btn-small" onClick={() => onSave(form)}>Save Contact</button>
    </div>
  );
}

// A generic "list of strings" editor — used for a project's videos.
// Add as many or as few as you have; paste any normal YouTube link
// (watch?v=... or youtu.be/...) and it's converted to an embeddable
// URL automatically when the page renders.
function StringListEditor({ items, onChange, placeholder, addLabel, itemLabel }) {
  function update(i, val) {
    onChange(items.map((it, idx) => (idx === i ? val : it)));
  }
  function remove(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, ""]);
  }
  return (
    <div>
      {items.map((it, i) => (
        <div className="admin-list-row" key={i}>
          <input aria-label={`${itemLabel} ${i + 1}`} value={it} onChange={(e) => update(i, e.target.value)} placeholder={placeholder} />
          <button type="button" className="admin-x" onClick={() => remove(i)} aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`}>✕</button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-small" onClick={add} style={{ marginTop: 4 }}>{addLabel}</button>
    </div>
  );
}

// Editor for a project's textSections — any number of {heading, body} blocks.
function TextSectionsEditor({ sections, onChange }) {
  function update(i, field, val) {
    onChange(sections.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));
  }
  function remove(i) {
    onChange(sections.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...sections, { heading: "", body: "" }]);
  }
  return (
    <div>
      {sections.map((s, i) => (
        <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 4, padding: 10, marginBottom: 8 }}>
          <div className="admin-list-row">
            <input aria-label={`Heading of text section ${i + 1}`} value={s.heading} onChange={(e) => update(i, "heading", e.target.value)} placeholder="Section heading" />
            <button type="button" className="admin-x" onClick={() => remove(i)} aria-label={`Remove text section ${i + 1}`}>✕</button>
          </div>
          <textarea aria-label={`Text of text section ${i + 1}`} value={s.body} onChange={(e) => update(i, "body", e.target.value)} placeholder="Section text" rows={2} style={{ width: "100%", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 3, color: "var(--white)", padding: 9, fontFamily: "inherit", fontSize: 13 }} />
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-small" onClick={add}>+ Add Text Section</button>
    </div>
  );
}

function ProjectRow({ project, onSave, onDelete, onDuplicate, onAddImage, onRemoveImage }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...project, tags: (project.tags || []).join(", ") });
  const [videos, setVideos] = useState(project.videos || []);
  const [textSections, setTextSections] = useState(project.textSections || []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const images = project.images || [];

  function submit() {
    // Only the fields this form edits. The image list is deliberately NOT sent: images are added and removed
    // by the uploader below, and a copy taken when this form first opened could bring back deleted pictures
    // or drop new ones.
    const { title, subtitle, icon, category, description, link, linkLabel, badge, wip } = form;
    onSave(project.slug, {
      title, subtitle, icon, category, description, link, linkLabel, badge, wip: Boolean(wip),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      videos,
      textSections,
    });
    setEditing(false);
  }

  return (
    <div className="admin-project-item">
      <div className="admin-project-head">
        <div>
          <div className="admin-project-title">{project.icon} {project.title}{project.wip ? " · WIP" : ""}</div>
          <div className="admin-project-meta">/work/{project.slug} · {project.category === "personal" ? "Personal" : "UI/UX"} · {images.length} images · {(project.videos || []).length} videos</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>{editing ? "Close" : "Edit"}</button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => onDuplicate(project)}>Duplicate</button>
          <button type="button" className="btn btn-danger btn-small" onClick={() => onDelete(project.slug)}>Delete</button>
        </div>
      </div>

      {editing && (
        <div style={{ marginTop: 16 }}>
          <div className="admin-row">
            <Field label="Title"><input value={form.title ?? ""} onChange={set("title")} /></Field>
            <Field label="Subtitle"><input value={form.subtitle ?? ""} onChange={set("subtitle")} /></Field>
            <Field label="Icon (emoji)"><input value={form.icon ?? ""} onChange={set("icon")} /></Field>
            <Field label="Category">
              <select value={form.category} onChange={set("category")} style={SELECT_STYLE}>
                <option value="ui-ux">UI/UX Design</option>
                <option value="personal">Personal Projects</option>
              </select>
            </Field>
            <Field label="Tags (comma separated)"><input value={form.tags} onChange={set("tags")} /></Field>
            <Field label="External Link (optional)"><input value={form.link ?? ""} onChange={set("link")} /></Field>
            <Field label="Link Label"><input value={form.linkLabel ?? ""} onChange={set("linkLabel")} /></Field>
            <Field label='Status chip (optional, e.g. "On itch.io")'><input value={form.badge ?? ""} onChange={set("badge")} /></Field>
          </div>
          <label className="check-row">
            <input type="checkbox" checked={Boolean(form.wip)} onChange={(e) => setForm({ ...form, wip: e.target.checked })} />
            Work in progress — shows a red WIP chip on the cards and a note on the project page
          </label>
          <Field label="Description"><textarea rows={3} value={form.description ?? ""} onChange={set("description")} /></Field>

          <div className="fg">
            <span className="label-like">Videos — add or remove as many as this project has</span>
            <StringListEditor items={videos} onChange={setVideos} placeholder="https://www.youtube.com/watch?v=..." addLabel="+ Add Video" itemLabel="Video link" />
          </div>

          <div className="fg">
            <span className="label-like">Extra Text Sections</span>
            <TextSectionsEditor sections={textSections} onChange={setTextSections} />
          </div>

          <button type="button" className="btn btn-red btn-small" onClick={submit}>Save Changes</button>
        </div>
      )}

      <div className="admin-thumbs">
        {images.map((src, i) => (
          <div className="admin-thumb" key={src}>
            <img src={src} alt="" />
            {i === 0 && <span style={{ position: "absolute", bottom: 2, left: 2, fontSize: 8, background: "var(--red)", padding: "1px 4px", borderRadius: 2 }}>COVER</span>}
            <button type="button" onClick={() => onRemoveImage(project.slug, src)} title="Remove" aria-label={`Remove image ${i + 1}`}>✕</button>
          </div>
        ))}
      </div>
      <div className="admin-uploader">
        <ImageUploader folder={`projects/${project.slug}`} label="Add Image" onUploaded={(url) => onAddImage(project.slug, url)} />
        <span style={{ fontSize: 11, color: "var(--gray2)" }}>First image is the cover shown at the top of the page.</span>
      </div>
    </div>
  );
}

function AddProjectForm({ onAdd }) {
  const [form, setForm] = useState(EMPTY_PROJECT);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  async function submit() {
    if (!form.title.trim()) return;
    const ok = await onAdd(form);
    if (ok) setForm(EMPTY_PROJECT);
  }
  return (
    <div className="admin-project-item" style={{ borderStyle: "dashed" }}>
      <div className="admin-project-title" style={{ marginBottom: 14 }}>+ Add New Project</div>
      <div className="admin-row">
        <Field label="Title"><input value={form.title} onChange={set("title")} placeholder="Project name" /></Field>
        <Field label="Subtitle"><input value={form.subtitle} onChange={set("subtitle")} placeholder="e.g. Independent Game" /></Field>
        <Field label="Icon (emoji)"><input value={form.icon} onChange={set("icon")} /></Field>
        <Field label="Category">
          <select value={form.category} onChange={set("category")} style={SELECT_STYLE}>
            <option value="ui-ux">UI/UX Design</option>
            <option value="personal">Personal Projects</option>
          </select>
        </Field>
        <Field label="Tags (comma separated)"><input value={form.tags} onChange={set("tags")} /></Field>
        <Field label="External Link (optional)"><input value={form.link} onChange={set("link")} /></Field>
      </div>
      <label className="check-row">
        <input type="checkbox" checked={form.wip} onChange={(e) => setForm({ ...form, wip: e.target.checked })} />
        Work in progress — shows a red WIP chip
      </label>
      <Field label="Description"><textarea rows={3} value={form.description} onChange={set("description")} /></Field>
      <button type="button" className="btn btn-red btn-small" onClick={submit}>Add Project</button>
      <p style={{ fontSize: 11, color: "var(--gray2)", marginTop: 8 }}>Add images, videos, and extra text sections after creating — click Edit on the new card below.</p>
    </div>
  );
}
