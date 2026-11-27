import Link from "next/link";

export const metadata = { title: "Page not found — Alex Stefan", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="page active" style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", padding: "120px 24px" }}>
      <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontWeight: 400, fontSize: "clamp(60px,10vw,120px)", color: "var(--red)", lineHeight: 1 }}>404</h1>
      <p style={{ color: "var(--gray)", margin: "16px 0 32px", fontSize: 15 }}>That page doesn&apos;t exist.</p>
      <Link href="/" className="btn btn-red">Back to Home →</Link>
    </div>
  );
}
