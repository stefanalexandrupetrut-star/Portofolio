"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// What anyone sees at /admin until Developer Mode is unlocked on a deployed site.
// The access token is checked on the server (POST /api/dev/session); on success the server
// sets an HttpOnly cookie and this page is refreshed into the content manager.
export default function DevLogin({ configured }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!token || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/dev/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      setToken("");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dev-login">
      <div className="section-label">Developer mode</div>
      <h1>Developer sign-in</h1>
      {configured ? (
        <>
          <p>
            This area is only for the developer of the site. Enter the access token to edit content and to open the private
            1KeyForge Pro app.
          </p>
          <form onSubmit={submit}>
            <div className="fg">
              <label htmlFor="dev-token">Access token</label>
              <input
                id="dev-token"
                name="token"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-red" disabled={busy}>
              {busy ? "Checking…" : "Unlock"}
            </button>
            <div aria-live="polite">{error && <div className="admin-msg error">{error}</div>}</div>
          </form>
        </>
      ) : (
        <p>
          Developer access is not set up on this server. Add an <code>ADMIN_TOKEN</code> environment variable on your host
          and redeploy — the README explains how.
        </p>
      )}
      <p style={{ marginTop: 28, marginBottom: 0 }}>
        <Link href="/" style={{ color: "var(--red)" }}>← Back to the site</Link>
      </p>
    </div>
  );
}
