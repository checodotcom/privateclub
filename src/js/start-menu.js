/* Start button: Win95-style menu that slides up with the suggestion form */
(function () {
  'use strict';
  var btn = document.getElementById('start-btn');
  var menu = document.getElementById('start-menu');
  if (!btn || !menu) return;
  var form = menu.querySelector('form');
  var status = form.querySelector('.form-status');
  var hint = form.querySelector('.form-hint');
  var submitBtn = form.querySelector('[type="submit"]');
  var dialog = document.getElementById('sent-dialog');

  function showDialog() {
    dialog.hidden = false;
    dialog.querySelector('.btn[data-close]').focus();
  }
  function closeDialog() {
    dialog.hidden = true;
    btn.focus();
  }
  dialog.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeDialog();
  });
  var URLISH = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|me|ly|be|fm|co|app|link)\b|\/\/)/i;

  function setOpen(open) {
    menu.hidden = !open;
    btn.classList.toggle('is-pressed', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) form.querySelector('input[name="nombre"]').focus();
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(menu.hidden);
  });
  document.addEventListener('click', function (e) {
    if (!menu.hidden && !menu.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!dialog.hidden) closeDialog();
    else if (!menu.hidden) { setOpen(false); btn.focus(); }
  });

  function check() {
    var s = form.elements.sugerencia;
    var hasUrl = URLISH.test(s.value);
    s.setCustomValidity(hasUrl ? 'Solo nombres, sin links.' : '');
    hint.classList.toggle('is-error', hasUrl);
    status.textContent = '';
    var bad = Array.prototype.find.call(form.elements, function (f) {
      return f.willValidate && !f.checkValidity();
    });
    if (bad) {
      // A link in the suggestion is flagged on the hint itself, not repeated here
      if (!(bad.name === 'sugerencia' && hasUrl)) {
        status.textContent = bad.name === 'acepto' ? 'Marca la casilla para enviar.' : 'Revisa el campo ' + bad.name + '.';
      }
      bad.focus();
      return false;
    }
    return true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!check()) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    form.classList.add('is-loading');
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      form.reset();
      setOpen(false);
      showDialog();
    }).catch(function () {
      status.textContent = 'No se pudo enviar. Intenta más tarde.';
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar';
      form.classList.remove('is-loading');
    });
  });
})();
