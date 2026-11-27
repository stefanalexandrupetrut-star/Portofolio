import Link from "next/link";
import { getSite, getProjects } from "@/lib/data";
import { SKILL_ICONS } from "@/components/SkillIcons";
import CoverImage from "@/components/CoverImage";
import ProjectBadges from "@/components/ProjectBadges";
import RevealOnScroll from "@/components/RevealOnScroll";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const site = await getSite();
  const projects = await getProjects();
  // Featured picks for the bento teaser — one of each flavor.
  const featuredSlugs = ["watch-dogs-legion", "military-ops", "beekeepers-journey"];
  const featured = featuredSlugs
    .map((slug) => projects.find((p) => p.slug === slug))
    .filter(Boolean);

  return (
    <div className="page active">
      <div className="top-accent-bar"></div>

      <div className="hero-inner-v3">
        <div className="hero-bg-word">{site.hero.bgWord}</div>
        <div className="hero-left-v3">
          <div className="hero-hello">{site.hero.hello}</div>
          <h1 className="hero-name">
            <span className="hn-white">{site.hero.firstName}</span>
            <span className="hn-red">{site.hero.lastName}</span>
          </h1>
          <div className="hero-role">{site.hero.roleTag}</div>
          <p className="hero-intro">{site.hero.description}</p>
          <div className="hero-available">
            <span className="hero-available-dot"></span> {site.hero.availableText} · {site.contact.location}
          </div>
          <div className="hero-actions-v3">
            <Link href="/work" className="btn btn-red">View My Work →</Link>
            <Link href="/contact" className="btn btn-ghost">Get In Touch</Link>
          </div>
        </div>
        <div className="hero-stats-col">
          {site.stats.map((s) => (
            <div className="hero-stat-row reveal" key={s.label}>
              <div className="hero-stat-num">{s.number}</div>
              <div className="hero-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="marquee-wrap" aria-hidden="true">
        <div className="marquee-inner">
          UI/UX DESIGN &nbsp;·&nbsp; GAME INTERFACES &nbsp;·&nbsp; INDIE DEVELOPMENT &nbsp;·&nbsp; CREATIVE TECHNOLOGY &nbsp;·&nbsp; REACT NATIVE &nbsp;·&nbsp; BLENDER &nbsp;·&nbsp; AI-ASSISTED ART &nbsp;·&nbsp; KRITA &nbsp;·&nbsp;
          UI/UX DESIGN &nbsp;·&nbsp; GAME INTERFACES &nbsp;·&nbsp; INDIE DEVELOPMENT &nbsp;·&nbsp; CREATIVE TECHNOLOGY &nbsp;·&nbsp; REACT NATIVE &nbsp;·&nbsp; BLENDER &nbsp;·&nbsp; AI-ASSISTED ART &nbsp;·&nbsp; KRITA &nbsp;·&nbsp;
        </div>
      </div>

      <div className="bento-grid">
        <div className="bento-cell bento-work reveal">
          <div className="bento-label">01 — Selected Work</div>
          <h2 className="bento-title">What I&apos;ve Been<br />Building</h2>
          <p className="bento-desc">A mix of AAA UI/UX and independent projects, built solo and in small teams.</p>
          <div className="bento-work-thumbs">
            {featured.map((p) => {
              // hubUrl = static page in /public → plain <a>, not a client <Link>.
              const Thumb = p.hubUrl ? "a" : Link;
              return (
                <Thumb href={p.hubUrl ? p.hubUrl : `/work/${p.slug}`} className="bento-thumb" key={p.slug} aria-label={p.wip ? `${p.title} (work in progress)` : p.title}>
                  <CoverImage srcs={p.images.slice(0, 3)} alt="" />
                  <ProjectBadges project={p} size="sm" />
                </Thumb>
              );
            })}
          </div>
          <Link href="/work" className="bento-link">View All Work →</Link>
        </div>

        <div className="bento-cell bento-skills reveal delay-1">
          <div className="bento-label">02 — Skills &amp; Software</div>
          <h2 className="bento-title">Tools I<br />Work With</h2>
          <div className="skill-icon-grid">
            {site.skills.map((s) => (
              <div className="skill-icon-item" key={s.icon}>
                <div className="si-box">{SKILL_ICONS[s.icon]}</div>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bento-cell bento-studios reveal delay-2">
          <div className="bento-label">03 — Studios &amp; Companies</div>
          <h2 className="bento-title" style={{ fontSize: "clamp(24px,2.6vw,32px)" }}>Where I&apos;ve<br />Worked</h2>
          <div className="tag-row" style={{ marginTop: 20 }}>
            {site.studios.map((s) => (
              <div className="badge-item" key={s}>{s}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="cta-band">
        <div>
          <h2 className="cta-band-title reveal-left">Let&apos;s<br />Work Together!</h2>
          <div className="cta-band-sub reveal-left delay-1">Open to new roles and freelance projects — reach out anytime.</div>
        </div>
        <Link href="/contact" className="btn btn-dark reveal-right" style={{ padding: "20px 48px", fontSize: 14, letterSpacing: 2 }}>
          Get In Touch →
        </Link>
      </div>
      <RevealOnScroll />
    </div>
  );
}
