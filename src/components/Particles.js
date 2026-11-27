"use client";

import { useEffect, useRef } from "react";

// A subtle drifting-dot texture over the dark background, ~10%
// opacity overall (set via CSS on the canvas itself, not per-dot),
// mounted once in the root layout so it runs behind every page.
// Visitors who ask their device for reduced motion get one still frame instead of an animation.
export default function Particles() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let w = 0;
    let h = 0;
    let particles = [];
    let raf = 0;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    function init() {
      particles = Array.from({ length: 55 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.6,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        c: Math.random() > 0.5 ? "#fff" : "#ff3355",
      }));
    }
    function draw(move) {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        if (move) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.fill();
      });
    }
    function tick() {
      draw(true);
      raf = requestAnimationFrame(tick);
    }
    function onResize() {
      // Phones fire "resize" whenever the address bar slides away; ignore those small height changes.
      if (Math.abs(window.innerWidth - w) < 1 && Math.abs(window.innerHeight - h) < 150) return;
      resize();
      init();
      if (reduceMotion.matches) draw(false);
    }

    resize();
    init();
    if (reduceMotion.matches) draw(false);
    else tick();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas id="particles" ref={ref} aria-hidden="true" />;
}
