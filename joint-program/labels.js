/* ==========================================================================
   Tube carousel
   Images live in joint-program/labels/. Only "src" is required.
   "name", "store", and "type" (Sativa / Indica / Hybrid) show as the caption.
   "bg" is the photo's own background color, so the crop blends into the slide.

   To cut a lineup photo of several tubes into one image per tube:
     node tools/split-tubes.js "path/to/photo.png" 3
   It writes photo-1.png, photo-2.png, ... into this folder and prints each
   crop's background color.
   ========================================================================== */
window.TUBE_LABELS = [
  { src: "labels/sticky-fingers-1.png",     name: "Sticky Fingers",         store: "Dead Flowers Dispensary", bg: "#0a0a0a" },
  { src: "labels/two-moons-two-suns-2.png", name: "Two Suns",               type: "Sativa",                   bg: "#fdfdfe" },
  { src: "labels/pocket-rockets-2.png",     name: "Pocket Rockets",         store: "Navy",                    bg: "#fefefe" },
  { src: "labels/aw-certified-1.png",       name: "aW Certified",                                             bg: "#000000" },
  { src: "labels/two-moons-two-suns-1.png", name: "Two Moons",              type: "Indica",                   bg: "#fdfdfe" },
  { src: "labels/rolling-stoned-1.png",     name: "Rolling Stoned",         store: "Dead Flowers Dispensary", bg: "#0a0909" },
  { src: "labels/pocket-rockets-1.png",     name: "Pocket Rockets",         store: "Black",                   bg: "#fefefe" },
  { src: "labels/pocket-rockets-3.png",     name: "Pocket Rockets",         store: "Cream",                   bg: "#fefefe" }
];
