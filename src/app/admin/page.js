import { cookies } from "next/headers";
import { getSite, getProjects } from "@/lib/data";
import { DEV_COOKIE, isDevMode, isDeveloperCookie } from "@/lib/devAccess";
import AdminDashboard from "@/components/AdminDashboard";
import DevLogin from "@/components/DevLogin";

// The content manager. Only the developer gets past this page: with `npm run dev` it is
// always open, on a deployed site it asks for ADMIN_TOKEN first (see src/lib/devAccess.js).
// It is not linked from the menu, and search engines are told to stay away.
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Alex Stefan", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const jar = await cookies();
  if (!isDeveloperCookie(jar.get(DEV_COOKIE)?.value)) {
    return <DevLogin configured={Boolean(process.env.ADMIN_TOKEN)} />;
  }

  const site = await getSite();
  const projects = await getProjects();
  return <AdminDashboard initialSite={site} initialProjects={projects} mode={isDevMode() ? "development" : "production"} />;
}
