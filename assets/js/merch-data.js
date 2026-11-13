/* ==========================================================================
   Merch catalog (placeholder products).
   Robbie can add, edit, hide, and remove items from admin.html.
   This file is the starting list the store falls back to.

   Fields:
     id       unique id, lowercase, no spaces
     partNo   catalog part number shown on the card
     name     product name
     price    US dollars
     sizes    sizes to offer
     color    shirt color for the placeholder drawing
     design   'stripes' | 'text' | 'logo' | 'flames' | 'plain' (placeholder drawing)
     print    words printed on the shirt when design is 'text'
     image    optional photo path or data URL; replaces the drawing
     desc     English description
     desc_es  Spanish description (optional, falls back to English)
     active   false hides the item without deleting it
   ========================================================================== */
window.DF_MERCH_DEFAULT = [
  {
    id: 'racing-stripe-tee', partNo: 'DF-T001', name: 'Racing Stripe Tee', price: 30,
    sizes: ['S', 'M', 'L', 'XL', '2XL'], color: '#161616', design: 'stripes', image: '',
    desc: 'Heavyweight black tee with the triple racing stripe across the chest.',
    desc_es: 'Camiseta negra gruesa con la triple franja de carreras en el pecho.',
    active: true
  },
  {
    id: 'speed-supply-tee', partNo: 'DF-T002', name: 'Speed & Supply Tee', price: 28,
    sizes: ['S', 'M', 'L', 'XL', '2XL'], color: '#efe2c2', design: 'text', print: 'SPEED & SUPPLY', image: '',
    desc: 'Vintage-wash cream tee printed like an old parts-counter work shirt.',
    desc_es: 'Camiseta color crema deslavada, estampada como camisa de mostrador de refacciones.',
    active: true
  },
  {
    id: 'psychedelic-logo-tee', partNo: 'DF-T003', name: 'Psychedelic Logo Tee', price: 32,
    sizes: ['S', 'M', 'L', 'XL', '2XL'], color: '#4b2a86', design: 'logo', image: '',
    desc: 'The full-color Dead Flowers logo on a deep purple tee.',
    desc_es: 'El logo de Dead Flowers a todo color en una camiseta morada.',
    active: true
  },
  {
    id: 'hot-rod-flames-tee', partNo: 'DF-T004', name: 'Hot Rod Flames Tee', price: 30,
    sizes: ['S', 'M', 'L', 'XL', '2XL'], color: '#1d2b4a', design: 'flames', image: '',
    desc: 'Navy tee with hand-drawn hot rod flames licking up from the hem.',
    desc_es: 'Camiseta azul marino con flamas de hot rod que suben desde el dobladillo.',
    active: true
  }
];
