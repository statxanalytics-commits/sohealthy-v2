// ─── Testi i Profilit Nutricional — SoHealthy ───────────────────────────────
// All quiz logic: questions, scoring axes, profiles, product map.
// Pure data — no imports, no side effects.

export type Axis = 'INS' | 'HUN' | 'GUT' | 'CIR' | 'STR'

export interface AnswerOption {
  text: string
  scores: Partial<Record<Axis, number>>
}

export interface Question {
  id: number
  text: string
  options: AnswerOption[]
}

export interface Profile {
  key: string
  name: string
  tagline: string
  foods: string[]
  avoid: string[]
  habits: string[]
  fasting: string
  fastingOk: boolean
  primaryProducts: ProductRec[]
  secondaryProduct?: ProductRec
}

export interface ProductRec {
  slug: string
  name: string
  reason: string
  price: string
  url: string
}

// ─── QUESTIONS ────────────────────────────────────────────────────────────────

export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'Si ndihesh zakonisht pas një vakti me bukë, oriz ose makarona?',
    options: [
      { text: 'Energjik dhe normal', scores: { INS: 0 } },
      { text: 'Pak i përgjumur', scores: { INS: 2 } },
      { text: 'Shumë i rënduar dhe i përgjumur', scores: { INS: 4 } },
    ],
  },
  {
    id: 2,
    text: 'Sa shpejt të vjen uria përsëri pas një vakti?',
    options: [
      { text: 'Pas 4+ orësh', scores: { INS: 0 } },
      { text: 'Pas 2–3 orësh', scores: { INS: 2 } },
      { text: 'Brenda 1–2 orësh', scores: { INS: 4, HUN: 2 } },
    ],
  },
  {
    id: 3,
    text: 'A ke dëshirë për ëmbëlsira, veçanërisht pas vakteve?',
    options: [
      { text: 'Rrallë', scores: { INS: 0 } },
      { text: 'Ndonjëherë', scores: { INS: 2 } },
      { text: 'Pothuajse gjithmonë', scores: { INS: 4 } },
    ],
  },
  {
    id: 4,
    text: 'Si është uria jote në mëngjes?',
    options: [
      { text: 'Zgjohem shumë i uritur', scores: { HUN: 3 } },
      { text: 'Uri normale', scores: { HUN: 1 } },
      { text: 'Nuk kam fare uri në mëngjes', scores: { CIR: 2 } },
    ],
  },
  {
    id: 5,
    text: 'Kur ha, sa shpesh ndodh të hash përtej ngopjes?',
    options: [
      { text: 'Rrallë, ndalem kur ngopem', scores: { HUN: 0 } },
      { text: 'Ndonjëherë', scores: { HUN: 2 } },
      { text: 'Shpesh — ndihem plot por dua të vazhdoj', scores: { HUN: 4 } },
    ],
  },
  {
    id: 6,
    text: 'A ke dëshira të forta për ushqim gjatë natës?',
    options: [
      { text: 'Jo', scores: { HUN: 0, CIR: 0 } },
      { text: 'Ndonjëherë', scores: { HUN: 2, CIR: 1 } },
      { text: 'Po, shpesh', scores: { HUN: 3, CIR: 3 } },
    ],
  },
  {
    id: 7,
    text: 'A fryhesh ose ndihesh i rënduar pas ngrënies (perime, bishtajore, bulmet)?',
    options: [
      { text: 'Rrallë', scores: { GUT: 0 } },
      { text: 'Ndonjëherë', scores: { GUT: 2 } },
      { text: 'Shpesh', scores: { GUT: 4 } },
    ],
  },
  {
    id: 8,
    text: 'Si është tretja jote zakonisht?',
    options: [
      { text: 'E rregullt', scores: { GUT: 0 } },
      { text: 'Disi e parregullt', scores: { GUT: 2 } },
      { text: 'Shpesh e parregullt (kapsllëk ose e kundërta)', scores: { GUT: 4 } },
    ],
  },
  {
    id: 9,
    text: 'A je tip mëngjesi apo nate?',
    options: [
      { text: 'Tip mëngjesi — energjia më e lartë herët', scores: { CIR: 0 } },
      { text: 'Diku në mes', scores: { CIR: 1 } },
      { text: 'Tip nate — energjia më e lartë në mbrëmje', scores: { CIR: 3 } },
    ],
  },
  {
    id: 10,
    text: 'Në ç\'orë ha zakonisht vaktin më të madh?',
    options: [
      { text: 'Drekë', scores: { CIR: 0 } },
      { text: 'Darkë', scores: { CIR: 2 } },
      { text: 'Vonë në mbrëmje (pas orës 21:00)', scores: { CIR: 4 } },
    ],
  },
  {
    id: 11,
    text: 'Si e përshkruan nivelin e stresit në jetën tënde?',
    options: [
      { text: 'I qetë, nën kontroll', scores: { STR: 0 } },
      { text: 'Mesatar', scores: { STR: 2 } },
      { text: 'Shpesh nën presion / i nxituar', scores: { STR: 4 } },
    ],
  },
  {
    id: 12,
    text: 'Si fle zakonisht?',
    options: [
      { text: '7+ orë, gjumë i mirë', scores: { STR: 0, CIR: 0 } },
      { text: 'Mesatar, ndonjëherë zgjohem', scores: { STR: 2, CIR: 1 } },
      { text: 'Pak orë / gjumë i shqetësuar', scores: { STR: 4, CIR: 2 } },
    ],
  },
]

