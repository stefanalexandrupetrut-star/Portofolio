// Headers sent with every page. They stop other sites from framing yours, from guessing file types, and from
// seeing full page addresses when someone follows a link away from the site.
// (The project pages put the 1KeyForge app in a frame of their own — same site — which SAMEORIGIN allows.)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  // Next 16.4 writes an AGENTS.md (instructions for AI coding tools) into the project folder every time
  // `npm run dev` starts. This is a personal site, not a repo for those tools, so keep that file out of it.
  agentRules: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  async redirects() {
    return [
      // The project was renamed from "Retro PetZ" to "ChibiChum". Keep the old address working.
      { source: "/work/retro-petz", destination: "/work/chibichum", permanent: true },
      // The app used to be a public file. Old links now go through the developer-only route.
      { source: "/apps/1keyforge-pro.html", destination: "/apps/1keyforge-pro", permanent: false },
    ];
  },

  // These files are read from disk while the site runs (not imported), so tell the build to ship them
  // with the server — needed on hosts such as Vercel that only upload the files a route is known to use.
  outputFileTracingIncludes: {
    "/*": ["./data/**/*"],
    "/apps/1keyforge-pro": ["./private/apps/**/*"],
  },
};

export default nextConfig;
