(function () {
  'use strict';

  /* ---------- 滚动进度 + 导航主题 ---------- */
  var progressBar = document.getElementById('progress');
  var top = document.getElementById('top');
  var hasHero = !!document.querySelector('.hero');
  var ticking = false;

  if (!hasHero && top) top.classList.add('light');

  function onScrollAll() {
    var h = document.documentElement;
    var max = h.scrollHeight - window.innerHeight;
    var y = window.scrollY || h.scrollTop;
    if (progressBar) progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    if (hasHero && top) top.classList.toggle('light', y > window.innerHeight * 0.9);
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScrollAll); } }, { passive: true });
  onScrollAll();

  /* ---------- 进场动画 ---------- */
  var reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.06, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 灯箱 ---------- */
  var viewer = document.getElementById('viewer');
  if (!viewer) return;
  var vStage = document.getElementById('vStage');
  var vImg = document.getElementById('vImg');
  var vCap = document.getElementById('vCap');
  var vName = document.getElementById('vName');
  var vCount = document.getElementById('vCount');

  var plates = Array.prototype.slice.call(document.querySelectorAll('.plate img')).map(function (img) {
    var fig = img.closest('figure');
    var cap = fig ? fig.querySelector('figcaption') : null;
    return {
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      cap: cap ? Array.prototype.map.call(cap.children, function (c) { return c.textContent.replace(/\s+/g, ' ').trim(); }).join(' · ') : '',
      name: img.getAttribute('src').split('/').pop()
    };
  });

  var idx = 0, scale = 1, tx = 0, ty = 0, dragging = false, sx = 0, sy = 0, moved = false;
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function paint() { vImg.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; }
  function show(i) {
    idx = (i + plates.length) % plates.length;
    scale = 1; tx = 0; ty = 0;
    vImg.src = plates[idx].src;
    vImg.alt = plates[idx].alt;
    vCap.textContent = plates[idx].cap;
    vName.textContent = plates[idx].name;
    vCount.textContent = (idx + 1) + ' / ' + plates.length;
    paint();
  }
  function open(i) { show(i); viewer.hidden = false; document.documentElement.style.overflow = 'hidden'; requestAnimationFrame(function () { viewer.classList.add('on'); }); }
  function close() { viewer.classList.remove('on'); document.documentElement.style.overflow = ''; setTimeout(function () { viewer.hidden = true; }, 300); }

  document.querySelectorAll('.plate').forEach(function (fig) {
    var imgEl = fig.querySelector('img');
    if (!imgEl) return;
    var i = plates.findIndex(function (pl) { return pl.src === imgEl.getAttribute('src'); });
    var openMe = function () { open(i < 0 ? 0 : i); };
    fig.setAttribute('tabindex', '0');
    fig.setAttribute('role', 'button');
    fig.setAttribute('aria-label', '查看大图：' + (imgEl.getAttribute('alt') || ''));
    fig.addEventListener('click', openMe);
    fig.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMe(); } });
  });

  document.getElementById('vClose').addEventListener('click', close);
  document.getElementById('vPrev').addEventListener('click', function (e) { e.stopPropagation(); show(idx - 1); });
  document.getElementById('vNext').addEventListener('click', function (e) { e.stopPropagation(); show(idx + 1); });

  viewer.addEventListener('click', function (e) { if (e.target === vStage && scale === 1 && !moved) { close(); } });

  vStage.addEventListener('wheel', function (e) {
    e.preventDefault();
    var k = e.deltaY < 0 ? 1.14 : 1 / 1.14;
    scale = clamp(scale * k, 1, 6);
    if (scale === 1) { tx = 0; ty = 0; }
    paint();
  }, { passive: false });

  vStage.addEventListener('pointerdown', function (e) {
    dragging = true; moved = false;
    sx = e.clientX - tx; sy = e.clientY - ty;
    vStage.classList.add('dragging');
    vStage.setPointerCapture(e.pointerId);
  });
  vStage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    tx = e.clientX - sx; ty = e.clientY - sy;
    if (Math.abs(tx) > 3 || Math.abs(ty) > 3) moved = true;
    paint();
  });
  vStage.addEventListener('pointerup', function (e) {
    dragging = false; vStage.classList.remove('dragging');
    try { vStage.releasePointerCapture(e.pointerId); } catch (err) {}
  });
  vStage.addEventListener('dblclick', function () { if (scale > 1) { scale = 1; tx = 0; ty = 0; } else { scale = 2.4; } paint(); });

  document.addEventListener('keydown', function (e) {
    if (viewer.hidden) return;
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'ArrowLeft') { show(idx - 1); }
    else if (e.key === 'ArrowRight') { show(idx + 1); }
    else if (e.key === '+' || e.key === '=') { scale = clamp(scale * 1.2, 1, 6); paint(); }
    else if (e.key === '-') { scale = clamp(scale / 1.2, 1, 6); if (scale === 1) { tx = 0; ty = 0; } paint(); }
    else if (e.key === '0') { scale = 1; tx = 0; ty = 0; paint(); }
  });
})();
