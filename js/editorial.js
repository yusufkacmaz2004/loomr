/* LOOMR editorial — parallax + scroll reveal (hafif, performanslı) */
(function () {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bg = document.querySelector(".ed-hero__bg");
  const pxEls = [...document.querySelectorAll("[data-px]")];
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY || window.pageYOffset;
    const vh = window.innerHeight;

    // hero arka plan parallax (yavaş kayar)
    if (bg && y < vh * 1.3) bg.style.transform = "translate3d(0," + (y * 0.32).toFixed(1) + "px,0)";

    // genel parallax öğeleri (kendi hızlarıyla)
    for (const el of pxEls) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -240 || r.top > vh + 240) continue;
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
