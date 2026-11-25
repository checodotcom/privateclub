/* Genre filters: pressed buttons narrow the list to items that have ALL selected tags. */
(function () {
  'use strict';
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.tag-filter'));
  var items = Array.prototype.slice.call(document.querySelectorAll('main [data-tags]'));
  if (!buttons.length || !items.length) return;

  var list = items[0].parentNode;
  var empty = document.createElement('div');
  empty.className = 'inset filter-empty';
  empty.hidden = true;
  empty.textContent = 'Nada con todos esos géneros a la vez.';
  list.parentNode.insertBefore(empty, list.nextSibling);

  function apply() {
    var active = buttons
      .filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })
      .map(function (b) { return b.dataset.tag; });
    var shown = 0;
    items.forEach(function (li) {
      var tags = (li.dataset.tags || '').split(/\s+/);
      var ok = active.every(function (t) { return tags.indexOf(t) !== -1; });
      li.hidden = !ok;
      if (ok) shown++;
    });
    empty.hidden = shown !== 0;
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      apply();
    });
  });
})();
