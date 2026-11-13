/* ==========================================================================
   Merch page: renders the parts catalog from DF.getMerch().
   ========================================================================== */
(function () {
  'use strict';
  var DF = window.DF;
  var esc = DF.esc;

  function renderCatalog() {
    var grid = document.querySelector('[data-merch-grid]');
    if (!grid) return;
    var items = DF.getMerch().filter(function (p) { return p.active !== false; });

    if (!items.length) {
      grid.innerHTML = '<p class="spec">' + esc(DF.t('merch.empty')) + '</p>';
      return;
    }

    grid.innerHTML = items.map(function (p, i) {
      var desc = DF.lang === 'es' && p.desc_es ? p.desc_es : p.desc;
      var sizes = (p.sizes || []).map(function (s) {
        return '<button type="button" class="size" aria-pressed="false" data-size="' + esc(s) + '">' + esc(s) + '</button>';
      }).join('');
      return '<article class="part" data-id="' + esc(p.id) + '">' +
        '<div class="part-top"><span>' + esc(DF.t('merch.partNo')) + ' ' + esc(p.partNo) + '</span>' +
          '<span>' + esc(DF.t('merch.fig')) + ' ' + (i + 1) + '</span></div>' +
        '<div class="part-img">' + DF.productImage(p) + '</div>' +
        '<div class="part-body">' +
          '<h2 class="part-name">' + esc(p.name) + '</h2>' +
          '<p class="part-desc">' + esc(desc) + '</p>' +
          '<div class="spec">' + esc(DF.t('merch.sizes')) + '</div>' +
          '<div class="sizes" role="group" aria-label="' + esc(DF.t('merch.sizes')) + '">' + sizes + '</div>' +
          '<p class="part-msg" data-msg role="status"></p>' +
          '<div class="part-foot">' +
            '<span class="price">' + esc(DF.money(p.price)) + '</span>' +
            '<button type="button" class="btn btn-ink btn-sm" data-add>' + esc(DF.t('merch.add')) + '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  document.addEventListener('click', function (e) {
    var card = e.target.closest('.part');
    if (!card) return;

    var sizeBtn = e.target.closest('.size');
    if (sizeBtn) {
      card.querySelectorAll('.size').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      sizeBtn.setAttribute('aria-pressed', 'true');
      card.querySelector('[data-msg]').textContent = '';
      return;
    }

    if (e.target.closest('[data-add]')) {
      var picked = card.querySelector('.size[aria-pressed="true"]');
      var msg = card.querySelector('[data-msg]');
      if (!picked) {
        msg.textContent = DF.t('merch.pickSize');
        return;
      }
      DF.cart.add(card.getAttribute('data-id'), picked.getAttribute('data-size'));
      msg.textContent = '';
      DF.toast(DF.t('merch.added'));
    }
  });

  DF.onRender(renderCatalog);
})();
