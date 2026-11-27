import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SiteEffects from "@/components/SiteEffects";
import Particles from "@/components/Particles";
import DevModeGear from "@/components/DevModeGear";
import { getSite, getProjects } from "@/lib/data";

// The public address of the site, used to turn "/images/…" paths into full links in the
// share previews (Open Graph). Set NEXT_PUBLIC_SITE_URL on your host (see .env.example);
// on Vercel it falls back to the project's production address automatically.
function siteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3000";
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
}

const TITLE = "Alex Stefan — UI/UX Designer & Indie Developer";
const DESCRIPTION =
  "Alex Stefan — Senior UI/UX Designer for AAA & mobile games, and indie developer building apps, games, and design tools.";

export const metadata = {
  metadataBase: siteUrl(),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: "Alex Stefan", type: "website", locale: "en_US" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export const viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default async function RootLayout({ children }) {
  const site = await getSite();
  const projects = await getProjects();

  return (
    // suppressHydrationWarning on <html> and <body>: browser extensions (Grammarly, Dark Reader, password managers,
    // translators …) add attributes to these two elements before React starts, which otherwise makes `npm run dev`
    // print "A tree hydrated but some attributes of the server rendered HTML didn't match". It only silences those
    // two elements' own attributes — real mismatches anywhere else on the page are still reported.
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Site fonts. This is the root layout, so every page loads this stylesheet. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@600&family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;0,900;1,700&family=Barlow:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Sections fade in with a script; without one they would stay invisible, so show them as they are. */}
        <noscript>
          <style>{".reveal,.reveal-left,.reveal-right{opacity:1!important;transform:none!important}"}</style>
        </noscript>
      </head>
      <body suppressHydrationWarning>
        <a href="#main" className="skip-link">Skip to content</a>
        <Particles />
        <SiteEffects />
        <Nav name={site.name} />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer site={site} projects={projects} />
        <DevModeGear />
      </body>
    </html>
  );
}
