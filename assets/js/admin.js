/* ==========================================================================
   Demo admin: store hours, holiday notice, and merch.
   Saves to this browser only (localStorage). The live build would save
   to a real backend; the screens and steps stay the same.
   ========================================================================== */
(function () {
  'use strict';
  var DF = window.DF;
  var esc = DF.esc;
  DF.lang = 'en'; // admin is English-only

  var SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
  var DEFAULT_SIZES = ['S', 'M', 'L', 'XL', '2XL'];
  var editingId = null;
  var pendingImage = '';

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };

  function flash(el, text, isError) {
    el.textContent = text;
    el.style.color = isError ? 'var(--pink)' : '';
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.textContent = ''; }, 5000);
  }

  // Two-step confirm without browser popups (those can be blocked in embedded previews).
  // First click relabels the button; a second click within 4 seconds goes ahead.
  function confirmed(btn, label) {
    if (btn.getAttribute('data-armed')) return true;
    var original = btn.textContent;
    btn.setAttribute('data-armed', '1');
    btn.textContent = label;
    setTimeout(function () {
      if (btn.isConnected) { btn.removeAttribute('data-armed'); btn.textContent = original; }
    }, 4000);
    return false;
  }

  /* ---------- Tabs ---------- */
  function showTab(name) {
    $$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === name ? 'true' : 'false'); });
    $$('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== name; });
  }
  $$('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
  });

  /* ---------- Hours ---------- */
  function renderHoursEditor() {
    var hours = DF.getHours();
    $('[data-hours-edit]').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
      var h = hours.filter(function (x) { return x.day === d; })[0] || { day: d, open: '09:00', close: '21:00', closed: false };
      return '<div class="hours-row' + (h.closed ? ' is-closed' : '') + '" data-day="' + d + '">' +
        '<strong>' + esc(DF.dayName(d)) + '</strong>' +
        '<label class="check"><input type="checkbox" data-open' + (h.closed ? '' : ' checked') + '> Open</label>' +
        '<label>Opens<input type="time" data-from value="' + esc(h.open) + '"></label>' +
        '<label>Closes<input type="time" data-to value="' + esc(h.close) + '"></label>' +
      '</div>';
    }).join('');
    $('[data-holiday-input]').value = DF.getHoliday() || '';
  }

  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-open]')) {
      e.target.closest('.hours-row').classList.toggle('is-closed', !e.target.checked);
    }
  });

  $('[data-save-hours]').addEventListener('click', function () {
    var out = [];
    var missing = false;
    $$('.hours-row').forEach(function (row) {
      var open = row.querySelector('[data-open]').checked;
      var from = row.querySelector('[data-from]').value;
      var to = row.querySelector('[data-to]').value;
      if (open && (!from || !to)) missing = true;
      out.push({ day: Number(row.getAttribute('data-day')), open: from || '09:00', close: to || '21:00', closed: !open });
    });
    var msg = $('[data-hours-saved]');
    if (missing) { flash(msg, 'Each open day needs an opening and a closing time.', true); return; }
    out.sort(function (a, b) { return a.day - b.day; });
    var ok = DF.store.set('df_hours', out) && DF.store.set('df_holiday', $('[data-holiday-input]').value.trim());
    flash(msg, ok ? 'Saved. The website now shows the new hours.' : 'Could not save in this browser.', !ok);
  });

  /* ---------- Merch list ---------- */
  function getItems() { return JSON.parse(JSON.stringify(DF.getMerch())); }
  function saveItems(items) {
    if (DF.store.set('df_merch', items)) return true;
    flash($('[data-list-msg]'), 'Could not save. If you added a photo, try a smaller one.', true);
    return false;
  }

  function renderList() {
    var items = getItems();
    var list = $('[data-merch-list]');
    if (!items.length) {
      list.innerHTML = '<p class="help-text">No items yet. Click "Add new item" to add your first shirt.</p>';
      return;
    }
    list.innerHTML = items.map(function (p) {
      var hidden = p.active === false;
      return '<div class="admin-item' + (hidden ? ' hidden-item' : '') + '" data-id="' + esc(p.id) + '">' +
        '<div class="line-thumb">' + DF.productImage(p) + '</div>' +
        '<div><div class="name">' + esc(p.name) + '</div>' +
          '<div class="meta">' + esc(p.partNo) + ' &middot; ' + esc(DF.money(p.price)) + ' &middot; ' + esc((p.sizes || []).join(', ')) +
          (hidden ? ' &middot; hidden' : '') + '</div></div>' +
        '<label class="check"><input type="checkbox" data-toggle-active' + (hidden ? '' : ' checked') + '> Show on site</label>' +
        '<div class="actions">' +
          '<button type="button" class="btn btn-outline btn-sm" data-edit>Edit</button>' +
          '<button type="button" class="btn btn-danger btn-sm" data-delete>Remove</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  $('[data-merch-list]').addEventListener('click', function (e) {
    var row = e.target.closest('.admin-item');
    if (!row) return;
    var id = row.getAttribute('data-id');
    if (e.target.closest('[data-edit]')) { openForm(id); return; }
    var delBtn = e.target.closest('[data-delete]');
    if (delBtn) {
      var items = getItems();
      var p = items.filter(function (x) { return x.id === id; })[0];
      if (!p || !confirmed(delBtn, 'Click again to remove')) return;
      if (saveItems(items.filter(function (x) { return x.id !== id; }))) {
        if (editingId === id) closeForm();
        renderList();
        flash($('[data-list-msg]'), 'Removed "' + p.name + '".');
      }
    }
  });

  $('[data-merch-list]').addEventListener('change', function (e) {
    if (!e.target.matches('[data-toggle-active]')) return;
    var id = e.target.closest('.admin-item').getAttribute('data-id');
    var items = getItems();
    items.forEach(function (p) { if (p.id === id) p.active = e.target.checked; });
    if (saveItems(items)) {
      renderList();
      flash($('[data-list-msg]'), e.target.checked ? 'Showing on the site.' : 'Hidden from the site.');
    }
  });

  /* ---------- Add / edit form ---------- */
  var form = $('[data-item-form]');
  var formPanel = $('[data-item-form-panel]');
  var f = form.elements;

  $('[data-size-checks]').innerHTML = SIZES.map(function (s) {
    return '<label class="check"><input type="checkbox" name="sizes" value="' + s + '"> ' + s + '</label>';
  }).join('');

  function nextPartNo(items) {
    var max = 0;
    items.forEach(function (p) {
      var m = /(\d+)\s*$/.exec(p.partNo || '');
      if (m) max = Math.max(max, Number(m[1]));
    });
    var n = String(max + 1);
    while (n.length < 3) n = '0' + n;
    return 'DF-T' + n;
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
  }

  function readForm() {
    return {
      name: f['name'].value.trim(),
      price: Math.round(parseFloat(f['price'].value) * 100) / 100,
      partNo: f['partNo'].value.trim(),
      sizes: $$('input[name="sizes"]:checked', form).map(function (i) { return i.value; }),
      desc: f['desc'].value.trim(),
      desc_es: f['desc_es'].value.trim(),
      color: f['color'].value,
      design: f['design'].value,
      print: f['print'].value.trim(),
      image: pendingImage
    };
  }

  function updatePreview() {
    var d = readForm();
    d.name = d.name || 'Preview';
    $('[data-preview]').innerHTML = DF.productImage(d);
    $('[data-remove-photo]').hidden = !pendingImage;
  }

  function openForm(id) {
    var items = getItems();
    var p = id ? items.filter(function (x) { return x.id === id; })[0] : null;
    editingId = p ? p.id : null;
    pendingImage = p ? (p.image || '') : '';
    form.reset();
    $('[data-form-title]').textContent = p ? 'Edit item' : 'Add new item';
    f['name'].value = p ? p.name : '';
    f['price'].value = p ? p.price : '';
    f['partNo'].value = p ? p.partNo : nextPartNo(items);
    f['desc'].value = p ? (p.desc || '') : '';
    f['desc_es'].value = p ? (p.desc_es || '') : '';
    f['color'].value = p && /^#[0-9a-f]{6}$/i.test(p.color || '') ? p.color : '#161616';
    f['design'].value = p ? (p.design || 'plain') : 'stripes';
    f['print'].value = p ? (p.print || '') : '';
    var sizes = p ? (p.sizes || []) : DEFAULT_SIZES;
    $$('input[name="sizes"]', form).forEach(function (i) { i.checked = sizes.indexOf(i.value) !== -1; });
    $('[data-form-msg]').textContent = '';
    formPanel.hidden = false;
    updatePreview();
    formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    f['name'].focus({ preventScroll: true });
  }

  function closeForm() {
    formPanel.hidden = true;
    editingId = null;
    pendingImage = '';
  }

  function resizeImage(file, max, done) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = function () { done(null); };
      img.src = reader.result;
    };
    reader.onerror = function () { done(null); };
    reader.readAsDataURL(file);
  }

  form.addEventListener('input', function (e) {
    if (e.target.name !== 'photo') updatePreview();
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'sizes' || e.target.name === 'design' || e.target.name === 'color') updatePreview();
    if (e.target.name !== 'photo' || !e.target.files[0]) return;
    resizeImage(e.target.files[0], 700, function (dataUrl) {
      if (!dataUrl) { flash($('[data-form-msg]'), 'That file could not be read as a photo.', true); return; }
      pendingImage = dataUrl;
      updatePreview();
    });
  });

  $('[data-remove-photo]').addEventListener('click', function () {
    pendingImage = '';
    f['photo'].value = '';
    updatePreview();
  });

  $('[data-add-item]').addEventListener('click', function () { openForm(null); });
  $('[data-cancel]').addEventListener('click', closeForm);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = readForm();
    var msg = $('[data-form-msg]');
    if (!d.name) { flash(msg, 'Please type an item name.', true); f['name'].focus(); return; }
    if (!(d.price >= 0)) { flash(msg, 'Please type a price, like 30 or 29.99.', true); f['price'].focus(); return; }
    if (!d.sizes.length) { flash(msg, 'Please tick at least one size.', true); return; }

    var items = getItems();
    if (!d.partNo) d.partNo = nextPartNo(items);

    if (editingId) {
      items = items.map(function (p) {
        if (p.id !== editingId) return p;
        d.id = p.id;
        d.active = p.active !== false;
        return d;
      });
    } else {
      d.id = slug(d.name) + '-' + Date.now().toString(36);
      d.active = true;
      items.push(d);
    }

    if (saveItems(items)) {
      var name = d.name;
      closeForm();
      renderList();
      flash($('[data-list-msg]'), 'Saved "' + name + '". It is live on the Merch page.');
    }
  });

  /* ---------- Reset ---------- */
  $('[data-reset]').addEventListener('click', function () {
    if (!confirmed(this, 'Click again to reset')) return;
    ['df_merch', 'df_hours', 'df_holiday'].forEach(DF.store.remove);
    closeForm();
    renderHoursEditor();
    renderList();
    showTab('hours');
    flash($('[data-hours-saved]'), 'Demo data reset.');
  });

  renderHoursEditor();
  renderList();
})();
