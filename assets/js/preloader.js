// assets/js/preloader.js — animasi splash screen 1% -> 100% saat halaman dibuka

(function () {
  var overlay = document.getElementById('fs-preloader');
  if (!overlay) return;

  var fill = document.getElementById('fs-preloader-fill');
  var percentEl = document.getElementById('fs-preloader-percent');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var duration = reduceMotion ? 150 : 1700; // ms
  var start = null;

  function tick(timestamp) {
    if (start === null) start = timestamp;
    var elapsed = timestamp - start;
    var progress = Math.min(1, elapsed / duration);
    var pct = Math.max(1, Math.round(progress * 100));

    fill.style.width = pct + '%';
    percentEl.textContent = pct + '%';

    if (progress < 1) {
      window.requestAnimationFrame(tick);
    } else {
      finish();
    }
  }

  function finish() {
    setTimeout(function () {
      overlay.classList.add('is-done');
      overlay.setAttribute('aria-hidden', 'true');
      setTimeout(function () { overlay.remove(); }, 550);
    }, 150);
  }

  window.requestAnimationFrame(tick);
})();
