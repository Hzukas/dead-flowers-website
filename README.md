# Dead Flowers Dispensary — website mockup

A clickable mockup of the new site to show Robbie. Plain HTML, CSS, and JavaScript with no build step.

## Viewing it

Double-click `index.html` to open it in any browser. Every page works straight from the folder.

Pages: Home, Merch, Events, About, FAQ, Contact, plus `admin.html` (the shop admin demo, not linked from the site).

## What's in it

- **21+ age gate** on first visit, remembered afterward.
- **English / Español toggle** in the header. All site text lives in `assets/js/i18n.js`.
- **Shop Rec / Shop Med** buttons open the I Heart Jane menus. Until the links are added in `assets/js/site-data.js`, they show a "coming soon" popup.
- **Merch store** styled as a vintage auto parts catalog, with a cart ("order form"), a dispensary discount code field, and a checkout placeholder until a payment processor is set up.
- **Admin demo** (`admin.html`) where Robbie can change hours, post a holiday notice, and add, edit, hide, or remove merch, with plain-language instructions. In the mockup, changes are saved only in the browser being used.

## Where to edit things

| What | File |
| --- | --- |
| Address, phone, email, hours, Jane and social links, events | `assets/js/site-data.js` |
| Starting merch list | `assets/js/merch-data.js` |
| All wording, English and Spanish | `assets/js/i18n.js` |
| Colors, fonts, layout | `assets/css/styles.css` |
| Header, footer, age gate, cart behavior | `assets/js/site.js` |

## Landing graphic slot

The hero at the top of `index.html` is a placeholder. The comment above it explains the swap:

1. Put the psychedelic loop inside `.hero-bg` and remove its `placeholder` class. A muted, looping MP4 or WebM plays smoother and loads lighter than a GIF.
2. Replace the round logo badge with the transparent logo.
3. Delete the "Landing graphic slot" label.

## Placeholders still to replace

- Street address, phone, and email (in brackets in `site-data.js`)
- Store hours (sample values)
- I Heart Jane rec and med links, Instagram and Facebook links
- Events (samples)
- Merch items, prices, and photos
- Store photos on the About page, and a map on the Contact page
- The logo is a 1.3 MB PNG with a white background. The live site needs a smaller, transparent version.

## Not built yet (needs decisions)

- Payment processor and real checkout
- How dispensary discount codes are issued and how much they take off
- A real admin login and storage, so Robbie's edits reach every visitor
- Colorado compliance review of the footer and age-gate wording
