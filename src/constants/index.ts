export const Colors = {
  pine: '#1B3F2F',
  alabaster: '#ECEFE8',
  aloe: '#71B5A2',
  goji: '#B74949',
  white: '#FFFFFF',
  border: '#D5DDD0',
  surface: '#F5F7F2',
  muted: '#6B7F72',
  mutedLight: 'rgba(107,127,114,0.5)',
}

export const LOGO = 'https://sohealthy.al/wp-content/uploads/2026/01/icon-light-scaled.jpeg'

// Combination schedules — when user selects multiple products
// Key: sorted slugs joined by '+', Value: array of schedule items
export const PRODUCT_COMBOS: Record<string, { slug: string; time: string; instruction: string }[]> = {
  // Detox Shot + Green Shot
  'detox-shot+green-shot': [
    { slug: 'detox-shot', time: '07:00', instruction: 'Detox Shot — stomak bosh, 15-20 min para mëngjesit' },
    { slug: 'green-shot', time: '12:10', instruction: 'Green Shot — 20 min para drekës' },
  ],
  // Detox Shot + G1
  'detox-shot+g1': [
    { slug: 'detox-shot', time: '07:00', instruction: 'Detox Shot — stomak bosh, 15-20 min para mëngjesit' },
    { slug: 'g1', time: '07:30', instruction: 'G1 — menjëherë pas Detox Shot, si zëvendësim mëngjesi' },
  ],
  // Detox Shot + Berry Bliss
  'berry-bliss+detox-shot': [
    { slug: 'detox-shot', time: '07:00', instruction: 'Detox Shot — stomak bosh, 15-20 min para mëngjesit' },
    { slug: 'berry-bliss', time: '12:10', instruction: 'Berry Bliss — 20 min para drekës' },
  ],
  // Detox 2.0 + Green Shot
  'detox-2+green-shot': [
    { slug: 'detox-2', time: '07:00', instruction: 'Detox 2.0 — stomak bosh, 15-20 min para mëngjesit' },
    { slug: 'green-shot', time: '12:10', instruction: 'Green Shot — 20 min para drekës' },
  ],
  // Detox 2.0 + G1
  'detox-2+g1': [
    { slug: 'detox-2', time: '07:00', instruction: 'Detox 2.0 — stomak bosh, 15-20 min para mëngjesit' },
    { slug: 'g1', time: '07:30', instruction: 'G1 — menjëherë pas Detox 2.0, si zëvendësim mëngjesi' },
  ],
  // Green Shot + G1
  'g1+green-shot': [
    { slug: 'g1', time: '07:30', instruction: 'G1 — mëngjes si zëvendësim' },
    { slug: 'green-shot', time: '12:10', instruction: 'Green Shot — 20 min para drekës' },
  ],
  // Green Organics (replaces breakfast + dinner, no other shots needed at same time)
  'green-organics': [
    { slug: 'green-organics', time: '07:00', instruction: 'GREEN SUNRISE — zëvendëso mëngjesin, 300-400ml ujë' },
    { slug: 'green-organics', time: '19:30', instruction: 'REDS — zëvendëso darkën, 300-400ml ujë' },
  ],
}

// Get combo schedule for a set of selected products
export function getComboSchedule(slugs: string[]): { slug: string; time: string; instruction: string }[] | null {
  if (slugs.length === 0) return null
  if (slugs.length === 1) return null // single product uses PRODUCTS config directly
  const key = [...slugs].sort().join('+')
  return PRODUCT_COMBOS[key] || null
}

export const PRODUCT_IMAGES: Record<string, string> = {
  'detox-shot':     'https://sohealthy.al/wp-content/uploads/2024/08/upscalemedia-transformed.png',
  'detox-2':        'https://sohealthy.al/wp-content/uploads/2026/05/upscalemedia-transformed-5.png',
  'green-shot':     'https://sohealthy.al/wp-content/uploads/2026/05/upscalemedia-transformed-3.png',
  'berry-bliss':    'https://sohealthy.al/wp-content/uploads/2022/04/upscalemedia-transformed-2.png',
  'aloe-shot':      'https://sohealthy.al/wp-content/uploads/2026/05/upscalemedia-transformed-4.png',
  'metabolic-shot': 'https://sohealthy.al/wp-content/uploads/2024/08/upscalemedia-transformed-4.png',
  'g1':             'https://sohealthy.al/wp-content/uploads/2026/05/upscalemedia-transformed-2.png',
  'nf01':           'https://sohealthy.al/wp-content/uploads/2026/05/upscalemedia-transformed-2.webp',
  'fiber-plus':     'https://sohealthy.al/wp-content/uploads/2026/01/icon-light-scaled.jpeg',
  'green-organics': 'https://sohealthy.al/wp-content/uploads/2026/01/icon-light-scaled.jpeg',
}

