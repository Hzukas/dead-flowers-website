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

## Exclusive pre-roll showcase (`joint-program/`)

A standalone one-page module pitching the store-exclusive joint two-packs (2 x 0.7g and 2 x 1g in a doob tube). It does not depend on the rest of the site, so the folder can be copied anywhere or embedded in an iframe. Open `joint-program/index.html` directly.

To add tube images:

1. Put the image files in `joint-program/labels/`.
2. List them in `joint-program/labels.js`. Only `src` is required; `name`, `store`, and `type` (Sativa / Indica / Hybrid) show as the caption.
3. Delete the three `placeholder-*.svg` entries and files once real art is in.

To cut a lineup photo of several tubes into one PNG per tube:

```bash
node tools/split-tubes.js "C:\path\to\photo.jpg" 8
```

The number is how many tubes are in the photo. It writes `photo-1.png`, `photo-2.png`, ... into `joint-program/labels/`. The script finds each tube by looking for gaps of background between them, so it works best when the tubes don't overlap. Crops keep the photo's background; the carousel stage is black so shots on black blend in. Add `--transparent` to knock the background out instead, which only works when the tubes contrast with it. The Clarity logo in the header is `joint-program/logo.png`, the same file the Clarity apps use.

The carousel cycles every few seconds, pauses on hover, and supports arrow keys, dots, and swipe.
