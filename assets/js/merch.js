/* ==========================================================================
   Merch page: the merch table.
   Hangs each shirt from DF.getMerch() on the wall with a cardboard price tag.
   Tapping a shirt opens a close-up where you pick a size and add it to the cart.
   ========================================================================== */
(function () {
  'use strict';
  var DF = window.DF;
  var esc = DF.esc;

  var HANGER = '<svg class="mt-hanger" viewBox="0 0 120 46" aria-hidden="true">' +
    '<path d="M60 4 q6 0 6 6 q0 5 -6 7 L6 40 q-4 2 0 4 h108 q4 -2 0 -4 L60 17" fill="none" stroke="#b9b9b9" stroke-width="3" stroke-linejoin="round"/></svg>';
  var TILTS = [-2.5, 1.8, -1.2, 2.6, -1.8, 1.2];

  var pop = document.querySelector('[data-merch-pop]');
  var current = null;      // the shirt open in the close-up
  var opener = null;       // the button that opened it, to return focus

  function items() { return DF.getMerch().filter(function (p) { return p.active !== false; }); }
  function sizeRange(sizes) {
    if (!sizes || !sizes.length) return '';
    return sizes.length > 1 ? sizes[0] + '–' + sizes[sizes.length - 1] : sizes[0];
  }

  function renderWall() {
    var wall = document.querySelector('[data-merch-wall]');
    if (!wall) return;
    var list = items();
    if (!list.length) {
      wall.innerHTML = '<p class="mt-empty">' + esc(DF.t('merch.empty')) + '</p>';
      return;
    }
    wall.innerHTML = list.map(function (p, i) {
      var tilt = TILTS[i % TILTS.length];
      var price = Math.round(p.price) === p.price ? '$' + p.price : DF.money(p.price);
      return '<button class="mt-shirt" type="button" data-id="' + esc(p.id) + '" style="--tilt:' + tilt + 'deg;--tag-tilt:' + (-tilt * 2) + 'deg"' +
        ' aria-label="' + esc(p.name + ', ' + DF.money(p.price)) + '">' +
        HANGER + '<div class="shirt">' + DF.productImage(p) + '</div>' +
        '<div class="mt-tag" aria-hidden="true"><b>' + esc(price) + '</b><span>' + esc(sizeRange(p.sizes)) + '</span></div>' +
        '<p class="mt-name">' + esc(p.name) + '</p></button>';
    }).join('');
    if (current && pop && !pop.hidden) fillPop();   // keep an open close-up in the current language
  }

  function fillPop() {
    var p = current;
    pop.querySelector('[data-pop-img]').innerHTML = DF.productImage(p);
    pop.querySelector('[data-pop-name]').textContent = p.name;
    pop.querySelector('[data-pop-price]').textContent = DF.money(p.price);
    pop.querySelector('[data-pop-desc]').textContent = DF.lang === 'es' && p.desc_es ? p.desc_es : p.desc;
    var picked = pop.querySelector('[data-pop-sizes] [aria-pressed="true"]');
    var keep = picked && picked.getAttribute('data-size');
    pop.querySelector('[data-pop-sizes]').innerHTML = (p.sizes || []).map(function (s) {
      return '<button type="button" data-size="' + esc(s) + '" aria-pressed="' + (s === keep) + '">' + esc(s) + '</button>';
    }).join('');
    pop.querySelector('[data-pop-sizes]').setAttribute('aria-label', DF.t('merch.sizes'));
  }

  function openPop(id, from) {
    current = items().filter(function (p) { return p.id === id; })[0];
    if (!current || !pop) return;
    opener = from;
    pop.querySelector('[data-pop-sizes]').innerHTML = '';
    pop.querySelector('[data-pop-msg]').textContent = '';
    fillPop();
    pop.hidden = false;
    document.body.classList.add('locked');
    var first = pop.querySelector('[data-pop-sizes] button') || pop.querySelector('[data-pop-add]');
    if (first) first.focus();
  }

  function closePop() {
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    current = null;
    document.body.classList.remove('locked');
    if (opener && opener.isConnected) opener.focus();
  }

  document.addEventListener('click', function (e) {
    var shirt = e.target.closest('.mt-shirt');
    if (shirt) { openPop(shirt.getAttribute('data-id'), shirt); return; }
    if (!pop || pop.hidden) return;

    if (e.target === pop || e.target.closest('[data-merch-close]')) { closePop(); return; }

    var size = e.target.closest('[data-pop-sizes] button');
    if (size) {
      pop.querySelectorAll('[data-pop-sizes] button').forEach(function (b) {
        b.setAttribute('aria-pressed', b === size ? 'true' : 'false');
      });
      pop.querySelector('[data-pop-msg]').textContent = '';
      return;
    }

    if (e.target.closest('[data-pop-add]')) {
      var picked = pop.querySelector('[data-pop-sizes] [aria-pressed="true"]');
      if (!picked) { pop.querySelector('[data-pop-msg]').textContent = DF.t('merch.pickSize'); return; }
      DF.cart.add(current.id, picked.getAttribute('data-size'));
      closePop();
      DF.toast(DF.t('merch.added'));
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePop();
  });

  DF.onRender(renderWall);
})();
