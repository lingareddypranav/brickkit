/* Lerp the window toward the intended scroll position.
   Native scroll stays on for reduced motion, scrollbar, and touch. */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var EASE = 0.085;
  var current = window.scrollY || 0;
  var target = current;
  var lastWrote = current;

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function clamp(n) {
    return Math.max(0, Math.min(n, maxScroll()));
  }

  function onWheel(e) {
    if (e.ctrlKey) return;
    e.preventDefault();
    target = clamp(target + e.deltaY);
  }

  function onKey(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) return;

    var page = window.innerHeight * 0.9;
    var line = 48;
    var next = target;
    if (e.key === "ArrowDown") next += line;
    else if (e.key === "ArrowUp") next -= line;
    else if (e.key === "PageDown" || (e.key === " " && !e.shiftKey)) next += page;
    else if (e.key === "PageUp" || (e.key === " " && e.shiftKey)) next -= page;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = maxScroll();
    else return;

    e.preventDefault();
    target = clamp(next);
  }

  function onAnchor(e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    var el = id ? document.getElementById(id) : document.documentElement;
    if (!el) return;
    e.preventDefault();
    target = clamp(el.getBoundingClientRect().top + (window.scrollY || 0));
  }

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);
  document.addEventListener("click", onAnchor);
  window.addEventListener("resize", function () {
    target = clamp(target);
  });
  window.addEventListener("scroll", function () {
    var y = window.scrollY || 0;
    if (Math.abs(y - lastWrote) < 1) return;
    current = target = y;
  });

  function tick() {
    current += (target - current) * EASE;
    if (Math.abs(target - current) < 0.4) current = target;
    if (Math.abs((window.scrollY || 0) - current) >= 0.5) {
      lastWrote = current;
      window.scrollTo(0, current);
    }
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