// ─── SCORING ──────────────────────────────────────────────────────────────────

export function computeAxes(answers: number[][]): Record<Axis, number> {
  // answers[i] = scores array from the chosen option of question i
  // (each answer is AnswerOption.scores, pre-mapped before calling this)
  const totals: Record<Axis, number> = { INS: 0, HUN: 0, GUT: 0, CIR: 0, STR: 0 }
  for (const scores of answers) {
    // scores is passed as Partial<Record<Axis, number>>
    for (const [axis, val] of Object.entries(scores) as [Axis, number][]) {
      totals[axis] = (totals[axis] || 0) + val
    }
  }
  return totals
}

function bucket(score: number): 'LOW' | 'MID' | 'HIGH' {
  if (score <= 3) return 'LOW'
  if (score <= 6) return 'MID'
  return 'HIGH'
}

export function computeProfileKey(axes: Record<Axis, number>): string {
  if (bucket(axes.STR) === 'HIGH') return 'stresuar'
  if (bucket(axes.CIR) === 'HIGH') return 'ore-vonë'
  if (bucket(axes.INS) === 'HIGH') return 'insulino-rezistent'
  if (bucket(axes.HUN) === 'HIGH') return 'uritur-kronik'
  if (bucket(axes.GUT) === 'HIGH') return 'digjestiv-ngadaltë'
  return 'ekuilibruar'
}

// ─── PROFILES ─────────────────────────────────────────────────────────────────

