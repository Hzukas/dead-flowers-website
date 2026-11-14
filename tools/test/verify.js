// Verifies the Dead Flowers mockup: translation keys, local links, and page behavior in jsdom.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const pages = ['index.html', 'merch.html', 'events.html', 'about.html', 'faq.html', 'contact.html', 'admin.html'];
let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  pass  ' + msg); else { failures++; console.log('  FAIL  ' + msg); } };

// ---------- Static: i18n keys ----------
console.log('\n[i18n keys]');
const i18nSrc = fs.readFileSync(path.join(ROOT, 'assets/js/i18n.js'), 'utf8');
const sandbox = { window: {} };
new Function('window', i18nSrc)(sandbox.window);
const dict = sandbox.window.DF_I18N;
const en = Object.keys(dict.en), es = Object.keys(dict.es);
ok(en.length === es.length && en.every(k => k in dict.es), `en and es have the same ${en.length} keys`);
const namespaces = new Set(en.map(k => k.split('.')[0]));
const used = new Set();
const files = pages.map(p => path.join(ROOT, p)).concat(
  fs.readdirSync(path.join(ROOT, 'assets/js')).map(f => path.join(ROOT, 'assets/js', f)).filter(f => !f.endsWith('i18n.js')));
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/data-(?:i18n(?:-aria|-placeholder|-alt)?|title-key)="([^"]+)"/g)) used.add(m[1]);
  for (const m of src.matchAll(/'([a-z0-9]+\.[a-zA-Z0-9]+)'/g)) if (namespaces.has(m[1].split('.')[0])) used.add(m[1]);
}
const missing = [...used].filter(k => !(k in dict.en));
ok(missing.length === 0, 'every key used in pages and scripts exists' + (missing.length ? ': ' + missing.join(', ') : ''));
const unused = en.filter(k => !used.has(k));
console.log('  info  unused keys: ' + (unused.length ? unused.join(', ') : 'none'));

// ---------- Static: local links ----------
console.log('\n[local links]');
const bad = [];
for (const p of pages) {
  const src = fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of src.matchAll(/(?:href|src)="([^"#:]+)"/g)) if (!fs.existsSync(path.join(ROOT, m[1]))) bad.push(p + ' -> ' + m[1]);
}
const siteJs = fs.readFileSync(path.join(ROOT, 'assets/js/site.js'), 'utf8');
for (const m of siteJs.matchAll(/(?:href|src)="([a-z][^"#:]*\.(?:html|png))"/g)) if (!fs.existsSync(path.join(ROOT, m[1]))) bad.push('site.js -> ' + m[1]);
ok(bad.length === 0, 'all local href/src targets exist' + (bad.length ? ': ' + bad.join(', ') : ''));

// ---------- Dynamic: load a page in jsdom ----------
async function load(page, storage = {}) {
  let html = fs.readFileSync(path.join(ROOT, page.split('?')[0]), 'utf8');   // page may carry ?query
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) =>
    '<script>' + fs.readFileSync(path.join(ROOT, src), 'utf8').replace(/<\/script>/g, '<\\/script>') + '</script>');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message));
  vc.on('error', e => errors.push(String(e)));
  const dom = new JSDOM(html, {
    url: 'http://localhost/' + page,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      for (const [k, v] of Object.entries(storage)) win.localStorage.setItem(k, JSON.stringify(v));
      win.scrollTo = () => {};
      // jsdom has no WebGL. Report "unavailable" so pages take their no-WebGL fallback.
      win.HTMLCanvasElement.prototype.getContext = () => null;
      win.Element.prototype.scrollIntoView = function () {};
      win.alert = m => errors.push('alert: ' + m);
      win.confirm = () => true;
    }
  });
  if (dom.window.document.readyState === 'loading') await new Promise(r => dom.window.document.addEventListener('DOMContentLoaded', () => setTimeout(r, 0)));
  return { dom, win: dom.window, doc: dom.window.document, errors };
}
const click = (win, el) => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
const store = win => { const o = {}; for (let i = 0; i < win.localStorage.length; i++) { const k = win.localStorage.key(i); o[k] = JSON.parse(win.localStorage.getItem(k)); } return o; };

