# Dead Flowers Dispensary — website mockup

A clickable mockup of the new site to show Robbie. Plain HTML, CSS, and JavaScript with no build step.

## Viewing it

Double-click `index.html` to open it in any browser. Every page works straight from the folder.

Pages: Home, Merch, Events, About, FAQ, Contact, plus `admin.html` (the shop admin demo, not linked from the site).

## Working on it on another computer

The project is in a private GitHub repo. On a new computer, install Git and Node.js, then:

```bash
git clone https://github.com/Hzukas/dead-flowers-website.git
cd dead-flowers-website
npm install
```

Before switching computers, commit and push your changes. When you sit down at the other computer, run `git pull` first.

| Command | What it does |
| --- | --- |
| `npm test` | Checks every page in English and Spanish, the age gate, cart, events, and admin |
| `npm run serve` | Serves the site at http://localhost:5173 (needed for screenshots) |
| `npm run assets` | Regenerates the SVG frames and textures from `tools/make-assets.js` |
| `sh tools/test/shots.sh name 1400x900 "http://localhost:5173/index.html?shot=1"` | Saves a headless Edge screenshot to `tools/test/shots/` (Git Bash). Edge sometimes hangs after saving; the picture is still written. |

## What's in it

- **21+ age gate** on first visit, remembered afterward: a colorful pop-up over black-and-white dripping paint.
- **English / Español toggle** in the header. All site text lives in `assets/js/i18n.js`.
- **Shop Rec / Shop Med** buttons open the I Heart Jane menus. Until the links are added in `assets/js/site-data.js`, they show a "coming soon" popup.
- **Merch store** styled as a vintage auto parts catalog, with a cart ("order form"), a dispensary discount code field, and a checkout placeholder until a payment processor is set up.
- **Monthly deals** on the home page, right under the hero. A green starburst shows the month, and each deal has a headline and optional fine print in English and Spanish. The section hides itself when there are no deals.
- **Admin demo** (`admin.html`) where Robbie can change hours, post a holiday notice, update the monthly deals, and add, edit, hide, or remove merch, with plain-language instructions. In the mockup, changes are saved only in the browser being used.

## Where to edit things

| What | File |
| --- | --- |
| Address, phone, email, hours, monthly deals, Jane and social links, events | `assets/js/site-data.js` |
| Store photos on the About page | `assets/img/store/` |
| Starting merch list | `assets/js/merch-data.js` |
| All wording, English and Spanish | `assets/js/i18n.js` |
| Colors, fonts, layout | `assets/css/styles.css` |
| Header, footer, age gate, cart behavior | `assets/js/site.js` |

## Custom frames and textures

All decorative artwork is plain SVG, so it can be opened and edited in Illustrator, Figma, or Inkscape.

| File | Used for |
| --- | --- |
| `assets/img/frames/pinstripe-*.svg` | Hot rod pinstripe corners on cards, tiles, FAQ, and popups (one file per color) |
| `assets/img/frames/catalog-frame.svg` | Hex-nut border around the merch catalog sheet |
| `assets/img/frames/part-frame.svg` | Frame around each merch item |
| `assets/img/frames/filmstrip.svg` | 35mm film frames around About page photos |
| `assets/img/textures/grain.svg` | Film grain over the whole site |
| `assets/img/textures/paper.svg` | Aged paper on the catalog and order form |
| `assets/img/textures/stain.svg` | Coffee ring on the catalog |
| `assets/img/textures/sunburst.svg` | Rays behind page headers, the exclusives band, and the age gate |
| `assets/img/textures/wave-stripes.svg` | Wavy 70s stripe dividers |
| `assets/img/textures/checker.svg` | Checkered flag strip above the footer |

To swap one, replace the file and keep its name. To change colors or shapes across the whole set, edit `tools/make-assets.js` and run `node tools/make-assets.js`. That overwrites the SVGs above.

## Landing graphic slot

The transparent logo already floats in the hero. The background behind it is still a placeholder. The comment above it explains the swap:

1. Put the psychedelic loop inside `.hero-bg` and remove its `placeholder` class. A muted, looping MP4 or WebM plays smoother and loads lighter than a GIF.
2. Delete the "Landing graphic slot" label.

## Paint glops on the merch page

`assets/js/page-drips.js` hangs a few big glops of psychedelic paint just under the header, along the page edges. Each glop swells, stretches, lets go, and falls down the screen while a new one builds. It's turned on per page with `data-page-drips` on `<body>`; `data-drips-frame=".catalog"` puts a glop over each side of the catalog frame. Load it after `paint.js` and `site.js`. To add it to another page, add those attributes and the script tag. Where the glops hang, how big they get, and how long they take to fall are set in `layout()` in the script.

## Shared paint (`assets/js/paint.js`)

Makes the marbled paint texture used by the merch glops, and paints the age gate's background: a black-and-white sheet of that paint across the top with drips hanging off it. Loaded before `site.js` on every public page.

## Logo files

| File | Used for |
| --- | --- |
| `assets/img/logo-transparent.png` | Master cutout (900 KB). Not loaded by the site; the files below are made from it. |
| `assets/img/logo-full.webp` | Floating logo in the hero and on the age gate (192 KB) |
| `assets/img/logo-full.png` | Fallback for browsers without WebP |
| `assets/img/logo-mark.png` | Guitar-leaf mark in the header badge, admin, and the logo shirt drawing |
| `assets/img/favicon.png` | Browser tab icon |

The site gives the full logo a thin cream outline in CSS (`.hero-float`, `.age-logo`), because its dark navy lettering disappears on the dark background. The old `assets/img/logo.png` (white background, 1.3 MB) is no longer used.

## Placeholders still to replace

- I Heart Jane rec and med links. The shop is already on Jane; these go in last, right before launch. Until then the buttons show the "coming soon" popup.
- Events (samples)
- Merch items, prices, and photos
- A map on the Contact page

## Not built yet (needs decisions)

- Merch checkout. Stripe, Shopify Payments, and Square all prohibit dispensaries, so they are out. Leading option: a Fourthwall store (its policy allows cannabis-imagery apparel; confirm with support@fourthwall.com that a dispensary can own the store). Fallback: a high-risk merchant account (PaymentCloud, PayKings, Easy Pay Direct).
- Merch ships to the US and Canada only.
- Merch discount codes: earned by spending money at the dispensary, redeemed on merch. Still to decide: how codes are issued and how much they take off.
- A real admin login and storage, so Robbie's edits reach every visitor
- Colorado compliance review of the footer and age-gate wording
