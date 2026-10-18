/* Cover each wrapped line with complete 1 / 2 / 4-wide bricks, then drop them
   through the line mask. The paragraph wraps to a brick-unit grid so pieces
   are never cut. Row 1 leads. Each brick waits a random beat. Upper rows
   widen so their bodies hide the studs of the row below. */
(function () {
  var FILLS = ["bp-brick-fill-dark", "bp-brick-fill-accent", "bp-brick-fill-brand"];
  var EASE = {
    linear: "linear",
    smooth: "cubic-bezier(0.45, 0.05, 0.25, 1)",
    out: "cubic-bezier(0.16, 1, 0.3, 1)",
    "in": "cubic-bezier(0.7, 0, 0.84, 0)"
  };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var settings = { ease: "in", stagger: 340, spread: 280, dur: 400 };

  function packUnits(count) {
    var sizes = [];
    var left = Math.max(1, count | 0);
    while (left > 0) {
      var choices = [4, 2, 1].filter(function (n) {
        return n <= left;
      });
      var n = choices[0];
      if (choices.indexOf(4) !== -1 && Math.random() < 0.5) n = 4;
      else if (choices.indexOf(2) !== -1 && Math.random() < 0.7) n = 2;
      else n = choices[Math.floor(Math.random() * choices.length)];
      sizes.push(n);
      left -= n;
    }
    return sizes;
  }

  function lineRects(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var rects = Array.prototype.slice.call(range.getClientRects());
    range.detach();
    var lines = [];
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (r.width < 1 || r.height < 1) continue;
      var last = lines[lines.length - 1];
      if (last && Math.abs(r.top - last.top) < Math.min(r.height, last.height) * 0.55) {
        last.left = Math.min(last.left, r.left);
        last.right = Math.max(last.right, r.right);
        last.width = last.right - last.left;
        last.height = Math.max(last.height, r.height);
      } else {
        lines.push({
          left: r.left,
          right: r.right,
          top: r.top,
          width: r.width,
          height: r.height
        });
      }
    }
    return lines;
  }

  function metricsFromSize(fontSize) {
    var lh = fontSize * 1.2;
    var brickH = (lh * 225) / 175;
    var unit = Math.max(8, Math.round((brickH * 150) / 225));
    brickH = (unit * 225) / 150;
    return {
      unit: unit,
      brickH: brickH,
      stud: (brickH * 50) / 225,
      body: (unit * 175) / 150,
      fontSize: fontSize
    };
  }

  function measureMaxWidth(root) {
    var layout = root.closest(".ds-reveal-layout");
    if (layout) {
      var aside = layout.querySelector(".bp-reveal-controls");
      var gap = parseFloat(getComputedStyle(layout).columnGap) || 0;
      if (aside) {
        var beside = layout.clientWidth - aside.offsetWidth - gap;
        if (beside > 200) return beside;
      }
      return layout.clientWidth;
    }
    var hero = root.closest(".lp-reveal-hero");
    if (hero) return hero.clientWidth;
    var parent = root.parentElement;
    return parent ? parent.clientWidth : window.innerWidth;
  }

  function textWidth(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var rect = range.getBoundingClientRect();
    range.detach();
    return rect.width;
  }

  function applyWrapMetrics(copy, text, m) {
    copy.style.fontSize = m.fontSize + "px";
    copy.style.lineHeight = m.body + "px";
    text.style.textIndent = m.unit + "px";
  }

  function isCentered(root) {
    return root.classList.contains("bp-reveal--center");
  }

  function applyFixedMetrics(copy, lineEls, m, centered) {
    copy.style.fontSize = m.fontSize + "px";
    copy.style.lineHeight = m.body + "px";
    copy.style.width = "";
    copy.style.setProperty("--reveal-indent", centered ? "0px" : m.unit + "px");
    for (var i = 0; i < lineEls.length; i++) {
      lineEls[i].style.lineHeight = m.body + "px";
      lineEls[i].style.height = m.body + "px";
    }
  }

  function measureLines(copy, text, m) {
    var host = copy.getBoundingClientRect();
    var raw = lineRects(text);
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var offset = raw[i].left - host.left;
      offset = offset > m.unit * 0.5 ? m.unit : 0;
      out.push({ offset: offset, width: raw[i].width });
    }
    return out;
  }

  function planRows(lines, m, maxUnits) {
    var plans = new Array(lines.length);
    var below = 0;
    for (var r = lines.length - 1; r >= 0; r--) {
      var offsetUnits = lines[r].offset > 0 ? 1 : 0;
      var room = Math.max(1, maxUnits - offsetUnits);
      var textUnits = Math.max(1, Math.ceil((lines[r].width - 0.5) / m.unit));
      var need = Math.min(room, Math.max(textUnits, below - offsetUnits));
      plans[r] = {
        sizes: packUnits(need),
        offset: offsetUnits * m.unit,
        width: need * m.unit
      };
      below = offsetUnits + need;
    }
    return { plans: plans, units: below };
  }

  function layout(copy, text, maxWidth) {
    copy.style.fontSize = "";
    var start = Math.round(parseFloat(getComputedStyle(copy).fontSize) || 36);
    if (start > 48) start = 48;
    var size = start;
    var fallback = null;
    while (size >= 16) {
      var m = metricsFromSize(size);
      var cols = Math.floor(maxWidth / m.unit);
      if (cols < 3) {
        size -= 1;
        continue;
      }
      var wrap = cols * m.unit;
      applyWrapMetrics(copy, text, m);
      copy.style.width = wrap + "px";
      var lines = measureLines(copy, text, m);
      if (!lines.length) {
        size -= 1;
        continue;
      }
      var overflowWord = false;
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].offset + lines[i].width > wrap + 0.75) overflowWord = true;
      }
      var planned = planRows(lines, m, cols);
      fallback = { m: m, lines: lines, wrap: wrap, cols: cols, plans: planned.plans, units: planned.units };
      if (!overflowWord && planned.units <= cols) return fallback;
      size -= 1;
    }
    return fallback;
  }

  function measureFixedLines(lineEls, m, centered) {
    var out = [];
    for (var i = 0; i < lineEls.length; i++) {
      out.push({
        offset: centered ? 0 : i === 0 ? m.unit : 0,
        width: textWidth(lineEls[i])
      });
    }
    return out;
  }

  function layoutFixed(copy, lineEls, maxWidth, centered) {
    copy.style.fontSize = "";
    var start = Math.round(parseFloat(getComputedStyle(copy).fontSize) || 36);
    if (start > 36) start = 36;
    var size = start;
    var fallback = null;
    while (size >= 16) {
      var m = metricsFromSize(size);
      applyFixedMetrics(copy, lineEls, m, centered);
      var lines = measureFixedLines(lineEls, m, centered);
      if (!lines.length) {
        size -= 1;
        continue;
      }
      var planned = planRows(lines, m, 1000);
      var wrap = planned.units * m.unit;
      fallback = { m: m, lines: lines, wrap: wrap, cols: planned.units, plans: planned.plans, units: planned.units };
      if (wrap <= maxWidth) return fallback;
      size -= 1;
    }
    return fallback;
  }

  function build(root) {
    var copy = root.querySelector(".bp-reveal-copy");
    if (!copy) return;
    var old = root.querySelector(".bp-reveal-bricks");
    if (old) old.remove();
    root.classList.remove("is-playing");

    root.style.width = "";
    copy.style.width = "";
    copy.style.marginLeft = "";

    var maxWidth = measureMaxWidth(root);
    var centered = isCentered(root);
    var lineEls = copy.querySelectorAll(".bp-reveal-line");
    var text = copy.querySelector(".bp-reveal-text");
    var laid = lineEls.length
      ? layoutFixed(copy, lineEls, maxWidth, centered)
      : text
        ? layout(copy, text, maxWidth)
        : null;
    if (!laid) return;
    var m = laid.m;
    var plans = laid.plans;

    copy.style.setProperty("--reveal-indent", centered ? "0px" : m.unit + "px");
    if (centered) {
      copy.style.width = laid.wrap + "px";
      copy.style.textAlign = "center";
    }
    root.style.setProperty("--reveal-lh", m.body + "px");
    root.style.setProperty("--reveal-stud", m.stud + "px");
    root.style.setProperty("--reveal-brick-h", m.brickH + "px");
    root.style.setProperty("--reveal-ease", EASE[settings.ease] || EASE.smooth);

    var layer = document.createElement("div");
    layer.className = "bp-reveal-bricks";
    layer.setAttribute("aria-hidden", "true");
    layer.style.width = laid.wrap + "px";

    var lastFill = "";
    for (var row = 0; row < plans.length; row++) {
      var plan = plans[row];
      var rowEl = document.createElement("div");
      rowEl.className = "bp-reveal-row";
      rowEl.style.setProperty("--z", String(plans.length - row));
      rowEl.style.width = laid.wrap + "px";

      var clip = document.createElement("div");
      clip.className = "bp-reveal-clip";
      clip.style.left = (centered ? (laid.wrap - plan.width) / 2 : plan.offset) + "px";
      clip.style.width = plan.width + "px";

      var x = 0;
      for (var b = 0; b < plan.sizes.length; b++) {
        var n = plan.sizes[b];
        var w = n * m.unit;
        var fill = FILLS[Math.floor(Math.random() * FILLS.length)];
        if (fill === lastFill) fill = FILLS[(FILLS.indexOf(fill) + 1) % FILLS.length];
        lastFill = fill;

        var brick = document.createElement("span");
        brick.className = "bp-brick bp-brick--" + n + " " + fill + " bp-reveal-brick";
        brick.style.width = w + "px";
        brick.style.height = m.brickH + "px";
        brick.style.left = x + "px";
        brick.style.setProperty("--delay", row * settings.stagger + Math.random() * settings.spread + "ms");
        brick.style.setProperty("--dur", settings.dur + "ms");
        clip.appendChild(brick);
        x += w;
      }

      rowEl.appendChild(clip);
      layer.appendChild(rowEl);
    }

    root.appendChild(layer);
  }

  function play(root, generation, token) {
    root.classList.remove("is-playing");
    window.setTimeout(function () {
      if (token.gen !== generation) return;
      root.classList.add("is-playing");
    }, 420);
  }

  function boot(root) {
    if (reduce) return;
    var token = { gen: 0 };
    var lastW = 0;
    var booted = false;
    var resizeTimer = 0;
    var replay = document.querySelector("[data-reveal-replay]");

    function run() {
      build(root);
      lastW = measureMaxWidth(root);
      token.gen += 1;
      play(root, token.gen, token);
    }

    function onResize() {
      if (!booted) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        var w = measureMaxWidth(root);
        if (Math.abs(w - lastW) < 2) return;
        lastW = w;
        build(root);
      }, 120);
    }

    document.fonts.ready.then(function () {
      build(root);
      lastW = measureMaxWidth(root);
      booted = true;

      var started = false;
      var io = new IntersectionObserver(
        function (entries) {
          if (started || !entries.some(function (e) { return e.isIntersecting; })) return;
          started = true;
          io.disconnect();
          token.gen += 1;
          play(root, token.gen, token);
        },
        { threshold: 0.45 }
      );
      io.observe(root);

      var target = root.closest(".ds-reveal-layout") || root.parentElement || root;
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(onResize);
        ro.observe(target);
      } else {
        window.addEventListener("resize", onResize);
      }
    });

    if (replay) replay.addEventListener("click", run);

    var controls = document.querySelector(".bp-reveal-controls");
    if (controls) {
      controls.querySelectorAll("[data-ease]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          settings.ease = btn.getAttribute("data-ease");
          controls.querySelectorAll("[data-ease]").forEach(function (other) {
            other.setAttribute("aria-pressed", other === btn ? "true" : "false");
          });
          run();
        });
      });
      function bindRange(sel, key, outSel) {
        var input = controls.querySelector(sel);
        var out = controls.querySelector(outSel);
        if (!input) return;
        input.addEventListener("input", function () {
          settings[key] = Number(input.value);
          if (out) out.textContent = input.value;
        });
        input.addEventListener("change", run);
      }
      bindRange("[data-stagger]", "stagger", "[data-stagger-val]");
      bindRange("[data-spread]", "spread", "[data-spread-val]");
      bindRange("[data-dur]", "dur", "[data-dur-val]");
    }
  }

  document.querySelectorAll("[data-reveal]").forEach(boot);
})();