(async () => {
console.log('\n[every page, English and Spanish]');
for (const page of pages) {
  for (const lang of ['en', 'es']) {
    const { doc, errors } = await load(page, { df_age_ok: true, df_lang: lang });
    const untranslated = [...doc.querySelectorAll('[data-i18n]')].filter(el => el.textContent === el.getAttribute('data-i18n'));
    ok(errors.length === 0 && untranslated.length === 0,
      `${page} (${lang}) loads with no script errors and no raw keys` +
      (errors.length ? ' | errors: ' + errors.join(' / ') : '') + (untranslated.length ? ' | raw: ' + untranslated.length : ''));
    if (page !== 'admin.html') ok(!!doc.querySelector('.site-header') && !!doc.querySelector('.site-footer'), `${page} (${lang}) has header and footer`);
  }
}

console.log('\n[age gate]');
{
  const { win, doc } = await load('index.html');
  ok(!!doc.querySelector('[data-age-gate]'), 'gate shows on first visit');
  click(win, doc.querySelector('[data-age-no]'));
  ok(!doc.querySelector('[data-age-denied]').hidden, '"No" shows the under-21 message');
  click(win, doc.querySelector('[data-age-yes]'));
  ok(!doc.querySelector('[data-age-gate]') && store(win).df_age_ok === true, '"Yes" removes the gate and remembers it');
  const again = await load('index.html', { df_age_ok: true });
  ok(!again.doc.querySelector('[data-age-gate]'), 'gate stays away on the next visit');
  const forced = await load('about.html?gate', { df_age_ok: true });
  ok(!!forced.doc.querySelector('[data-age-gate]') && forced.errors.length === 0, '?gate shows the gate again after answering Yes');
  const admin = await load('admin.html');
  ok(!admin.doc.querySelector('[data-age-gate]'), 'admin page has no gate');
}

console.log('\n[home]');
{
  const { win, doc } = await load('index.html', { df_age_ok: true });
  ok(doc.querySelector('[data-hours-today]').textContent.length > 0, 'today\'s hours show: ' + doc.querySelector('[data-hours-today]').textContent);
  ok(doc.querySelector('[data-address]').textContent.includes('Palmer Lake'), 'address shows');
  click(win, doc.querySelector('.shop-card[data-jane="rec"]'));
  ok(!!doc.querySelector('.modal-overlay'), 'Shop Rec opens the menu-link popup while the Jane link is empty');
  click(win, doc.querySelector('[data-modal-close]'));
  ok(!doc.querySelector('.modal-overlay'), 'popup closes');
  click(win, doc.querySelector('.site-header [data-lang-toggle]'));
  ok(doc.querySelector('.nav-links a[href="merch.html"]').textContent === 'Mercancía' && doc.documentElement.lang === 'es', 'language toggle switches the nav to Spanish');
  const hh = doc.querySelector('.header-hours');
  ok(!!hh && /\d/.test(hh.textContent) && /today|hoy/i.test(hh.textContent), 'header shows today\'s hours: ' + (hh && hh.textContent));
  ok(!doc.querySelector('.header-logo'), 'home page has no header logo (the hero has the big one)');
  const about = await load('about.html', { df_age_ok: true });
  ok(!!about.doc.querySelector('.site-header .header-logo img'), 'other pages show the centered header logo');
  const heroLogo = doc.querySelector('.hero .hero-float');
  ok(!!heroLogo && !doc.querySelector('.hero').classList.contains('hero-live'), 'without WebGL the hero keeps the plain logo');
  const deals = doc.querySelector('[data-deals]');
  ok(!deals.hidden && deals.querySelectorAll('.deals-list li').length === 1 && deals.textContent.includes('Wana'), 'monthly deals show on the home page');
  ok(deals.querySelector('[data-deals-title]').textContent === 'Ofertas de Noviembre', 'deals title follows the language: ' + deals.querySelector('[data-deals-title]').textContent);
  const noDeals = await load('index.html', { df_age_ok: true, df_deals: { month: 12, items: [] } });
  ok(noDeals.doc.querySelector('[data-deals]').hidden, 'deals section hides when there are no deals');
  const held = await load('index.html', { df_age_ok: true, df_holiday: 'Closed Thanksgiving Day.' });
  const banner = held.doc.querySelector('[data-holiday]');
  ok(!banner.hidden && banner.textContent.includes('Thanksgiving'), 'holiday notice shows as a banner when set');
}

console.log('\n[merch + cart]');
{
  const { win, doc } = await load('merch.html', { df_age_ok: true });
  const shirts = doc.querySelectorAll('.mt-shirt');
  ok(shirts.length === 4, `merch wall hangs ${shirts.length} shirts`);
  ok(shirts[0].querySelector('.shirt svg') !== null && /\$30/.test(shirts[0].querySelector('.mt-tag').textContent), 'shirt drawing and price tag render');
  const pop = doc.querySelector('[data-merch-pop]');
  click(win, shirts[0]);
  ok(!pop.hidden && pop.querySelector('[data-pop-name]').textContent === 'Racing Stripe Tee', 'tapping a shirt opens its close-up');
  click(win, pop.querySelector('[data-pop-add]'));
  ok(!pop.hidden && pop.querySelector('[data-pop-msg]').textContent.length > 0, 'adding without a size asks for one');
  click(win, pop.querySelector('[data-pop-sizes] [data-size="L"]'));
  click(win, pop.querySelector('[data-pop-add]'));
  ok(pop.hidden && doc.querySelector('[data-cart-count]').textContent === '1', 'adding closes the close-up and cart count goes to 1');
  click(win, shirts[1]);
  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok(pop.hidden, 'Escape closes the close-up');
  click(win, doc.querySelector('[data-cart-open]'));
  ok(doc.querySelector('[data-drawer]').classList.contains('open'), 'cart drawer opens');
  click(win, doc.querySelector('[data-qty="1"]'));
  ok(doc.querySelector('[data-cart-count]').textContent === '2', 'plus button raises quantity to 2');
  const total = doc.querySelector('.drawer-row.total').textContent;
  ok(total.includes('$60.00'), 'total reads ' + total);
  click(win, doc.querySelector('[data-code-apply]'));
  ok(doc.querySelector('[data-code-msg]').textContent.length > 0, 'discount code field responds');
  click(win, doc.querySelector('[data-checkout]'));
  ok(!!doc.querySelector('.modal-overlay'), 'checkout shows the coming-soon popup');
  click(win, doc.querySelector('[data-modal-close]'));
  click(win, doc.querySelector('[data-remove]'));
  ok(doc.querySelector('[data-cart-count]').textContent === '0', 'remove empties the cart');
}

console.log('\n[events + contact]');
{
  const ev = await load('events.html', { df_age_ok: true });
  ok(ev.doc.querySelectorAll('.event').length === 4, `events page lists ${ev.doc.querySelectorAll('.event').length} upcoming events`);
  const ct = await load('contact.html', { df_age_ok: true });
  ok(ct.doc.querySelectorAll('[data-hours-table] tr').length === 7 && ct.doc.querySelectorAll('[data-hours-table] tr.today').length === 1, 'hours table has 7 days with today highlighted');
  const form = ct.doc.querySelector('[data-contact-form]');
  form.dispatchEvent(new ct.win.Event('submit', { bubbles: true, cancelable: true }));
  ok(ct.doc.querySelector('[data-form-msg]').textContent.length > 0, 'contact form shows a thank-you');
}

console.log('\n[admin]');
{
  const { win, doc, errors } = await load('admin.html');
  ok(doc.querySelectorAll('.hours-row').length === 7, 'hours editor shows 7 days');
  const monday = doc.querySelector('.hours-row[data-day="1"]');
  monday.querySelector('[data-open]').checked = false;
  monday.querySelector('[data-open]').dispatchEvent(new win.Event('change', { bubbles: true }));
  doc.querySelector('[data-holiday-input]').value = 'Closed Christmas Day.';
  click(win, doc.querySelector('[data-save-hours]'));
  const saved = store(win);
  ok(saved.df_hours && saved.df_hours.find(h => h.day === 1).closed === true && saved.df_holiday === 'Closed Christmas Day.', 'saving hours stores Monday closed and the holiday note');

  ok(doc.querySelectorAll('.deal-row').length === 1, 'deals editor shows the current deal');
  click(win, doc.querySelector('[data-add-deal]'));
  const rows = doc.querySelectorAll('.deal-row');
  rows[1].querySelector('[data-f="title_en"]').value = '20% off all pre-rolls';
  rows[1].querySelector('[data-f="detail_en"]').value = 'Fridays only.';
  doc.querySelector('[data-deals-month]').value = '12';
  click(win, doc.querySelector('[data-save-deals]'));
  const sd = store(win).df_deals;
  ok(sd && sd.month === 12 && sd.items.length === 2 && sd.items[1].detail.en === 'Fridays only.', 'saving deals stores the month and both deals');
  click(win, doc.querySelectorAll('[data-remove-deal]')[0]);
  ok(doc.querySelectorAll('.deal-row').length === 2, 'first Remove click on a deal only asks to confirm');
  click(win, doc.querySelectorAll('[data-remove-deal]')[0]);
  click(win, doc.querySelector('[data-save-deals]'));
  ok(store(win).df_deals.items.length === 1 && store(win).df_deals.items[0].title.en === '20% off all pre-rolls', 'removing a deal and saving keeps the other');

  ok(doc.querySelectorAll('.admin-item').length === 4, 'merch list shows 4 items');
  click(win, doc.querySelector('[data-add-item]'));
  const f = doc.querySelector('[data-item-form]');
  ok(f.elements['partNo'].value === 'DF-T005', 'new item gets part number ' + f.elements['partNo'].value);
  f.elements['name'].value = 'Pit Crew Tee';
  f.elements['price'].value = '27.5';
  f.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  let merch = store(win).df_merch;
  ok(merch && merch.length === 5 && merch[4].name === 'Pit Crew Tee' && merch[4].price === 27.5, 'adding an item saves it');

  const edit = [...doc.querySelectorAll('.admin-item')].find(r => r.textContent.includes('Racing Stripe Tee'));
  click(win, edit.querySelector('[data-edit]'));
  f.elements['price'].value = '35';
  f.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  merch = store(win).df_merch;
  ok(merch.find(p => p.id === 'racing-stripe-tee').price === 35, 'editing a price saves it');

  const hide = [...doc.querySelectorAll('.admin-item')].find(r => r.textContent.includes('Hot Rod Flames'));
  const box = hide.querySelector('[data-toggle-active]');
  box.checked = false;
  box.dispatchEvent(new win.Event('change', { bubbles: true }));
  const del = [...doc.querySelectorAll('.admin-item')].find(r => r.textContent.includes('Speed & Supply'));
  click(win, del.querySelector('[data-delete]'));
  ok(store(win).df_merch.length === 5 && del.querySelector('[data-delete]').textContent === 'Click again to remove', 'first Remove click only asks to confirm');
  click(win, del.querySelector('[data-delete]'));
  merch = store(win).df_merch;
  ok(merch.length === 4 && merch.find(p => p.id === 'hot-rod-flames-tee').active === false, 'hiding and removing items saves');
  ok(errors.length === 0, 'admin actions raised no errors' + (errors.length ? ': ' + errors.join(' / ') : ''));

  const shop = await load('merch.html', Object.assign({ df_age_ok: true }, store(win)));
  const names = [...shop.doc.querySelectorAll('.mt-name')].map(n => n.textContent);
  ok(names.length === 3 && names.includes('Pit Crew Tee') && !names.includes('Hot Rod Flames Tee'), 'store page reflects admin changes: ' + names.join(', '));
  const racing = shop.doc.querySelector('.mt-shirt[data-id="racing-stripe-tee"] .mt-tag');
  ok(!!racing && racing.textContent.includes('$35'), 'store page shows the edited price on the tag');
  const pit = shop.doc.querySelector('.mt-shirt[data-id^="pit-crew-tee"] .mt-tag');
  ok(!!pit && pit.textContent.includes('$27.50'), 'a price with cents keeps them on the tag: ' + (pit && pit.textContent));
  const home = await load('index.html', Object.assign({ df_age_ok: true }, store(win)));
  ok(home.doc.querySelector('[data-holiday]').textContent.includes('Christmas'), 'site shows the holiday note set in admin');
  const dealText = home.doc.querySelector('[data-deals]').textContent;
  ok(dealText.includes('December') && dealText.includes('pre-rolls') && !dealText.includes('Wana'), 'home page shows the deals set in admin');
}

})().then(() => {
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
});