export const PROFILES: Record<string, Profile> = {
  'stresuar': {
    key: 'stresuar',
    name: 'Tipi i Stresuar Metabolik',
    tagline: 'Trupi yt është nën ngarkesë stresi dhe kortizoli i lartë. Fokusi është stabiliteti.',
    foods: [
      'Karbohidrate komplekse: tërshërë, patate të ëmbla, bishtajore',
      'Ushqime të pasura me magnez: bajame, spinaq',
      'Peshk i pasur me omega-3',
    ],
    avoid: [
      'Kafeinë e tepërt (mbi 2 filxhanë/ditë, asnjë pas orës 12:00)',
      'Sheqer i rafinuar',
      'Alkool',
    ],
    habits: [
      'Ha brenda 1 ore pas zgjimit — mos e kapërce mëngjesin',
      'Mos agjëro dhe mos i kapërce vaktet',
      'Kufizo kafeinën pas mesditës',
    ],
    fasting: 'Jo i rekomanduar. Agjërimi me ndërprerje rrit kortizolin dhe humbjen e masës muskulare.',
    fastingOk: false,
    primaryProducts: [
      {
        slug: 'detox-shot',
        name: 'Detox Shot',
        reason: 'Mbështet melçinë në pastrimin e metabolitëve të kortizolit',
        price: '3500 L / 14 ditë',
        url: 'https://app.sohealthy.al/products/detox-shot',
      },
      {
        slug: 'green-shot',
        name: 'Green Shot',
        reason: 'Mikronutrientë dhe alkalinitet që ndihmojnë balancën gjatë stresit',
        price: '3200 L / 14 ditë',
        url: 'https://app.sohealthy.al/products/green-shot',
      },
    ],
    secondaryProduct: {
      slug: 'aloe-shot',
      name: 'Aloe Shot',
      reason: 'Qetëson inflamacionin dhe mbron mukozën gastrike gjatë stresit',
      price: '3200 L / 14 ditë',
      url: 'https://app.sohealthy.al/products/aloe-shot',
    },
  },

  'ore-vonë': {
    key: 'ore-vonë',
    name: 'Tipi i Orës së Vonë',
    tagline: 'Ha vonë, fle keq, dhe dëshirat e natës të çojnë drejt mbingrënies. Çelësi është mbyllja e dritares së ngrënies.',
    foods: [
      'Proteina në mbrëmje — ngop pa rënduar',
      'Vakti më i madh në drekë',
      'Perime me volum të lartë',
    ],
    avoid: [
      'Ushqime të rënda pas orës 20:00',
      'Sheqer në mbrëmje',
      'Ushqime të procesuara natën',
    ],
    habits: [
      'Asnjë ushqim 3 orë para gjumit',
      'Vakti më i madh në drekë, jo në darkë',
      'Mbyll dritaren e ngrënies maksimumi në orën 20:00',
    ],
    fasting: 'Po, i butë (12:12). Zhvendos dritaren e ngrënies më herët gradualisht.',
    fastingOk: true,
    primaryProducts: [
      {
        slug: 'nf01',
        name: 'NF-01',
        reason: 'Zëvendëson darkën me proteina bizeleje, fibra dhe magnez — mbyll dritaren e ngrënies dhe ndihmon gjumin',
        price: '3500 L / 14 ditë',
        url: 'https://app.sohealthy.al/products/nf01',
      },
    ],
  },

  'insulino-rezistent': {
    key: 'insulino-rezistent',
    name: 'Tipi Insulino-Rezistent',
    tagline: 'Trupi yt e ka të vështirë të menaxhojë karbohidratet. Energjia luhatet dhe uria kthehet shpejt.',
    foods: [
      'Proteina në fillim të çdo vakti',
      'Perime jo-niseshtore',
      'Bishtajore dhe yndyrna të shëndetshme',
    ],
    avoid: [
      'Karbohidrate të rafinuara dhe bukë e bardhë',
      'Pije me sheqer dhe lëngje frutash',
      'Snacking ndërmjet vakteve',
    ],
    habits: [
      'Ha gjithmonë proteina + fibra para karbohidrateve',
      'Pa ushqime ndërmjet vakteve',
      'Lëvizje e lehtë 10 min pas vaktit kryesor',
    ],
    fasting: 'Po, i përshtatshëm (14:10 ose 16:8). Ndihmon ndjeshmërinë ndaj insulinës.',
    fastingOk: true,
    primaryProducts: [
      {
        slug: 'g1',
        name: 'G1',
        reason: 'Rrit GLP-1 në mënyrë natyrale — stabilizon sheqerin në gjak dhe vepron si Ozempik natyral',
        price: '3500 L / 14 ditë',
        url: 'https://app.sohealthy.al/products/g1',
      },
    ],
    secondaryProduct: {
      slug: 'metabolic-shot',
      name: 'Metabolic Shot',
      reason: 'Stimulon metabolizmin dhe ndjeshmërinë ndaj insulinës',
      price: '3200 L / 14 ditë',
      url: 'https://app.sohealthy.al/products/metabolic-shot',
    },
  },

  'uritur-kronik': {
    key: 'uritur-kronik',
    name: 'Tipi i Uritur Kronik',
    tagline: 'Sinjali i ngopjes të vjen me vonesë — ha më shumë para se të ndihesh i ngopur.',
    foods: [
      'Ushqime me volum të lartë dhe kalori të ulët (perime, supa)',
      'Proteina që treten ngadalë',
      'Ushqime të pasura me fibra solubile',
    ],
    avoid: [
      'Snacks të procesuara kalori-dendura por jo-ngopëse',
      'Pije me sheqer',
      'Ushqim pas orës 20:00',
    ],
    habits: [
      'Ha ngadalë — rregulli i 20 minutave',
      'Fillo çdo vakt me fibra ose proteina',
      'Pa ushqim pas orës 20:00',
    ],
    fasting: 'Me kujdes. Agjërimi i gjatë mund të ketë efekt të kundërt — fillo butë (12:12).',
    fastingOk: false,
    primaryProducts: [
      {
        slug: 'g1',
        name: 'G1',
        reason: 'Stimulon GLP-1 dhe sjell fibra (inulinë, glukomanan) që zgjasin ndjesinë e ngopjes',
        price: '3500 L / 14 ditë',
        url: 'https://app.sohealthy.al/products/g1',
      },
    ],
    secondaryProduct: {
      slug: 'berry-bliss',
      name: 'Berry Bliss',
      reason: 'Antioksidantë dhe fibra që ndihmojnë kontrollin e oreksit',
      price: '3200 L / 14 ditë',
      url: 'https://app.sohealthy.al/products/berry-bliss',
    },
  },

  'digjestiv-ngadaltë': {
    key: 'digjestiv-ngadaltë',
    name: 'Tipi Digjestiv i Ngadaltë',
    tagline: 'Tretja jote është e ngadaltë ose reaktive — fryhesh dhe ndihesh i rënduar pas ngrënies.',
    foods: [
      'Ushqime të fermentuara (kos, lakër turshi)',
      'Perime të gatuara në vend të të papjekurave',
      'Fibra solubile (tërshërë, patatja e ëmbël)',
    ],
    avoid: [
      'Ushqime të procesuara dhe ëmbëlsues artificialë',
      'Perime kruciferore të papjekura në tepri (brokoli, lakra)',
      'Ushqime të skuqura dhe yndyrna të ngopura',
    ],
    habits: [
      'Përtyp ngadalë dhe mirë — çdo kafshatë',
      'Mos ha kur je nën stres',
      'Lë të paktën 3–4 orë mes vakteve',
    ],
    fasting: 'Neutral. Hapësira mes vakteve ndihmon tretjen — por mos shko agresiv.',
    fastingOk: false,
    primaryProducts: [
      {
        slug: 'detox-shot',
        name: 'Detox Shot',
        reason: 'Heq ndjesinë e fryrjes, aktivizon tretjen që në mëngjes dhe lufton inflamacionin në zorrë',
        price: '3500 L / 14 ditë',
        url: 'https://app.sohealthy.al/products/detox-shot',
      },
    ],
    secondaryProduct: {
      slug: 'aloe-shot',
      name: 'Aloe Shot',
      reason: 'Qetëson mukozen e zorrës dhe ndihmon lëvizshmërinë digjestive',
      price: '3200 L / 14 ditë',
      url: 'https://app.sohealthy.al/products/aloe-shot',
    },
  },

  'ekuilibruar': {
    key: 'ekuilibruar',
    name: 'Tipi i Ekuilibruar',
    tagline: 'Trupi yt është në balancë të mirë metabolike. Nuk ke nevojë për ndërhyrje — vetëm mirëmbajtje.',
    foods: [
      'Diversitet ushqimor dhe perime me ngjyra',
      'Proteina cilësore (vezë, peshk, bishtajore)',
      'Drithëra integrale',
    ],
    avoid: [
      'Asgjë specifike — moderim me ushqimet e procesuara',
    ],
    habits: [
      'Mbaj diversitet në pjatë çdo ditë',
      'Lëviz çdo ditë — edhe 30 min ecje mjafton',
      'Hidratim i mirë — 2L ujë/ditë',
    ],
    fasting: 'Opsional. Trupi yt e menaxhon mirë sipas preferencës.',
    fastingOk: true,
    primaryProducts: [],
  },
}
