/* LOOMR editorial — parallax++, imleç, sayaçlar, yatay pinned galeri, reveal */
(function () {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;

  const bg = document.querySelector(".ed-hero__bg");
  const inner = document.querySelector(".ed-hero__inner");
  const pxEls = [...document.querySelectorAll("[data-px]")];
  const hg = document.querySelector(".h-gallery");
  const hgTrack = document.querySelector(".h-gallery__track");
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY || window.pageYOffset;
    const vh = window.innerHeight;

    if (!reduce && y < vh * 1.5 && inner) {
      inner.style.transform = "translate3d(0," + (-y * 0.24).toFixed(1) + "px,0)";
      inner.style.opacity = Math.max(0, 1 - y / (vh * 0.7)).toFixed(3);
    }

    if (!reduce) for (const el of pxEls) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) continue;
      const sp = parseFloat(el.dataset.px) || 0.15;
      const off = r.top + r.height / 2 - vh / 2;
      el.style.transform = "translate3d(0," + (-off * sp).toFixed(1) + "px,0)";
    }

    // yatay pinned galeri: dikey scroll → yatay kayma
    if (hg && hgTrack) {
      const r = hg.getBoundingClientRect();
      const total = hg.offsetHeight - vh;
      const prog = Math.min(1, Math.max(0, -r.top / (total || 1)));
      const max = Math.max(0, hgTrack.scrollWidth - window.innerWidth);
      hgTrack.style.transform = "translate3d(" + (-prog * max).toFixed(1) + "px,0,0)";
    }
  }
  function onScroll() { if (!ticking) { requestAnimationFrame(update); ticking = true; } }

  /* ---- scroll reveal ---- */
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(function (es) {
        for (const e of es) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }, { threshold: 0.14, rootMargin: "0px 0px -60px 0px" })
    : null;
  document.querySelectorAll(".reveal").forEach(function (el, i) {
    if (reduce) { el.classList.add("in"); return; }
    el.style.transitionDelay = (i % 5) * 70 + "ms";
    if (io) io.observe(el); else el.classList.add("in");
  });

  /* ---- sayaçlar (count-up) ---- */
  function countUp(el) {
    const target = parseFloat(el.dataset.count) || 0;
    const suf = el.dataset.suffix || "";
    const dur = 1500, t0 = performance.now();
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const v = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = v + suf;
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  const cio = "IntersectionObserver" in window
    ? new IntersectionObserver(function (es) {
        for (const e of es) if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
      }, { threshold: 0.5 })
    : null;
  document.querySelectorAll("[data-count]").forEach(function (el) {
    if (reduce || !cio) { el.textContent = (el.dataset.count || "") + (el.dataset.suffix || ""); return; }
    cio.observe(el);
  });

  /* ---- imleç takibi ---- */
  if (fine && !reduce) {
    const cur = document.querySelector(".ed-cursor");
    if (cur) {
      let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
      addEventListener("mousemove", function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
      (function loop() {
        cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
        cur.style.transform = "translate3d(" + cx + "px," + cy + "px,0) translate(-50%,-50%)";
        requestAnimationFrame(loop);
      })();
      document.body.classList.add("has-cursor");
    }
  }

  /* ---- hero: giriş (intro) animasyonu ---- */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.documentElement.classList.add("ed-loaded"); });
  });

  /* ---- hero fotoğrafı: interaktif spring parallax + 3D tilt + intro push-in ---- */
  if (bg && !reduce) {
    let nx = 0, ny = 0, sx = 0, sy = 0, vx = 0, vy = 0;
    const t0 = performance.now();
    if (fine) addEventListener("mousemove", function (e) {
      nx = (e.clientX / window.innerWidth - 0.5) * 2;
      ny = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    (function hero() {
      const now = performance.now();
      const y = window.scrollY || window.pageYOffset;
      const vh = window.innerHeight;
      let p = Math.min(1, (now - t0) / 1500); p = 1 - Math.pow(1 - p, 3); // easeOutCubic
      if (fine) {
        vx = (vx + (nx - sx) * 0.055) * 0.82; sx += vx;
        vy = (vy + (ny - sy) * 0.055) * 0.82; sy += vy;
      }
      if (y < vh * 1.5) {
        const zoom = 1.1 + (1 - p) * 0.16 + Math.min(y, vh) / vh * 0.09;
        const tx = sx * 26, ty = y * 0.5 + sy * 26 + (1 - p) * -20;
        bg.style.transform = "perspective(1400px) translate3d(" + tx.toFixed(1) + "px," + ty.toFixed(1) +
          "px,0) scale(" + zoom.toFixed(3) + ") rotateX(" + (-sy * 2).toFixed(2) + "deg) rotateY(" + (sx * 2.3).toFixed(2) + "deg)";
      }
      requestAnimationFrame(hero);
    })();
  } else if (bg) {
    bg.style.transform = "scale(1.03)";
  }

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", update);
  update();
})();
