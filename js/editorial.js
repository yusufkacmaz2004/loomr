/* LOOMR editorial — parallax + scroll reveal (hafif, performanslı) */
(function () {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bg = document.querySelector(".ed-hero__bg");
  const inner = document.querySelector(".ed-hero__inner");
  const pxEls = [...document.querySelectorAll("[data-px]")];
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY || window.pageYOffset;
    const vh = window.innerHeight;

    if (y < vh * 1.4) {
      // hero arka plan: güçlü parallax + hafif zoom-in
      if (bg) {
        const sc = 1 + Math.min(y, vh) / vh * 0.14;
        bg.style.transform = "translate3d(0," + (y * 0.5).toFixed(1) + "px,0) scale(" + sc.toFixed(3) + ")";
      }
      // hero içerik (başlık): daha hızlı yukarı süzülür + solar (ön katman)
      if (inner) {
        inner.style.transform = "translate3d(0," + (-y * 0.22).toFixed(1) + "px,0)";
        inner.style.opacity = Math.max(0, 1 - y / (vh * 0.72)).toFixed(3);
      }
    }

    // genel parallax öğeleri (kendi hızlarıyla)
    for (const el of pxEls) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) continue;
      const sp = parseFloat(el.dataset.px) || 0.15;
      const off = r.top + r.height / 2 - vh / 2;
      el.style.transform = "translate3d(0," + (-off * sp).toFixed(1) + "px,0)";
    }
  }

  function onScroll() { if (!ticking) { requestAnimationFrame(update); ticking = true; } }

  // scroll reveal
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(function (es) {
        for (const e of es) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }, { threshold: 0.14, rootMargin: "0px 0px -60px 0px" })
    : null;

  if (reduce) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    if (bg) bg.style.transform = "";
    return;
  }

  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (i % 5) * 70 + "ms";
    if (io) io.observe(el); else el.classList.add("in");
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
