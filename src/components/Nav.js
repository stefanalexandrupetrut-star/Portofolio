"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/work", label: "Work" },
];

export default function Nav({ name = "Alex Stefan" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const [first, ...restName] = name.split(" ");

  // The phone menu closes by itself whenever the page changes (a link, the browser Back button …).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  // …and with the Escape key.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <nav aria-label="Main">
        <Link href="/" className="logo-wrap">
          <div className="logo-text">
            <span className="logo-main">{first.toUpperCase()}</span>
            <span className="logo-sub">{restName.join(" ")}</span>
          </div>
        </Link>
        <div className="nav-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : ""} aria-current={isActive(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
          <Link href="/contact" className="nav-cta">
            Contact
          </Link>
        </div>
        <button
          type="button"
          className="hamburger"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>
      {open && (
        <div className="mmenu" id="mobile-menu" style={{ display: "flex" }}>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
          <Link href="/contact" className="nav-cta">
            Contact
          </Link>
        </div>
      )}
    </>
  );
}
