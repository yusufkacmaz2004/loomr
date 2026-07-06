/* LOOMR — shared front-end behaviour */

// Scroll-reveal
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// Mobile nav toggle (simple dropdown)
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");
if (toggle && links) {
  toggle.addEventListener("click", () => {
    const open = links.style.display === "flex";
    links.style.display = open ? "" : "flex";
    links.style.flexDirection = "column";
    links.style.position = "absolute";
    links.style.top = "74px";
    links.style.left = "0";
    links.style.right = "0";
    links.style.background = "var(--paper)";
    links.style.padding = "1.5rem";
    links.style.borderBottom = "1px solid var(--line)";
    if (open) links.removeAttribute("style");
  });
}
