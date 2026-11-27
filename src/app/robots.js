// robots.txt — search engines may index the portfolio, but not the admin, the API or the private app.
export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/apps/"] }],
  };
}
