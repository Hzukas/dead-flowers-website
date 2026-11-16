/* ==========================================================================
   Joint program label carousel
   Drop tube images into joint-program/labels/ and list them here.
   Only "src" is required. "name", "store", and "type" show as a caption.
   type can be "Sativa", "Indica", or "Hybrid".

   To cut a lineup photo of several tubes into one image per tube:
     node tools/split-tubes.js "path/to/photo.jpg" 8
   It writes photo-1.png, photo-2.png, ... into this folder.

   Delete the placeholder entries once all the real tubes are in.
   ========================================================================== */
window.TUBE_LABELS = [
  { src: "labels/joints-1.png", name: "aW Certified", store: "Partner exclusive" },

  // Placeholders until the remaining tubes are added
  { src: "labels/placeholder-sativa.svg", name: "Placeholder", store: "Your store", type: "Sativa" },
  { src: "labels/placeholder-indica.svg", name: "Placeholder", store: "Your store", type: "Indica" },
  { src: "labels/placeholder-hybrid.svg", name: "Placeholder", store: "Your store", type: "Hybrid" }
];
