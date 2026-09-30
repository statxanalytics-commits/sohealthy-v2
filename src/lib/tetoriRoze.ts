// Tetori Rozë — plan progress, monthly self-check reminder, share.
import { Platform, Share } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { supabase } from './supabase'
import { TR } from '../content/tetoriRoze'
import { TETORI_ROZE_URL } from '../campaigns/tetoriRoze'

// ─── Plan (Java 1–4) ─────────────────────────────────────────────────────────
// Stored on-device, keyed per user, so two accounts on one phone don't share progress.
const PLAN_KEY = 'tr_plan_v1:'

async function planKey(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return PLAN_KEY + (session?.user?.id ?? 'anon')
  } catch {
    return PLAN_KEY + 'anon'
  }
}

export async function loadPlan(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(await planKey())
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((n) => [1, 2, 3, 4].includes(n)) : []
  } catch {
    return []
  }
}

export async function savePlan(weeks: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(await planKey(), JSON.stringify(weeks))
  } catch {}
}

// ─── Monthly reminder ────────────────────────────────────────────────────────
// This is the USER's reminder: it keeps firing after October until they remove it.
const REMINDER_KEY = 'tr_reminder_v1'
export type ReminderState = { method: 'push' | 'ics'; id?: string } | null
export type ReminderResult = 'scheduled' | 'ics' | 'denied' | 'unavailable'

export async function loadReminder(): Promise<ReminderState> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_KEY)
    if (!raw) return null
    const st = JSON.parse(raw) as ReminderState
    // If the OS dropped the scheduled notification (reinstall, permissions), treat it as not set.
    if (st?.method === 'push' && st.id && Platform.OS !== 'web') {
      const all = await Notifications.getAllScheduledNotificationsAsync()
      if (!all.some((n) => n.identifier === st.id)) return null
    }
    return st
  } catch {
    return null
  }
}

export async function setMonthlyReminder(): Promise<ReminderResult> {
  if (Platform.OS === 'web') {
    return downloadIcs() ? 'ics' : 'unavailable'
  }
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SoHealthy',
        importance: Notifications.AndroidImportance.HIGH,
      })
    }
    const { status: existing } = await Notifications.getPermissionsAsync()
    let status = existing
    if (existing !== 'granted') status = (await Notifications.requestPermissionsAsync()).status
    if (status !== 'granted') return 'denied'

    await cancelMonthlyReminder()
    // Same day of the month as today, 10:00 local. Capped at 28 so it fires in February too.
    const day = Math.min(new Date().getDate(), 28)
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: TR.notification.title,
        body: TR.notification.body,
        data: { type: 'tr_selfcheck', route: '/tetori-roze?section=njihe&source=push' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day,
        hour: 10,
        minute: 0,
        ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
      },
    })
    await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify({ method: 'push', id }))
    return 'scheduled'
  } catch (e) {
    console.log('[tetoriRoze] reminder error', e)
    return 'unavailable'
  }
}

export async function cancelMonthlyReminder(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_KEY)
    const st = raw ? (JSON.parse(raw) as ReminderState) : null
    if (st?.method === 'push' && st.id && Platform.OS !== 'web') {
      await Notifications.cancelScheduledNotificationAsync(st.id)
    }
    await AsyncStorage.removeItem(REMINDER_KEY)
  } catch {}
}

// Web fallback: a monthly repeating calendar event (.ics).
function downloadIcs(): boolean {
  try {
    if (typeof document === 'undefined') return false
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(Math.min(d.getDate(), 28))}`
    const stamp = d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const esc = (s: string) => s.replace(/[\\,;]/g, (m) => '\\' + m)
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SoHealthy//Tetori Roze//SQ',
      'BEGIN:VEVENT',
      `UID:tetori-roze-${stamp}@sohealthy.al`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${date}T100000`,
      'DURATION:PT15M',
      'RRULE:FREQ=MONTHLY',
      `SUMMARY:${esc(TR.notification.title)}`,
      `DESCRIPTION:${esc(TR.notification.body)} ${TETORI_ROZE_URL}`,
      `URL:${TETORI_ROZE_URL}`,
      'BEGIN:VALARM',
      'TRIGGER:PT0M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(TR.notification.title)}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'tetori-roze-kujtesa.ics'
    document.body.appendChild(a)
    a.click()
    a.remove()
    AsyncStorage.setItem(REMINDER_KEY, JSON.stringify({ method: 'ics' })).catch(() => {})
    return true
  } catch {
    return false
  }
}

// ─── Share ───────────────────────────────────────────────────────────────────
export async function shareGuide(): Promise<'shared' | 'copied' | 'failed'> {
  const message = TR.shareText(TETORI_ROZE_URL)
  if (Platform.OS === 'web') {
    try {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null
      if (nav?.share) {
        await nav.share({ text: message })
        return 'shared'
      }
      await nav?.clipboard?.writeText(message)
      return 'copied'
    } catch {
      return 'failed'
    }
  }
  try {
    await Share.share({ message })
    return 'shared'
  } catch {
    return 'failed'
  }
}
