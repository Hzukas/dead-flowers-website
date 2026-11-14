/* ==========================================================================
   Dead Flowers — shared site behavior
   Header/footer, age gate, EN/ES toggle, store hours, events, cart, popups.
   Pages load: site-data.js, merch-data.js, i18n.js, then this file.
   ========================================================================== */
(function () {
  'use strict';

  var DF = (window.DF = window.DF || {});
  var SITE = window.DF_SITE;

  /* ---------- Small helpers ---------- */
  DF.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var esc = DF.esc;
  var cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- Storage (browser only; safe if blocked) ---------- */
  DF.store = {
    get: function (key, fallback) {
      try {
        var v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove: function (key) {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }
  };

  /* ---------- Language ---------- */
  DF.lang = DF.store.get('df_lang', 'en');
  if (!window.DF_I18N[DF.lang]) DF.lang = 'en';

  DF.t = function (key) {
    var d = window.DF_I18N;
    return (d[DF.lang] && d[DF.lang][key]) || d.en[key] || key;
  };
  DF.pick = function (obj) {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    return obj[DF.lang] || obj.en || '';
  };
  DF.locale = function () { return DF.lang === 'es' ? 'es-US' : 'en-US'; };

  DF.applyI18n = function (root) {
    root = root || document;
    $$('[data-i18n]', root).forEach(function (el) { el.textContent = DF.t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-placeholder]', root).forEach(function (el) { el.placeholder = DF.t(el.getAttribute('data-i18n-placeholder')); });
    $$('[data-i18n-aria]', root).forEach(function (el) { el.setAttribute('aria-label', DF.t(el.getAttribute('data-i18n-aria'))); });
    $$('[data-i18n-alt]', root).forEach(function (el) { el.alt = DF.t(el.getAttribute('data-i18n-alt')); });
    document.documentElement.lang = DF.lang;
    var titleKey = document.body.getAttribute('data-title-key');
    if (titleKey) document.title = DF.t(titleKey);
  };

  DF.setLang = function (lang) {
    DF.lang = lang;
    DF.store.set('df_lang', lang);
    DF.render();
  };

  /* ---------- Money, dates, hours ---------- */
  DF.money = function (n) {
    return Number(n || 0).toLocaleString(DF.locale(), { style: 'currency', currency: 'USD' });
  };
  DF.dayName = function (day) {
    // Jan 7, 2024 was a Sunday, so day 0 = Sunday.
    return cap(new Date(2024, 0, 7 + day).toLocaleDateString(DF.locale(), { weekday: 'long' }));
  };
  DF.fmtTime = function (hhmm) {
    var parts = String(hhmm || '00:00').split(':');
    var d = new Date(2024, 0, 1, Number(parts[0]), Number(parts[1] || 0));
    return d.toLocaleTimeString(DF.locale(), { hour: 'numeric', minute: '2-digit' });
  };
  DF.getHours = function () { return DF.store.get('df_hours', null) || SITE.hours; };
  DF.getHoliday = function () {
    var v = DF.store.get('df_holiday', null);
    return v === null ? SITE.holidayNotice : v;
  };
  DF.hoursText = function (h) {
    if (!h || h.closed) return DF.t('contact.closed');
    return DF.fmtTime(h.open) + ' – ' + DF.fmtTime(h.close);
  };
  DF.addressText = function () {
    var a = SITE.address;
    return a.street + ', ' + a.city + ', ' + a.state + ' ' + a.zip;
  };

  /* ---------- Merch + placeholder shirt drawings ---------- */
  DF.getMerch = function () { return DF.store.get('df_merch', null) || window.DF_MERCH_DEFAULT; };

  function isLight(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return false;
    var n = parseInt(m[1], 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
  }

  DF.shirtSVG = function (p) {
    var color = /^#[0-9a-f]{6}$/i.test(p.color || '') ? p.color : '#222222';
    var ink = '#1d1611';
    var printColor = isLight(color) ? ink : '#f3e6c8';
    var body = 'M68 22 L46 30 L14 56 L32 88 L52 76 L52 184 L148 184 L148 76 L168 88 L186 56 L154 30 L132 22 C122 36 78 36 68 22 Z';
    var art = '';
    switch (p.design) {
      case 'stripes':
        art = '<rect x="52" y="96" width="96" height="6" fill="#ffc31f"/>' +
              '<rect x="52" y="105" width="96" height="6" fill="#ff6b1a"/>' +
              '<rect x="52" y="114" width="96" height="6" fill="#ec3a8c"/>';
        break;
      case 'text':
        var words = String(p.print || p.name || '').toUpperCase();
        var size = Math.max(6, Math.min(11, 150 / Math.max(words.length, 1)));
        art = '<text x="100" y="104" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="' + size.toFixed(1) +
              '" letter-spacing="1" fill="' + printColor + '">' + esc(words) + '</text>' +
              '<rect x="74" y="111" width="52" height="3" fill="#b8301c"/>';
        break;
      case 'logo':
        art = '<circle cx="100" cy="110" r="27" fill="#0d0a09" stroke="#ff6b1a" stroke-width="3"/>' +
              '<image href="assets/img/logo-mark.png" x="80" y="90" width="40" height="40"/>';
        break;
      case 'flames':
        art = '<path d="M52 184 L52 160 Q60 150 64 136 Q70 154 78 150 Q82 132 92 124 Q94 146 104 146 Q110 130 120 128 Q118 148 128 150 Q136 138 148 140 L148 184 Z" fill="#ff6b1a"/>' +
              '<path d="M52 184 L52 170 Q62 164 66 154 Q72 168 80 166 Q86 152 94 146 Q96 162 106 162 Q112 150 120 148 Q120 164 130 164 Q138 156 148 158 L148 184 Z" fill="#ffc31f"/>';
        break;
      default:
        art = '';
    }
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(p.name) + '">' +
      '<path d="' + body + '" fill="' + color + '"/>' + art +
      '<path d="' + body + '" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M68 22 C78 36 122 36 132 22" fill="none" stroke="' + ink + '" stroke-width="3"/>' +
      '</svg>';
  };

  DF.productImage = function (p) {
    return p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '">' : DF.shirtSVG(p);
  };

  /* ---------- Shared layout ---------- */
  function brandHTML() {
    return '<a class="brand" href="index.html" aria-label="Dead Flowers Dispensary">' +
      '<span class="badge"><img src="assets/img/logo-mark.png" alt=""></span>' +
      '<span class="wordmark">Dead Flowers<small data-i18n="brand.tagline"></small></span></a>';
  }

  function headerHTML() {
    return '' +
      '<a class="skip-link" href="#main" data-i18n="a11y.skip"></a>' +
      '<div class="holiday-banner" data-holiday hidden></div>' +
      '<header class="site-header">' +
        '<div class="wrap header-inner">' +
          // Pages with data-no-header-logo on <body> (the home page, which has the big logo) skip it.
          (document.body.hasAttribute('data-no-header-logo') ? '' :
          '<a class="header-logo" href="index.html" aria-label="Dead Flowers Dispensary">' +
            '<picture><source srcset="assets/img/logo-full.webp" type="image/webp">' +
            '<img src="assets/img/logo-full.png" alt="Dead Flowers Dispensary" width="720" height="851"></picture></a>') +
          '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">' +
            '<span></span><span></span><span></span><span class="sr" data-i18n="nav.menu"></span></button>' +
          '<nav class="site-nav" id="site-nav" aria-label="Main">' +
            '<div class="nav-links">' +
              '<a href="merch.html" data-i18n="nav.merch"></a>' +
              '<a href="events.html" data-i18n="nav.events"></a>' +
              '<a href="about.html" data-i18n="nav.about"></a>' +
              '<a href="faq.html" data-i18n="nav.faq"></a>' +
              '<a href="contact.html" data-i18n="nav.contact"></a>' +
            '</div>' +
            '<div class="nav-right">' +
              '<div class="nav-shop">' +
                '<a class="btn btn-primary btn-sm" href="#" data-jane="rec" data-i18n="nav.shopRec"></a>' +
                '<a class="btn btn-green btn-sm" href="#" data-jane="med" data-i18n="nav.shopMed"></a>' +
              '</div>' +
              '<div class="nav-tools">' +
                '<button class="icon-btn" type="button" data-lang-toggle></button>' +
                '<button class="icon-btn" type="button" data-cart-open><span data-i18n="nav.cart"></span>' +
                  '<span class="cart-count" data-cart-count>0</span></button>' +
              '</div>' +
            '</div>' +
          '</nav>' +
        '</div>' +
        '<div class="stripes"></div>' +
      '</header>';
  }

  function footerHTML() {
    return '' +
      '<footer class="site-footer">' +
        '<div class="wrap footer-grid">' +
          '<div class="footer-brand">' + brandHTML() + '<p data-i18n="footer.blurb"></p></div>' +
          '<div><h4 data-i18n="footer.visit"></h4><p data-address></p><p data-phone></p>' +
            '<a href="contact.html" data-i18n="footer.hours"></a></div>' +
          '<div><h4 data-i18n="footer.explore"></h4>' +
            '<a href="#" data-jane="rec" data-i18n="nav.shopRec"></a>' +
            '<a href="#" data-jane="med" data-i18n="nav.shopMed"></a>' +
            '<a href="merch.html" data-i18n="nav.merch"></a>' +
            '<a href="events.html" data-i18n="nav.events"></a>' +
            '<a href="about.html" data-i18n="nav.about"></a>' +
            '<a href="faq.html" data-i18n="nav.faq"></a></div>' +
          '<div><h4 data-i18n="footer.follow"></h4>' +
            '<a href="#" data-social="instagram">Instagram</a>' +
            '<a href="#" data-social="facebook">Facebook</a></div>' +
        '</div>' +
        '<div class="wrap footer-legal">' +
          '<p data-i18n="footer.compliance"></p>' +
          '<p>&copy; <span data-year></span> Dead Flowers Dispensary &middot; <span class="preview-tag" data-i18n="footer.preview"></span></p>' +
        '</div>' +
      '</footer>';
  }

  function drawerHTML() {
    return '' +
      '<div class="drawer-overlay" data-cart-close></div>' +
      '<aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" data-drawer>' +
        '<div class="drawer-head"><h2 id="cart-title" data-i18n="cart.title"></h2>' +
          '<button class="drawer-close" type="button" data-cart-close data-i18n-aria="modal.close">&times;</button></div>' +
        '<div class="drawer-body" data-cart-lines></div>' +
        '<div class="drawer-foot" data-cart-foot></div>' +
      '</aside>';
  }

  function ageGateHTML() {
    return '' +
      '<div class="age-gate" role="dialog" aria-modal="true" aria-labelledby="age-title" data-age-gate>' +
        '<div class="age-card">' +
          '<picture><source srcset="assets/img/logo-full.webp" type="image/webp">' +
            '<img class="age-logo" src="assets/img/logo-full.png" alt="Dead Flowers Dispensary" width="720" height="851"></picture>' +
          '<div data-age-ask>' +
            '<h1 id="age-title" data-i18n="age.title"></h1>' +
            '<p class="q" data-i18n="age.question"></p>' +
            '<div class="age-actions">' +
              '<button class="btn btn-primary" type="button" data-age-yes data-i18n="age.yes"></button>' +
              '<button class="btn btn-outline" type="button" data-age-no data-i18n="age.no"></button>' +
            '</div>' +
          '</div>' +
          '<div data-age-denied hidden><h1 data-i18n="age.deniedTitle"></h1><p class="q" data-i18n="age.denied"></p></div>' +
          '<p class="fine" data-i18n="age.note"></p>' +
          '<button class="icon-btn" type="button" data-lang-toggle style="margin-top:18px"></button>' +
        '</div>' +
      '</div>';
  }

  function markActiveNav() {
    var file = location.pathname.split('/').pop() || 'index.html';
    $$('.nav-links a').forEach(function (a) {
      if (a.getAttribute('href') === file) a.setAttribute('aria-current', 'page');
    });
  }

  /* ---------- Renderers (re-run on language or data change) ---------- */
  function renderLangToggle() {
    $$('[data-lang-toggle]').forEach(function (b) {
      b.textContent = DF.lang === 'en' ? 'Español' : 'English';
      b.setAttribute('lang', DF.lang === 'en' ? 'es' : 'en');
    });
  }

  function renderHoliday() {
    var note = DF.getHoliday();
    $$('[data-holiday]').forEach(function (el) {
      el.hidden = !note;
      el.innerHTML = note ? '<strong>' + esc(DF.t('holiday.label')) + '</strong>' + esc(note) : '';
    });
  }

  function renderContactInfo() {
    $$('[data-address]').forEach(function (el) { el.textContent = DF.addressText(); });
    $$('[data-phone]').forEach(function (el) {
      el.innerHTML = '<a href="tel:+1' + esc(SITE.phone.replace(/\D/g, '')) + '">' + esc(SITE.phone) + '</a>';
    });
    $$('[data-email]').forEach(function (el) {
      el.innerHTML = '<a href="mailto:' + esc(SITE.email) + '">' + esc(SITE.email) + '</a>';
    });
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
    $$('[data-directions]').forEach(function (el) {
      el.href = 'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent('Dead Flowers Dispensary, ' + DF.addressText());
    });
    $$('[data-social]').forEach(function (el) {
      var url = SITE.links[el.getAttribute('data-social')];
      if (url) { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
    });
  }

  function renderHours() {
    var hours = DF.getHours();
    var today = new Date().getDay();
    var find = function (d) { return hours.filter(function (h) { return h.day === d; })[0]; };
    var h = find(today);
    var closed = !h || h.closed;

    $$('[data-hours-today]').forEach(function (el) { el.textContent = DF.hoursText(h); });
    $$('[data-hours-status]').forEach(function (el) {
      el.textContent = DF.t(closed ? 'home.closedToday' : 'home.openToday');
      el.classList.toggle('status-open', !closed);
      el.classList.toggle('status-closed', closed);
    });
    $$('[data-hours-table]').forEach(function (tbody) {
      tbody.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
        var isToday = d === today;
        return '<tr' + (isToday ? ' class="today"' : '') + '><td>' + esc(DF.dayName(d)) +
          (isToday ? ' &middot; ' + esc(DF.t('contact.today')) : '') + '</td><td>' + esc(DF.hoursText(find(d))) + '</td></tr>';
      }).join('');
    });
  }

  DF.getDeals = function () { return DF.store.get('df_deals', null) || SITE.deals || { month: 1, items: [] }; };
  DF.monthName = function (month, style) {
    return cap(new Date(2024, (Number(month) || 1) - 1, 15).toLocaleDateString(DF.locale(), { month: style || 'long' }));
  };

  function renderDeals() {
    var section = document.querySelector('[data-deals]');
    if (!section) return;
    var deals = DF.getDeals();
    var items = (deals.items || []).filter(function (d) { return DF.pick(d.title); });
    section.hidden = !items.length;
    if (!items.length) return;
    var month = DF.monthName(deals.month);
    section.querySelector('[data-deals-title]').textContent = DF.t('deals.title').replace('{month}', month);
    section.querySelector('[data-deals-month-short]').textContent = DF.monthName(deals.month, 'short').replace('.', '');
    section.querySelector('[data-deals-list]').innerHTML = items.map(function (d) {
      var detail = DF.pick(d.detail);
      return '<li><strong>' + esc(DF.pick(d.title)) + '</strong>' + (detail ? '<span>' + esc(detail) + '</span>' : '') + '</li>';
    }).join('');
  }

  function renderEvents() {
    var el = document.querySelector('[data-events-list]');
    if (!el) return;
    var now = new Date();
    var todayStr = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    var list = SITE.events
      .filter(function (e) { return e.date >= todayStr; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });

    if (!list.length) {
      el.innerHTML = '<p class="empty">' + esc(DF.t('events.empty')) + '</p>';
      return;
    }
    var loc = DF.locale();
    el.innerHTML = list.map(function (e) {
      var dt = new Date(e.date + 'T12:00:00');
      return '<article class="event" style="--c:' + esc(e.color || 'var(--orange)') + '">' +
        '<div class="event-date"><div class="m">' + esc(dt.toLocaleDateString(loc, { month: 'short' })) + '</div>' +
          '<div class="d">' + dt.getDate() + '</div>' +
          '<div class="w">' + esc(dt.toLocaleDateString(loc, { weekday: 'short' })) + '</div></div>' +
        '<div><span class="tag">' + esc(DF.pick(e.tag)) + '</span>' +
          '<h3>' + esc(DF.pick(e.title)) + '</h3>' +
          '<div class="meta">' + esc(cap(dt.toLocaleDateString(loc, { weekday: 'long', month: 'long', day: 'numeric' }))) +
            ' &middot; ' + esc(DF.fmtTime(e.time)) + '</div>' +
          '<p>' + esc(DF.pick(e.text)) + '</p></div>' +
      '</article>';
    }).join('');
  }

  /* ---------- Cart ---------- */
  DF.cart = {
    items: function () { return DF.store.get('df_cart', []); },
    save: function (items) { DF.store.set('df_cart', items); renderCart(); },
    add: function (id, size) {
      var items = DF.cart.items();
      var hit = items.filter(function (i) { return i.id === id && i.size === size; })[0];
      if (hit) hit.qty += 1; else items.push({ id: id, size: size, qty: 1 });
      DF.cart.save(items);
    }
  };

  function cartLines() {
    var merch = DF.getMerch();
    return DF.cart.items().map(function (item, index) {
      var p = merch.filter(function (m) { return m.id === item.id && m.active !== false; })[0];
      return p ? { item: item, index: index, product: p } : null;
    }).filter(Boolean);
  }

  function renderCart() {
    var lines = cartLines();
    var count = lines.reduce(function (n, l) { return n + l.item.qty; }, 0);
    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = count;
      if (count) el.removeAttribute('data-zero'); else el.setAttribute('data-zero', '');
    });

    var body = document.querySelector('[data-cart-lines]');
    var foot = document.querySelector('[data-cart-foot]');
    if (!body || !foot) return;

    if (!lines.length) {
      body.innerHTML = '<p class="drawer-empty">' + esc(DF.t('cart.empty')) + '</p>';
      foot.innerHTML = '<a class="btn btn-ink" href="merch.html">' + esc(DF.t('cart.browse')) + '</a>';
      return;
    }

    var subtotal = 0;
    body.innerHTML = lines.map(function (l) {
      var p = l.product;
      subtotal += p.price * l.item.qty;
      return '<div class="line">' +
        '<div class="line-thumb">' + DF.productImage(p) + '</div>' +
        '<div><div class="line-name">' + esc(p.name) + '</div>' +
          '<div class="line-meta">' + esc(DF.t('cart.size')) + ': ' + esc(l.item.size) + ' &middot; ' + esc(DF.money(p.price)) + '</div></div>' +
        '<div class="line-right">' +
          '<div class="qty">' +
            '<button type="button" data-qty="-1" data-i="' + l.index + '" aria-label="' + esc(DF.t('cart.less')) + '">&minus;</button>' +
            '<span>' + l.item.qty + '</span>' +
            '<button type="button" data-qty="1" data-i="' + l.index + '" aria-label="' + esc(DF.t('cart.more')) + '">+</button>' +
          '</div>' +
          '<button type="button" class="link-btn" data-remove="' + l.index + '">' + esc(DF.t('cart.remove')) + '</button>' +
        '</div>' +
      '</div>';
    }).join('');

    foot.innerHTML = '' +
      '<div class="drawer-row"><span>' + esc(DF.t('cart.subtotal')) + '</span><span>' + esc(DF.money(subtotal)) + '</span></div>' +
      '<div class="drawer-row"><span>' + esc(DF.t('cart.shipping')) + '</span><span>' + esc(DF.t('cart.shippingCalc')) + '</span></div>' +
      '<label for="df-code">' + esc(DF.t('cart.code')) + '</label>' +
      '<div class="code-row"><input id="df-code" type="text" autocomplete="off" placeholder="DF-XXXX">' +
        '<button type="button" class="btn btn-ink btn-sm" data-code-apply>' + esc(DF.t('cart.apply')) + '</button></div>' +
      '<p class="code-msg" data-code-msg></p>' +
      '<div class="drawer-row total"><span>' + esc(DF.t('cart.total')) + '</span><span>' + esc(DF.money(subtotal)) + '</span></div>' +
      '<button type="button" class="btn btn-ink" data-checkout>' + esc(DF.t('cart.checkout')) + '</button>' +
      '<p class="fine">' + esc(DF.t('cart.final')) + '</p>';
  }

  function openCart() {
    var drawer = document.querySelector('[data-drawer]');
    if (!drawer) return;
    renderCart();
    drawer.classList.add('open');
    document.querySelector('.drawer-overlay').classList.add('open');
    document.body.classList.add('locked');
    var close = drawer.querySelector('.drawer-close');
    if (close) close.focus();
  }
  function closeCart() {
    var drawer = document.querySelector('[data-drawer]');
    if (!drawer || !drawer.classList.contains('open')) return;
    drawer.classList.remove('open');
    document.querySelector('.drawer-overlay').classList.remove('open');
    document.body.classList.remove('locked');
  }
  DF.openCart = openCart;

  /* ---------- Modal + toast ---------- */
  DF.modal = function (opts) {
    var wrap = document.createElement('div');
    wrap.className = 'modal-overlay';
    wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="df-modal-title">' +
      '<div class="stripes"></div>' +
      '<h2 id="df-modal-title">' + esc(opts.title) + '</h2>' +
      '<p>' + esc(opts.body) + '</p>' +
      (opts.note ? '<p class="note">' + esc(opts.note) + '</p>' : '') +
      '<div class="modal-actions"><button type="button" class="btn btn-primary btn-sm" data-modal-close>' + esc(DF.t('modal.close')) + '</button></div>' +
      '</div>';
    var previous = document.activeElement;
    function close() {
      wrap.remove();
      document.removeEventListener('keydown', onKey);
      if (previous && previous.focus) previous.focus();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.hasAttribute('data-modal-close')) close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    wrap.querySelector('[data-modal-close]').focus();
  };

  var toastTimer;
  DF.toast = function (msg) {
    var el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  };

  /* ---------- I Heart Jane links ---------- */
  function openJane(type) {
    var url = type === 'med' ? SITE.links.janeMed : SITE.links.janeRec;
    if (url) {
      window.open(url, '_blank', 'noopener');
      return;
    }
    DF.modal({
      title: DF.t(type === 'med' ? 'jane.titleMed' : 'jane.titleRec'),
      body: DF.t(type === 'med' ? 'jane.bodyMed' : 'jane.bodyRec'),
      note: DF.t('jane.note')
    });
  }

  /* ---------- Age gate (21+) ---------- */
  function ageGate() {
    if (document.body.hasAttribute('data-no-gate') || DF.store.get('df_age_ok', false)) return;
    document.body.insertAdjacentHTML('beforeend', ageGateHTML());
    var gate = document.querySelector('[data-age-gate]');
    DF.applyI18n(gate);
    renderLangToggle();
    document.body.classList.add('locked');
    gate.querySelector('[data-age-yes]').focus();

    gate.addEventListener('click', function (e) {
      if (e.target.closest('[data-age-yes]')) {
        DF.store.set('df_age_ok', true);
        gate.remove();
        document.body.classList.remove('locked');
        document.dispatchEvent(new CustomEvent('df:age-ok'));
      } else if (e.target.closest('[data-age-no]')) {
        gate.querySelector('[data-age-ask]').hidden = true;
        gate.querySelector('[data-age-denied]').hidden = false;
      }
    });
  }

  /* ---------- Events ---------- */
  function bindGlobal() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      var el;

      if ((el = t.closest('[data-jane]'))) { e.preventDefault(); openJane(el.getAttribute('data-jane')); return; }
      if (t.closest('[data-lang-toggle]')) { DF.setLang(DF.lang === 'en' ? 'es' : 'en'); return; }
      if (t.closest('[data-cart-open]')) { openCart(); return; }
      if (t.closest('[data-cart-close]')) { closeCart(); return; }

      if ((el = t.closest('[data-qty]'))) {
        var items = DF.cart.items();
        var i = Number(el.getAttribute('data-i'));
        if (items[i]) {
          items[i].qty += Number(el.getAttribute('data-qty'));
          if (items[i].qty < 1) items.splice(i, 1);
          DF.cart.save(items);
        }
        return;
      }
      if ((el = t.closest('[data-remove]'))) {
        var list = DF.cart.items();
        list.splice(Number(el.getAttribute('data-remove')), 1);
        DF.cart.save(list);
        return;
      }
      if (t.closest('[data-code-apply]')) {
        var msg = document.querySelector('[data-code-msg]');
        if (msg) msg.textContent = DF.t('cart.codeNote');
        return;
      }
      if (t.closest('[data-checkout]')) {
        DF.modal({ title: DF.t('cart.checkoutTitle'), body: DF.t('cart.checkoutBody'), note: DF.t('cart.final') });
        return;
      }
      if ((el = t.closest('[data-social]'))) {
        if (!SITE.links[el.getAttribute('data-social')]) { e.preventDefault(); DF.toast(DF.t('toast.linkSoon')); }
        return;
      }
      if ((el = t.closest('.nav-toggle'))) {
        var nav = document.getElementById('site-nav');
        var open = nav.classList.toggle('open');
        el.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCart();
    });

    document.addEventListener('submit', function (e) {
      var form = e.target.closest('[data-contact-form]');
      if (!form) return;
      e.preventDefault();
      var msg = form.querySelector('[data-form-msg]');
      if (msg) msg.textContent = DF.t('contact.thanks');
      form.reset();
    });
  }

  /* ---------- Render + boot ---------- */
  DF.renderHooks = [];
  DF.onRender = function (fn) { DF.renderHooks.push(fn); };

  DF.render = function () {
    DF.applyI18n();
    renderLangToggle();
    renderHoliday();
    renderContactInfo();
    renderHours();
    renderDeals();
    renderEvents();
    renderCart();
    DF.renderHooks.forEach(function (fn) { fn(); });
  };

  function init() {
    var header = document.getElementById('site-header');
    if (header) header.outerHTML = headerHTML();
    var footer = document.getElementById('site-footer');
    if (footer) footer.outerHTML = footerHTML();
    if (!document.body.hasAttribute('data-no-cart')) document.body.insertAdjacentHTML('beforeend', drawerHTML());

    markActiveNav();
    bindGlobal();
    watchScroll();
    DF.render();
    ageGate();
  }

  // Shrinks the hanging header logo into the bar once the page scrolls.
  function watchScroll() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var update = function () { header.classList.toggle('scrolled', window.scrollY > 40); };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