export const API = {
  scanner: 'https://project-iaeqw.vercel.app/api/analyze',
  diet: 'https://sohealthy-diet.vercel.app/api/generate-diet',
  quiz: 'https://sohealthy-quiz-2.vercel.app',
  challenge: 'https://index-blush-phi.vercel.app',
  calculator: 'https://kalkulatori-zeta.vercel.app',
  bodyCalc: 'https://llogaritje-trupi.vercel.app',
  resetBook: 'https://docs.google.com/viewer?url=https%3A%2F%2Frquoydwzulecmttrjdzo.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fbooks%2Freset-book.pdf&embedded=true',
}

export const PRODUCTS: Record<string, any> = {
  'detox-shot': {
    name: 'Detox Shot',
    notif_time: '07:00',
    notif_msg: 'Koha për Detox Shot 🌿 — stomak bosh!',
    storage: 'Ruaje në frigorifer, 2–6°C',
    how: '1 shishe 50ml — tunde mirë para se ta pish',
    when: 'Çdo mëngjes stomak bosh, 15–20 min para ngrënies',
    combo: 'Detox mëngjes + Green Shot 20 min para drekës',
    icon: '🌿',
  },
  'detox-2': {
    name: 'Detox 2.0',
    notif_time: '07:00',
    notif_msg: 'Detox 2.0 ⚡ — stomak bosh!',
    storage: 'Ruaje në frigorifer, 2–6°C',
    how: '1 shishe 50ml — tunde mirë para se ta pish',
    when: 'Çdo mëngjes stomak bosh, 15–20 min para ngrënies',
    icon: '⚡',
  },
  'green-shot': {
    name: 'Green Shot',
    notif_time: '12:30',
    notif_msg: 'Green Shot 💚 — 20 min para drekës!',
    storage: 'Ruaje në frigorifer, 2–6°C',
    how: '1 shishe 50ml — tunde mirë para se ta pish',
    when: '20 min para drekës',
    icon: '💚',
  },
  'berry-bliss': {
    name: 'Berry Bliss',
    notif_time: '07:00',
    notif_msg: 'Berry Bliss 🫐 — stomak bosh!',
    storage: 'Ruaje në frigorifer, 2–6°C',
    how: '1 shishe 50ml — tunde mirë para se ta pish',
    when: 'Çdo mëngjes stomak bosh',
    icon: '🫐',
  },
  'aloe-shot': {
    name: 'Aloe Shot',
    notif_time: '07:00',
    notif_msg: 'Aloe Shot 🌵 — stomak bosh!',
    storage: 'Ruaje në frigorifer, 2–6°C',
    how: '1 shishe 50ml — tunde mirë para se ta pish',
    when: 'Çdo mëngjes stomak bosh',
    icon: '🌵',
  },
  'metabolic-shot': {
    name: 'Metabolic Shot',
    notif_time: '07:15',
    notif_msg: 'Metabolic Shot 🔥 — stomak bosh!',
    storage: 'Ruaje në frigorifer, 2–6°C',
    how: '1 shishe 50ml — tunde mirë para se ta pish',
    when: 'Çdo mëngjes stomak bosh',
    icon: '🔥',
  },
  'g1': {
    name: 'G1 Sachet',
    notif_time: '07:30',
    notif_msg: 'G1 💚 — 1 qeskë në 250ml ujë',
    storage: 'Vend i thatë dhe i freskët — JO frigorifer',
    how: '1 qeskë në 250ml ujë — tunde mirë në shaker',
    when: 'Çdo mëngjes si zëvendësim i mëngjesit',
    has_plan: true,
    icon: '🌿',
  },
  'nf01': {
    name: 'NF-01',
    notif_time: '20:00',
    notif_msg: 'NF-01 🌙 — zëvendëso darkën!',
    storage: 'Vend i thatë dhe i freskët — JO frigorifer',
    how: '1 qeskë në 250ml ujë',
    when: 'Darkë — zëvendëso vaktin e darkës',
    has_plan: true,
    icon: '🌙',
  },
  'fiber-plus': {
    name: 'Fiber+',
    notif_time: '09:00',
    notif_msg: 'Fiber+ 🌾 — 1 qeskë në 250ml ujë',
    storage: 'Vend i thatë dhe i freskët — JO frigorifer',
    how: '1 qeskë në 250ml ujë',
    when: '1 orë para ose pas ngrënies',
    icon: '🌾',
  },
  'green-organics': {
    name: 'Green Organics',
    notif_time: '07:00',
    notif_time_2: '19:30',
    notif_msg: 'Green Sunrise ☀️ — zëvendëso mëngjesin!',
    notif_msg_2: 'Reds 🌙 — zëvendëso darkën!',
    storage: 'Vend i thatë dhe i freskët — JO frigorifer',
    how: 'Green Sunrise mëngjes + Reds darkë, 300-400ml ujë + shaker',
    when: 'Green Sunrise zëvendëson mëngjesin, Reds zëvendëson darkën',
    icon: '🌱',
  },
}
