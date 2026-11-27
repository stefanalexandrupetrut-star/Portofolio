"use client";

import { useState, useRef } from "react";
import { adminFetch } from "@/lib/adminFetch";

// A small "pick a file → POST to /api/upload → get back a URL" widget.
// `folder` controls where the file lands under /public/images (see
// src/app/api/upload/route.js). `onUploaded(url)` is called once the
// upload succeeds so the parent can save that URL into its data.
export default function ImageUploader({ folder, onUploaded, label = "Upload Image" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const { url } = await adminFetch("/api/upload", { method: "POST", body: formData });
      onUploaded(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="btn btn-ghost btn-small" style={{ cursor: busy ? "wait" : "pointer" }}>
        {busy ? "Uploading..." : label}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleChange}
          disabled={busy}
          style={{ display: "none" }}
        />
      </label>
      {error && <div className="admin-msg error">{error}</div>}
    </div>
  );
}
