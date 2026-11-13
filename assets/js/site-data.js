/* ==========================================================================
   Store info. Edit the values below; every page reads from here.
   Anything in [brackets] is a placeholder to replace with real info.
   Hours and the holiday notice can also be changed from admin.html.
   ========================================================================== */
window.DF_SITE = {
  address: {
    street: '[Street address]',
    city: 'Palmer Lake',
    state: 'CO',
    zip: '80133'
  },
  phone: '[(719) 000-0000]',
  email: '[info@yourdomain.com]',

  // day: 0 = Sunday ... 6 = Saturday. Times are 24-hour "HH:MM". (Sample hours.)
  hours: [
    { day: 0, open: '10:00', close: '19:00', closed: false },
    { day: 1, open: '09:00', close: '21:00', closed: false },
    { day: 2, open: '09:00', close: '21:00', closed: false },
    { day: 3, open: '09:00', close: '21:00', closed: false },
    { day: 4, open: '09:00', close: '21:00', closed: false },
    { day: 5, open: '09:00', close: '21:00', closed: false },
    { day: 6, open: '09:00', close: '21:00', closed: false }
  ],

  // Shows as a yellow bar at the top of every page when not empty.
  holidayNotice: '',

  links: {
    // I Heart Jane menu links. Leave empty to show the "coming soon" popup.
    janeRec: '',
    janeMed: '',
    facebook: '',
    instagram: ''
  },

  // Sample events for the preview. Past dates are hidden automatically.
  events: [
    {
      date: '2026-11-28', time: '17:00', color: 'var(--orange)',
      tag: { en: 'Car meet', es: 'Encuentro de autos' },
      title: { en: 'Cruise Night', es: 'Noche de Crucero' },
      text: {
        en: 'Roll your ride into the lot. Muscle, lowriders, hot rods, and bikes all welcome.',
        es: 'Trae tu carro al estacionamiento. Muscle cars, lowriders, hot rods y motos, todos bienvenidos.'
      }
    },
    {
      date: '2026-12-05', time: '12:00', color: 'var(--green)',
      tag: { en: 'Vendor day', es: 'Día de proveedores' },
      title: { en: 'Meet the Growers', es: 'Conoce a los Cultivadores' },
      text: {
        en: 'Talk shop with the people behind the products on our shelves. Deals all afternoon.',
        es: 'Platica con la gente detrás de los productos en nuestros estantes. Ofertas toda la tarde.'
      }
    },
    {
      date: '2026-12-12', time: '11:00', color: 'var(--pink)',
      tag: { en: 'Community', es: 'Comunidad' },
      title: { en: 'Hot Rod Toy Drive', es: 'Colecta de Juguetes Hot Rod' },
      text: {
        en: 'Bring a new, unwrapped toy and help us fill a hot rod for local kids.',
        es: 'Trae un juguete nuevo sin envolver y ayúdanos a llenar un hot rod para los niños de la zona.'
      }
    },
    {
      date: '2027-01-16', time: '18:00', color: 'var(--yellow)',
      tag: { en: 'Music', es: 'Música' },
      title: { en: 'Deep Cuts Night', es: 'Noche de Joyas Ocultas' },
      text: {
        en: 'Classic rock B-sides on the shop speakers, and a staff pick from every budtender.',
        es: 'Lados B del rock clásico en las bocinas de la tienda y una recomendación de cada budtender.'
      }
    }
  ]
};
