/* ===========================
   PRIVATE CLUB — Desktop window manager
   Each section opens in a draggable window (an iframe of the real page),
   with a button in the taskbar to minimize / restore it.
   =========================== */
(function () {
  'use strict';

  var SECTIONS = {
    home:        { title: 'Inicio',          url: '/home/' },
    posts:       { title: 'Todos los posts', url: '/posts/' },
    albumes:     { title: 'Álbumes',         url: '/albumes/' },
    selecciones: { title: 'Selecciones',     url: '/selecciones/' },
    about:       { title: 'Acerca de',       url: '/about/' },
    correo:      { title: 'Contactar',       url: '/contactar/' },
    mensajes:    { title: 'Mensajes',        url: '/mensajes/' }
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
    if (path === '/contactar/') return 'correo';
    if (path.indexOf('/albumes') === 0) return 'albumes';
    if (path.indexOf('/selecciones') === 0) return 'selecciones';
    if (path.indexOf('/about') === 0) return 'about';
    if (path.indexOf('/mensajes') === 0) return 'mensajes';
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
    // Sections share the main window. Contactar keeps its own draft while browsing.
    var w = { key: key === 'correo' ? 'correo' : 'main', minimized: false, stack: [], goingBack: false };

    w.el = el('section', 'window app-window', { role: 'dialog', 'aria-label': sec.title });
    var bar = el('div', 'window-titlebar');
    var title = el('span', 'app-title');
    w.backBtn = el('button', 'titlebar-btn titlebar-back', { type: 'button', 'data-act': 'back', 'aria-label': 'Atrás', disabled: '' });
    w.backBtn.textContent = '◄';
    title.appendChild(w.backBtn);
    w.titleIcon = iconImg(key, 16);
    w.titleIcon.hidden = key === 'home';
    title.appendChild(w.titleIcon);
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
    if (key === 'correo') {
      width = Math.min(620, vw - 32);
      height = Math.min(456, vh - 16);
      w.backBtn.hidden = true;
    }
    var step = (opened++ % 8) * 28;
    w.el.style.width = width + 'px';
    w.el.style.height = height + 'px';
    w.baseHeight = height;
    w.el.style.left = Math.min(130 + step, Math.max(vw - width - 10, 0)) + 'px';
    w.el.style.top = Math.min(18 + step, Math.max(vh - height - 6, 0)) + 'px';

    // Taskbar button
    w.btn = el('button', 'taskbar-item', { type: 'button' });
    w.btnIcon = iconImg(key, 16);
    w.btn.appendChild(w.btnIcon);
    w.btnText = el('span');
    w.btnText.textContent = sec.title;
    w.btn.appendChild(w.btnText);
    taskbar.appendChild(w.btn);

    shellRoot.appendChild(w.el);
    wins[w.key] = w;
    bind(w);
    return w;
  }

  function setSection(w, key) {
    if (w.section === key) return;
    w.section = key;
    w.titleIcon.hidden = key === 'home';
    w.titleIcon.src = w.btnIcon.src = '/img/icons/' + key + '.svg';
  }

  function navigate(w, path) {
    if (w.iframe.getAttribute('src') === path && w.stack[w.stack.length - 1] === path) return;
    w.iframe.src = path;
  }

  function goBack(w) {
    if (w.stack.length < 2) return;
    w.stack.pop();
    w.goingBack = true;
    w.iframe.src = w.stack[w.stack.length - 1];
  }

  function syncBack(w) {
    if (w.stack.length > 1) w.backBtn.removeAttribute('disabled');
    else w.backBtn.setAttribute('disabled', '');
  }

  // Short sections (Mensajes) get a window only as tall as their content
  var FIT = { mensajes: true };
  function fitHeight(w, doc) {
    var fit = !!FIT[w.section];
    w.el.classList.toggle('is-fit', fit);
    var h = w.baseHeight;
    if (fit) {
      var content = doc.querySelector('.desktop') || doc.body;
      var chrome = w.el.offsetHeight - w.iframe.offsetHeight;
      h = Math.min(content.offsetHeight + chrome + 4, w.baseHeight);
    }
    w.fitH = h;
    w.el.style.setProperty('--fit-h', h + 'px');
    if (!mobile.matches) w.el.style.height = h + 'px';
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
        var here = w.iframe.contentWindow.location.pathname;
        if (w.goingBack) w.goingBack = false;
        else if (w.stack[w.stack.length - 1] !== here) w.stack.push(here);
        setSection(w, sectionForPath(here));
        var correo = doc.querySelector('[data-open-correo]');
        if (correo) correo.addEventListener('click', function (event) {
          event.preventDefault();
          open('correo');
        });
        syncBack(w);
        fitHeight(w, doc);
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

    w.backBtn.addEventListener('click', function () { goBack(w); });

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

  /* Windows 95 style zoom: a dotted outline steps from one rectangle to another */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var STEPS = 9, STEP_MS = 18;

  function zoomOutline(from, to, done) {
    if (reduceMotion.matches || !from || !to) { done(); return; }
    var box = el('div', 'zoom-outline');
    document.body.appendChild(box);
    var i = 0;
    (function frame() {
      i++;
      var t = i / STEPS;
      box.style.left = (from.left + (to.left - from.left) * t) + 'px';
      box.style.top = (from.top + (to.top - from.top) * t) + 'px';
      box.style.width = (from.width + (to.width - from.width) * t) + 'px';
      box.style.height = (from.height + (to.height - from.height) * t) + 'px';
      if (i < STEPS) setTimeout(frame, STEP_MS);
      else { box.remove(); done(); }
    })();
  }

  function restore(w) {
    if (!w.minimized) return;
    w.minimized = false;
    w.el.hidden = false;
    var to = w.el.getBoundingClientRect();
    w.el.style.visibility = 'hidden';
    zoomOutline(w.btn.getBoundingClientRect(), to, function () {
      w.el.style.visibility = '';
    });
  }

  function minimize(w) {
    var from = w.el.getBoundingClientRect();
    w.minimized = true;
    w.el.hidden = true;
    w.el.classList.remove('is-active');
    w.btn.classList.remove('is-active');
    focusTopmost();
    zoomOutline(from, w.btn.getBoundingClientRect(), function () {});
  }

  function toggleMax(w) {
    if (w.zooming) return;
    var from = w.el.getBoundingClientRect();
    w.el.classList.toggle('is-max');
    var max = w.el.classList.contains('is-max');
    var btn = w.el.querySelector('[data-act="max"]');
    btn.textContent = max ? '❐' : '□';
    btn.setAttribute('aria-label', max ? 'Restaurar' : 'Maximizar');
    if (mobile.matches) return;
    var to = w.el.getBoundingClientRect();
    w.zooming = true;
    w.el.style.visibility = 'hidden';
    zoomOutline(from, to, function () {
      w.el.style.visibility = '';
      w.zooming = false;
    });
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
    var w = key === 'correo' ? wins.correo : wins.main;
    if (!w) w = create(key, path);
    else if (key !== 'correo') navigate(w, path || SECTIONS[key].url);
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
    if (!/^\/(posts|albumes|selecciones|about|mensajes|home|tags)\//.test(u.pathname)) return null;
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
