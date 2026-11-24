/* ===========================
   PRIVATE CLUB — Desktop window manager
   Each section opens in a draggable window (an iframe of the real page),
   with a button in the taskbar to minimize / restore it.
   =========================== */
(function () {
  'use strict';

  var SECTIONS = {
    home:        { title: 'Home',            url: '/home/' },
    posts:       { title: 'Todos los posts', url: '/posts/' },
    albumes:     { title: 'Álbumes',         url: '/albumes/' },
    selecciones: { title: 'Selections',      url: '/selecciones/' },
    about:       { title: 'Acerca de',       url: '/about/' }
  };

  var embedded = window.top !== window.self;
  var shellRoot = document.getElementById('desktop-windows');

  // A page loaded inside a window must never render the desktop shell itself.
  if (embedded) {
    if (location.pathname === '/') location.replace('/home/');
    return;
  }

  // Standalone page (post opened from a direct link): icons hand off to the desktop.
  if (!shellRoot) {
    document.querySelectorAll('.desktop-icon[data-section]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        location.href = '/#' + a.dataset.section;
      });
    });
    return;
  }

  /* ---------- Desktop shell ---------- */
  var taskbar = document.getElementById('taskbar-windows');
  var mobile = window.matchMedia('(max-width: 700px)');
  var wins = {};
  var zTop = 100;
  var opened = 0;

  function sectionForPath(path) {
    if (path.indexOf('/albumes') === 0) return 'albumes';
    if (path.indexOf('/selecciones') === 0) return 'selecciones';
    if (path.indexOf('/about') === 0) return 'about';
    if (path.indexOf('/home') === 0) return 'home';
    return 'posts';
  }

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    for (var k in (attrs || {})) n.setAttribute(k, attrs[k]);
    return n;
  }

  function iconImg(key, size) {
    return el('img', size === 16 ? 'titlebar-icon' : '', {
      src: '/img/icons/' + key + '.svg', alt: '', width: size, height: size
    });
  }

  function cleanTitle(t) { return (t || '').replace(/\s+—\s+privateclub\s*$/i, ''); }

  function create(key, path) {
    var sec = SECTIONS[key];
    var w = { key: key, minimized: false };

    w.el = el('section', 'window app-window', { role: 'dialog', 'aria-label': sec.title });
    var bar = el('div', 'window-titlebar');
    var title = el('span', 'app-title');
    title.appendChild(iconImg(key, 16));
    w.titleText = el('span', 'app-title-text');
    w.titleText.textContent = sec.title;
    title.appendChild(w.titleText);

    var controls = el('div', 'titlebar-controls');
    [['min', '_', 'Minimizar'], ['max', '□', 'Maximizar'], ['close', '✕', 'Cerrar']].forEach(function (b) {
      var btn = el('button', 'titlebar-btn', { type: 'button', 'data-act': b[0], 'aria-label': b[2] });
      btn.textContent = b[1];
      controls.appendChild(btn);
    });
    bar.appendChild(title);
    bar.appendChild(controls);

    var body = el('div', 'app-body');
    // No allow-top-navigation: a page inside a window can never redirect the desktop itself
    w.iframe = el('iframe', '', {
      title: sec.title,
      src: path || sec.url,
      sandbox: 'allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms'
    });
    body.appendChild(w.iframe);
    w.el.appendChild(bar);
    w.el.appendChild(body);

    // Position: cascade from the top-left, sized to the viewport
    var vw = window.innerWidth, vh = window.innerHeight - 32;
    var width = Math.min(880, vw - 150), height = Math.min(600, vh - 40);
    var step = (opened++ % 8) * 28;
    w.el.style.width = width + 'px';
    w.el.style.height = height + 'px';
    w.el.style.left = Math.min(130 + step, Math.max(vw - width - 10, 0)) + 'px';
    w.el.style.top = Math.min(18 + step, Math.max(vh - height - 6, 0)) + 'px';

    // Taskbar button
    w.btn = el('button', 'taskbar-item', { type: 'button' });
    w.btn.appendChild(iconImg(key, 16));
    w.btnText = el('span');
    w.btnText.textContent = sec.title;
    w.btn.appendChild(w.btnText);
    taskbar.appendChild(w.btn);

    shellRoot.appendChild(w.el);
    wins[key] = w;
    bind(w);
    return w;
  }

  function setTitle(w, text) {
    if (!text) return;
    w.titleText.textContent = text;
    w.btnText.textContent = text;
    w.el.setAttribute('aria-label', text);
  }

  function bind(w) {
    // Keep the window title in sync with the page shown inside it
    w.iframe.addEventListener('load', function () {
      try {
        var doc = w.iframe.contentDocument;
        setTitle(w, cleanTitle(doc.title));
        doc.querySelectorAll('a[href]').forEach(function (a) {
          if (a.origin && a.origin !== location.origin && !a.target) {
            a.target = '_blank';
            a.rel = 'noopener';
          }
        });
      } catch (e) { /* cross-origin: keep the section title */ }
    });

    w.el.addEventListener('pointerdown', function () { focusWin(w); });

    w.el.querySelector('.titlebar-controls').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'min') minimize(w);
      else if (b.dataset.act === 'max') toggleMax(w);
      else closeWin(w);
    });

    var bar = w.el.querySelector('.window-titlebar');
    bar.addEventListener('dblclick', function (e) {
      if (!e.target.closest('.titlebar-btn')) toggleMax(w);
    });
    bar.addEventListener('pointerdown', function (e) { startDrag(w, e); });

    w.btn.addEventListener('click', function () {
      if (w.minimized) { restore(w); focusWin(w); }
      else if (w.el.classList.contains('is-active')) minimize(w);
      else focusWin(w);
    });
  }

  function focusWin(w) {
    Object.keys(wins).forEach(function (k) {
      var on = wins[k] === w;
      wins[k].el.classList.toggle('is-active', on);
      wins[k].btn.classList.toggle('is-active', on);
    });
    w.el.style.zIndex = ++zTop;
  }

  function restore(w) {
    w.minimized = false;
    w.el.hidden = false;
  }

  function minimize(w) {
    w.minimized = true;
    w.el.hidden = true;
    w.el.classList.remove('is-active');
    w.btn.classList.remove('is-active');
    focusTopmost();
  }

  function toggleMax(w) {
    w.el.classList.toggle('is-max');
    var max = w.el.classList.contains('is-max');
    var btn = w.el.querySelector('[data-act="max"]');
    btn.textContent = max ? '❐' : '□';
    btn.setAttribute('aria-label', max ? 'Restaurar' : 'Maximizar');
  }

  function closeWin(w) {
    w.el.remove();
    w.btn.remove();
    delete wins[w.key];
    focusTopmost();
  }

  function focusTopmost() {
    var best = null;
    Object.keys(wins).forEach(function (k) {
      var c = wins[k];
      if (!c.minimized && (!best || +c.el.style.zIndex > +best.el.style.zIndex)) best = c;
    });
    if (best) focusWin(best);
  }

  function startDrag(w, e) {
    if (e.target.closest('.titlebar-btn') || w.el.classList.contains('is-max') || mobile.matches) return;
    var bar = e.currentTarget;
    var startX = e.clientX, startY = e.clientY;
    var left = w.el.offsetLeft, top = w.el.offsetTop;
    var maxTop = window.innerHeight - 32 - 30;
    bar.setPointerCapture(e.pointerId);
    w.el.classList.add('is-dragging');

    function move(ev) {
      var nl = left + ev.clientX - startX;
      var nt = top + ev.clientY - startY;
      w.el.style.left = Math.max(-w.el.offsetWidth + 90, Math.min(nl, window.innerWidth - 90)) + 'px';
      w.el.style.top = Math.max(0, Math.min(nt, maxTop)) + 'px';
    }
    function up(ev) {
      bar.releasePointerCapture(ev.pointerId);
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
      w.el.classList.remove('is-dragging');
    }
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  }

  function open(key, path) {
    var w = wins[key];
    if (!w) w = create(key, path);
    else if (path && w.iframe.getAttribute('src') !== path) w.iframe.src = path;
    restore(w);
    focusWin(w);
  }

  document.querySelectorAll('.desktop-icon[data-section]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      open(a.dataset.section);
    });
  });

  // Deep link: /#posts  or  /#/posts/some-post/
  // Only same-origin paths of our own sections may be loaded into a window
  // (blocks hashes like "//evil.example" or "/\evil.example").
  function safePath(raw) {
    var u;
    try { u = new URL(raw, location.origin); } catch (e) { return null; }
    if (u.origin !== location.origin) return null;
    if (!/^\/(posts|albumes|selecciones|about|home|tags)\//.test(u.pathname)) return null;
    return u;
  }

  function openFromHash() {
    var hash = decodeURIComponent(location.hash.slice(1));
    if (!hash) return;
    if (hash.charAt(0) === '/') {
      var u = safePath(hash);
      if (u) open(sectionForPath(u.pathname), u.pathname + u.search);
    } else if (SECTIONS[hash]) open(hash);
    history.replaceState(null, '', location.pathname);
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
})();
