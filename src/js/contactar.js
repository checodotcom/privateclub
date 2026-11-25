(function () {
  'use strict';
  if (window.self === window.top) {
    window.location.replace('/#correo');
    return;
  }

  var form = document.forms.contactar;
  var send = form.querySelector('button[type="submit"]');
  var icon = send.querySelector('img');
  var hourglass = send.querySelector('.correo-hourglass');
  var label = send.querySelector('.correo-send-label');
  var status = form.querySelector('.correo-status');
  var dialog = document.querySelector('.correo-dialog');
  var editableFields = form.querySelectorAll('[required]');

  function setSending(sending) {
    send.disabled = sending;
    icon.hidden = sending;
    hourglass.hidden = !sending;
    label.textContent = sending ? 'Enviando…' : 'Enviar';
    editableFields.forEach(function (field) { field.readOnly = sending; });
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (send.disabled) return;

    var body = new URLSearchParams(new FormData(form));
    setSending(true);
    status.textContent = 'Enviando mensaje…';
    var minimumWait = new Promise(function (resolve) { setTimeout(resolve, 2000); });
    var accepted = fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }).then(function (response) { return response.ok; }, function () { return false; });

    await minimumWait;
    var success = await accepted;
    setSending(false);
    status.textContent = '';
    if (success) {
      form.reset();
      dialog.showModal();
    } else {
      status.textContent = 'No se pudo enviar el mensaje. Intenta de nuevo.';
      send.focus();
    }
  });

  dialog.addEventListener('close', function () { send.focus(); });
})();
