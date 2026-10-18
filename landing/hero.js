(function () {
  var root = document.querySelector("[data-prompt]");
  if (!root) return;

  var wordEl = root.querySelector("[data-prompt-word]");
  var live = root.querySelector("[data-prompt-live]");
  var caret = root.querySelector("[data-prompt-caret]");
  var words = ["racecar", "spaceship", "dinosaur"];
  var hold = 3000;
  var typeMs = 58;
  var deleteMs = 32;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function show(index, fade) {
    return new Promise(function (resolve) {
      window.__lpModel = index;
      document.dispatchEvent(
        new CustomEvent("lp-prompt", {
          detail: { index: index, fade: !!fade, done: resolve },
        }),
      );
    });
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  if (reduced) {
    wordEl.textContent = words[0];
    live.textContent = "I wanna build a " + words[0];
    if (caret) caret.hidden = true;
    show(0);
    return;
  }

  var stopped = false;

  async function run() {
    var i = 0;
    var started = false;
    while (!stopped) {
      var word = words[i];
      if (!started) {
        show(i, false);
        started = true;
      } else {
        await show(i, true);
        if (stopped) return;
      }
      for (var n = 1; n <= word.length; n++) {
        wordEl.textContent = word.slice(0, n);
        await wait(typeMs);
        if (stopped) return;
      }
      live.textContent = "I wanna build a " + word;
      await wait(hold);
      if (stopped) return;
      for (var d = word.length - 1; d >= 0; d--) {
        wordEl.textContent = word.slice(0, d);
        await wait(deleteMs);
        if (stopped) return;
      }
      i = (i + 1) % words.length;
    }
  }

  run();
})();
