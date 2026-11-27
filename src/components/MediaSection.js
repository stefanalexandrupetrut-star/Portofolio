"use client";

import { useState, useEffect, useRef } from "react";
import { toEmbedUrl } from "@/lib/video";

// One reusable block for "some images (optionally led by a big cover
// shot) plus some videos" — used both for a simple project's main
// media and for each module inside a multi-part case study like
// Watch Dogs: Legion. All images on the page share one lightbox.
//
// `videos` is just a list — 0, 1, or a dozen entries all work the
// same way, for any project or module; nothing here is hardcoded to
// a specific case study.
export default function MediaSection({ images = [], videos = [], title, coverAlt, showCover = false, heading }) {
  // The lightbox holds the picture that is open and its description.
  const [open, setOpen] = useState(null); // { src, alt } | null
  const closeRef = useRef(null);
  const openerRef = useRef(null); // the thumbnail that opened it, so focus can go back there

  const cover = showCover ? images[0] : null;
  const gridImages = showCover ? images.slice(1) : images;
  const embeds = videos.map((v) => toEmbedUrl(v)).filter(Boolean);

  const openImage = (event, src, alt) => {
    openerRef.current = event.currentTarget;
    setOpen({ src, alt });
  };
  const close = () => {
    setOpen(null);
    openerRef.current?.focus?.();
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(null);
        openerRef.current?.focus?.();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {cover && (
        <button type="button" className="cover-image" onClick={(e) => openImage(e, cover, coverAlt || `${title} cover`)} aria-haspopup="dialog">
          <img src={cover} alt={coverAlt || `${title} cover`} />
          <span className="expand-ic" aria-hidden="true"><ExpandIcon size={40} /></span>
        </button>
      )}

      {heading && <div className="section-eyebrow" style={{ paddingLeft: 0, paddingRight: 0 }}>{heading}</div>}

      {embeds.length > 0 && (
        <>
          <div className="section-eyebrow" style={{ paddingLeft: 0, paddingRight: 0 }}>Official Videos</div>
          <div className="videos-wrap" style={{ padding: "12px 0 0" }}>
            {embeds.map((src, i) => (
              <div className="reel-frame" key={src + i}>
                <iframe
                  src={src}
                  title={`${title} video ${i + 1}`}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ))}
          </div>
        </>
      )}

      {gridImages.length > 0 && (
        <>
          <div className="section-eyebrow" style={{ paddingLeft: 0, paddingRight: 0 }}>
            {showCover ? `Gallery — ${gridImages.length} Images` : `${gridImages.length} Images`}
          </div>
          <div className="gallery-grid" style={{ marginTop: 12, marginLeft: 0, marginRight: 0 }}>
            {gridImages.map((src, i) => {
              const alt = `${title} — image ${i + 1} of ${gridImages.length}`;
              return (
                <button type="button" key={src + i} className="gallery-item" onClick={(e) => openImage(e, src, alt)} aria-haspopup="dialog">
                  <img src={src} alt={alt} loading="lazy" />
                  <span className="expand-ic" aria-hidden="true"><ExpandIcon size={34} /></span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={open.alt} onClick={close}>
          <button type="button" ref={closeRef} className="lightbox-close" onClick={close} aria-label="Close image">
            <span aria-hidden="true">✕</span>
          </button>
          <div className="lightbox-frame" onClick={(e) => e.stopPropagation()}>
            <img src={open.src} alt={open.alt} />
          </div>
        </div>
      )}
    </>
  );
}

function ExpandIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}
