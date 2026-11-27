// Generic line-icon glyphs for the skills/software grid — not
// reproductions of any company's logo artwork, just simple shapes
// that hint at each tool's category. Add a new skill by adding an
// icon here and a matching { icon, label } entry to `skills` in
// data/site.json.
const props = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const SKILL_ICONS = {
  figma: (
    <svg {...props}>
      <path d="M12 2l7 7-9 13-7-7z" />
      <path d="M12 2v13" />
      <circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  adobe: (
    <svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2.1" />
      <path d="M3 17l5-5 4 4 3-3 6 6" />
    </svg>
  ),
  blender: (
    <svg {...props}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 3v9M12 12l8-4.5M12 12l-8-4.5M12 12v9" />
    </svg>
  ),
  unity: (
    <svg {...props}>
      <rect x="2" y="8" width="20" height="10" rx="5" />
      <path d="M7 11v4M5 13h4" />
      <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  reactnative: (
    <svg {...props}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M10 19h4" />
    </svg>
  ),
  ai: (
    <svg {...props}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </svg>
  ),
  abtest: (
    <svg {...props}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M7 12h3M13 12l3-4.5M13 12l3 4.5" />
    </svg>
  ),
  krita: (
    <svg {...props}>
      <path d="M12 2a9 9 0 100 18c1 0 1.5-.5 1.5-1.5S13 17 13 16a1.5 1.5 0 011.5-1.5H17a4 4 0 004-4c0-4.5-4-8.5-9-8.5z" />
      <circle cx="7" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  comfy: (
    <svg {...props}>
      <rect x="3" y="4" width="6" height="4" rx="1" />
      <rect x="15" y="4" width="6" height="4" rx="1" />
      <rect x="9" y="16" width="6" height="4" rx="1" />
      <path d="M6 8v4h12V8M12 12v4" />
    </svg>
  ),
};
