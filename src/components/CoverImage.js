"use client";

import { useEffect, useRef, useState } from "react";

// A project's cover picture, with a safety net: `srcs` is tried in order, and the first one that
// loads wins. Some covers are hot-linked from another site (Urban Strife uses Steam's header
// image); if that site is down or changes the address, the card falls through to the next picture
// (a local one) instead of showing a broken-image icon. When none load, `fallback` is shown.
export default function CoverImage({ srcs = [], alt = "", fallback = null, ...rest }) {
  const [index, setIndex] = useState(0);
  const ref = useRef(null);

  // An image that failed before React attached its error handler (during server-rendered load)
  // never fires onError again, so check once on mount and whenever the source changes.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setIndex((n) => n + 1);
  }, [index]);

  if (!srcs.length || index >= srcs.length) return fallback;
  return <img ref={ref} src={srcs[index]} alt={alt} onError={() => setIndex((n) => n + 1)} {...rest} />;
}
