// Tetori Rozë — guide content. FINAL COPY: edit wording here only, never in the screen.
// `**text**` marks bold. Keep every ë and ç. No SoHealthy product may appear in this file
// except inside the `shenim` disclaimer.

export type SectionId = 'hyrje' | 'njihe' | 'shenjat' | 'kontrollet' | 'zakonet' | 'plani' | 'shenim'
export type AgeRange = '20–39' | '40–49' | '50–74' | '75+'

export const TR = {
  hero: {
    eyebrow: 'TETORI ROZË',
    title: 'Ky udhëzues nuk flet për produkte. Flet për ty.',
    meta: '5 minuta lexim',
  },

  // Section index chips (UI labels)
  index: [
    { id: 'njihe', label: '1. Njihe trupin' },
    { id: 'shenjat', label: '2. Shenjat' },
    { id: 'kontrollet', label: '3. Kontrollet' },
    { id: 'zakonet', label: '4. Zakonet' },
    { id: 'plani', label: '5. Plani' },
  ] as { id: SectionId; label: string }[],

  hyrje: {
    paragraphs: [
      'Ky udhëzues nuk flet për produkte. Flet për ty.',
      'Kanceri i gjirit është kanceri më i shpeshtë te gratë, dhe kur zbulohet herët, ka shumë më tepër mundësi trajtimi. Tre gjëra janë në duart e tua: ta njohësh trupin tënd, të bësh kontrollet në kohë dhe të ndërtosh zakone që të mbështesin për vite.',
    ],
  },

  njihe: {
    title: '1. Njihe trupin tënd',
    intro: 'Qëllimi nuk është të bëhesh mjeke. Qëllimi është të dish si është gjoksi yt normalisht, që ta vëresh menjëherë kur diçka ndryshon.',
    when: '**Kur:** një herë në muaj, 3–5 ditë pas përfundimit të ciklit (kur gjoksi është më pak i ndjeshëm). Nëse nuk ke më cikël, zgjidh një datë fikse çdo muaj.',
    stepsLabel: '**Si — 4 hapa:**',
    steps: [
      '**Para pasqyrës, krahët poshtë.** Vëri re formën, madhësinë, lëkurën dhe thithat.',
      '**Krahët lart.** Shiko sërish, a ka ndryshim në formë, rrudhje apo tërheqje të lëkurës.',
      '**Shtrirë.** Me tre gishtat e mesit, me lëvizje të vogla rrethore, prek gjithë gjoksin, nga klavikula deri poshtë brinjëve, nga sqetulla deri në mes.',
      '**Sqetulla.** Mos e harro. Edhe aty ka inde gjiri dhe gjëndra limfatike.',
    ],
    shower: 'Mund ta bësh edhe në dush, kur lëkura është e lagur dhe dora rrëshqet më lehtë.',
    note: 'Vetëkontrolli nuk e zëvendëson mamografinë. Janë dy gjëra që plotësojnë njëra-tjetrën.',
  },

  shenjat: {
    title: '2. Shenjat që nuk i shtyn për më vonë',
    intro: 'Shko te mjeku nëse vëren:',
    items: [
      'një gungë të re në gjoks ose në sqetull',
      'ënjtje të një pjese të gjoksit, edhe pa gungë',
      'lëkurë të rrudhosur, si lëvozhgë portokalli',
      'skuqje, zhvoshkje ose trashje të lëkurës apo të thithit',
      'thith që tërhiqet nga brenda',
      'rrjedhje nga thithi (që nuk është qumësht)',
      'dhimbje në një pikë që nuk largohet',
    ],
    note: '**E rëndësishme:** shumica e gungave nuk janë kancer. Por vetëm mjeku mund ta thotë këtë. Mos prit që të kalojë vetë.',
  },

  kontrollet: {
    title: '3. Kontrollet sipas moshës',
    intro: 'Për gra me rrezik mesatar. Intervalin e saktë e cakton mjeku yt.',
    tableHead: ['Mosha', 'Çfarë bën'],
    rows: [
      { age: '20–39', text: 'Vetëkontroll mujor. Pyet gjinekologun për gjoksin në vizitat e rregullta.' },
      { age: '40–49', text: 'Fillo mamografinë. Zakonisht çdo 1–2 vjet, sipas mjekut.' },
      { age: '50–74', text: 'Mamografi çdo 1–2 vjet. Kjo është mosha kur kontrolli ka ndikimin më të madh.' },
      { age: '75+', text: 'Vendos me mjekun nëse vazhdon, sipas gjendjes tënde shëndetësore.' },
    ] as { age: AgeRange; text: string }[],
    highRiskIntro: '**Nëse ke rrezik më të lartë**, flit me mjekun për të filluar më herët:',
    highRisk: [
      'nëna, motra ose vajza ka pasur kancer gjiri ose vezoresh',
      'ke gjoks me ind të dendur (ta thotë radiologu)',
      'ke pasur rrezatim në gjoks para moshës 30 vjeç',
    ],
    monthStep: '**Hapi i këtij muaji:** nëse je 40+ dhe nuk ke bërë mamografi këtë vit ose vitin e kaluar, telefono sot mjekun e familjes ose qendrën shëndetësore dhe pyet ku mund ta bësh.',
  },

  zakonet: {
    title: '4. Zakonet që kanë rëndësi',
    intro: 'Nuk ka asnjë ushqim, çaj apo suplement që e parandalon kancerin e gjirit. Por disa zakone e ulin rrezikun, dhe të gjitha të bëjnë të ndihesh më mirë çdo ditë.',
    habits: [
      { title: 'Lëviz.', text: '150–300 minuta aktivitet të moderuar në javë. Kjo do të thotë 30 minuta ecje të shpejtë, 5 ditë në javë. Nuk ka nevojë për palestër.' },
      { title: 'Alkooli: sa më pak, aq më mirë.', text: 'Rreziku rritet me sasinë, dhe asnjë sasi nuk është plotësisht e sigurt. Nëse pi, jo më shumë se 1 gotë në ditë, dhe jo çdo ditë.' },
      { title: 'Një peshë e qëndrueshme me kalimin e viteve.', text: 'Sidomos pas menopauzës. Nuk bëhet fjalë për dieta, por për një ritëm që mund ta mbash.' },
      { title: 'Pa duhan.', text: 'Për gjoksin, për zemrën, për gjithçka.' },
      { title: 'Shto në pjatë, mos hiq.', text: 'Perime në çdo vakt, fibra, fruta, drithëra të plota. Nuk janë mjekim, janë baza e një trupi që ndihet mirë.' },
      { title: 'Gjidhënia', text: ', për ato që e zgjedhin dhe munden, lidhet me një rrezik pak më të ulët.' },
      { title: 'Terapitë hormonale', text: ' (kontraceptivët, terapia e menopauzës): nuk janë të ndaluara, por fol me mjekun për kohëzgjatjen dhe rrezikun personal.' },
    ],
  },

  plani: {
    title: '5. Plani i tetorit — 4 javë, 4 hapa',
    weeks: [
      { week: 1, text: 'Bëj vetëkontrollin e parë me 4 hapat. Vendos një kujtesë në telefon për çdo muaj.' },
      { week: 2, text: 'Cakto kontrollin tënd (mamografi nëse je 40+, vizitë te gjinekologu nëse je më e re).' },
      { week: 3, text: '30 minuta ecje, 5 ditë. Shëno ditët këtu.' },
      { week: 4, text: 'Dërgoja këtë udhëzues një gruaje që do: mamasë, motrës, shoqes.' },
    ],
    progress: (done: number) => `${done} nga 4 hapa`,
    complete: 'Bravo. Tani dërgoja një gruaje që do.',
  },

  shenim: {
    title: 'Shënim',
    text: 'Ky udhëzues është informues dhe nuk zëvendëson këshillën e mjekut. Produktet SoHealthy nuk parandalojnë, nuk diagnostikojnë dhe nuk trajtojnë kancerin. Për çdo ndryshim në gjoks, drejtohu te mjeku.',
  },

  // UI strings
  ui: {
    remind: 'Më kujto çdo muaj',
    remindSet: 'Kujtesa u vendos ✓',
    remindRemove: 'Hiq kujtesën',
    addCalendar: 'Shto në kalendar',
    share: 'Dërgoja një gruaje që do',
    copied: 'Linku u kopjua',
    publicCta: 'Hap aplikacionin SoHealthy',
    weekLabel: (n: number) => `Java ${n}`,
  },

  notification: {
    title: '5 minuta për veten',
    body: 'Koha për vetëkontrollin mujor. Hap udhëzuesin.',
  },

  shareText: (url: string) => `Më duket i rëndësishëm. 5 minuta lexim, për ty. 🎀 ${url}`,

  homeCard: {
    eyebrow: 'TETORI ROZË',
    title: '5 minuta për veten',
    sub: 'Kontrollet sipas moshës dhe zakonet që kanë rëndësi.',
    cta: 'Lexo udhëzuesin',
  },

  offer: {
    text: 'Gjatë gjithë tetorit, çdo paketë SoHealthy vjen me 2 Berry Bliss dhuratë.',
    cta: 'Porosit',
  },
}
