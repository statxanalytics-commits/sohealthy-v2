// Tetori Rozë (Pink October 2026) — campaign window + overrides.
// IMPORTANT: this file must not import from src/constants (constants imports it).

export const TETORI_ROZE = {
  start: '2026-10-01T00:00:00+02:00', // Europe/Tirane (CEST)
  end: '2026-11-01T00:00:00+01:00',   // DST ends 25 Oct → CET (UTC+1)
  requiresPremium: false,             // the guide is free for everyone
}

// Public share URL for the guide.
export const TETORI_ROZE_URL = 'https://app.sohealthy.al/tetori-roze'

// Instagram is the existing order path (same as the lifecycle "reorder" pushes).
export const ORDER_URL = 'https://www.instagram.com/sohealthy.al/'

type Override = 'roze' | 'default' | null

function readWebParam(name: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.location) return null
    return new URLSearchParams(window.location.search).get(name)
  } catch {
    return null
  }
}

// Testing overrides:
//  • web:    ?theme=roze  /  ?theme=default   (also ?now=2026-11-01T00:00:00+01:00 to mock the date)
//  • native: EXPO_PUBLIC_THEME=roze|default and EXPO_PUBLIC_TR_NOW=<ISO date>  (dev builds only)
function themeOverride(): Override {
  const web = readWebParam('theme')
  if (web === 'roze' || web === 'default') return web
  if (__DEV__) {
    const env = process.env.EXPO_PUBLIC_THEME
    if (env === 'roze' || env === 'default') return env
  }
  return null
}

// Overrides are read once at launch (the web query string is gone after the first navigation).
const THEME_OVERRIDE: Override = themeOverride()
const NOW_OFFSET_MS: number = (() => {
  const raw = readWebParam('now') || (__DEV__ ? process.env.EXPO_PUBLIC_TR_NOW : undefined)
  if (!raw) return 0
  const d = new Date(raw)
  return isNaN(d.getTime()) ? 0 : d.getTime() - Date.now()
})()

export function campaignNow(): Date {
  return new Date(Date.now() + NOW_OFFSET_MS)
}

// True between 1 Oct 00:00 and 1 Nov 00:00 (Tirana time). Drives the offer banner and the Home card slot.
export function isTetoriRozeLive(now: Date = campaignNow()): boolean {
  const t = now.getTime()
  return t >= new Date(TETORI_ROZE.start).getTime() && t < new Date(TETORI_ROZE.end).getTime()
}

// Whether the pink theme is on. Evaluated once at app launch (see src/constants Colors),
// so the theme reverts on the first launch after 1 Nov.
export function isRozeThemeActive(): boolean {
  const o = THEME_OVERRIDE
  if (o === 'roze') return true
  if (o === 'default') return false
  return isTetoriRozeLive()
}
