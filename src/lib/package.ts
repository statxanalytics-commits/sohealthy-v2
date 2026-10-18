import { supabase } from './supabase'

// What the signed-in user's package includes (Supabase my_package()).
//   deliverable: 'diet' | 'tips' | 'none' once decided; null = questionnaire not filled yet
//   7-day packages: 'none' · 14-day: 'tips' · 28-day: 'diet' (28 days, or 14 each when shared by 2 people)
//   Orders from before the new packages keep the 14-day diet.
export type Deliverable = 'diet' | 'tips' | 'none' | null

//   Premium (orders from 20 Oct 2026) = package days + 2 in calendar days (Tirana), activation day = day 1:
//   7-day → through day 9 · 14-day → day 16 · 28-day → day 30 (shared by 2 → 16 each).
//   Older orders: as before, 14 × 24 h from the activation time.
//   The plan / tips of the current order stay readable after premium ends (has_plan); a new activation
//   switches the account to the new order, so the old plan is no longer shown.
export type MyPackage = {
  order_code: string | null
  model: 'new' | 'legacy' | null
  deliverable: Deliverable
  diet_days: number | null
  supply_days: number
  premium_days: number
  persons: number
  seat: 1 | 2 | null
  premium_active: boolean | null   // null = unknown (server call failed)
  premium_until: string | null     // last premium day, YYYY-MM-DD
  days_left: number | null         // including today; null = no end date (very old accounts)
  has_plan: boolean
}

export const DEFAULT_PACKAGE: MyPackage = {
  order_code: null, model: null, deliverable: null, diet_days: null,
  supply_days: 14, premium_days: 14, persons: 1, seat: null,
  premium_active: null, premium_until: null, days_left: null, has_plan: false,
}

export async function fetchMyPackage(): Promise<MyPackage> {
  try {
    const { data, error } = await supabase.rpc('my_package')
    if (error || !data) return DEFAULT_PACKAGE
    return { ...DEFAULT_PACKAGE, ...(data as Partial<MyPackage>) }
  } catch {
    return DEFAULT_PACKAGE
  }
}

export type DailyTip = {
  id: string
  day: number
  scheduled_date: string
  slot: 'morning' | 'midday' | 'evening'
  category: string
  title: string
  body: string
  detail: string
  seen_at: string | null
}

// The user's own tips for this order (RLS returns only their rows, flagged tips excluded)
export async function fetchTips(orderCode: string): Promise<DailyTip[]> {
  try {
    const { data } = await supabase
      .from('daily_tips')
      .select('id, day, scheduled_date, slot, category, title, body, detail, seen_at')
      .eq('order_code', orderCode)
      .order('day', { ascending: true })
    return (data as DailyTip[]) || []
  } catch {
    return []
  }
}

export async function markTipSeen(id: string) {
  try { await supabase.rpc('mark_tip_seen', { tip_id: id }) } catch {}
}

// Local calendar date as YYYY-MM-DD (customers are in Albania; tips are scheduled by Tirana date)
export function localDate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const WEEKDAYS = ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë']
export function weekdayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return WEEKDAYS[new Date(y, m - 1, d).getDay()]
}

// Today's tip, if the package has one for today
export function todaysTip(tips: DailyTip[], today = localDate()): DailyTip | null {
  return tips.find(t => t.scheduled_date === today) || null
}
