// ============================================================
// Design tokens — shared color, spacing, and type scale.
// Maps to Tailwind utility classes used across web + future iOS.
// ============================================================

import type { CampSession } from "./types"

export const colors = {
  brand: {
    50: "#eff6ff",
    100: "#dbeafe",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
  },
  surface: {
    base: "#ffffff",
    subtle: "#f8fafc",
    muted: "#f1f5f9",
    border: "#e2e8f0",
  },
  text: {
    primary: "#0f172a",
    secondary: "#475569",
    muted: "#94a3b8",
    inverse: "#ffffff",
  },
  status: {
    verified: { bg: "#ecfdf5", text: "#059669" },
    unverified: { bg: "#fefce8", text: "#ca8a04" },
    failed: { bg: "#fef2f2", text: "#dc2626" },
  },
  completeness: {
    high: { bg: "#ecfdf5", text: "#059669" },   // ≥80%
    mid: { bg: "#fefce8", text: "#ca8a04" },    // 50–79%
    low: { bg: "#fef2f2", text: "#dc2626" },    // <50%
  },
} as const

export const spacing = {
  card: "p-4",
  sheet: "p-6",
  gap: "gap-3",
} as const

export const radius = {
  card: "rounded-xl",
  button: "rounded-lg",
  badge: "rounded-full",
} as const

/** Tailwind class map for camp_type codes → accent colors. */
export const campTypeColors: Record<string, string> = {
  GEN: "bg-slate-100 text-slate-700",
  SPRTS: "bg-orange-100 text-orange-700",
  BASE: "bg-red-100 text-red-700",
  BSKT: "bg-orange-100 text-orange-700",
  SOCR: "bg-green-100 text-green-700",
  TNIS: "bg-yellow-100 text-yellow-700",
  ROW: "bg-blue-100 text-blue-700",
  VB: "bg-purple-100 text-purple-700",
  FH: "bg-green-100 text-green-700",
  MART: "bg-red-100 text-red-700",
  DANCE: "bg-pink-100 text-pink-700",
  CHESS: "bg-slate-100 text-slate-700",
  MATH: "bg-indigo-100 text-indigo-700",
  AOSP: "bg-indigo-100 text-indigo-700",
  SCI: "bg-cyan-100 text-cyan-700",
  CODE: "bg-violet-100 text-violet-700",
  ART: "bg-rose-100 text-rose-700",
  THTR: "bg-fuchsia-100 text-fuchsia-700",
  MUS: "bg-purple-100 text-purple-700",
  NAT: "bg-emerald-100 text-emerald-700",
  WRIT: "bg-amber-100 text-amber-700",
  PREP: "bg-blue-100 text-blue-700",
  REC: "bg-teal-100 text-teal-700",
}

export interface SummerWeek {
  key: string       // DB week_key, e.g. "W22" (ISO week number)
  label: string     // Sequential display alias, e.g. "Week 1"
  dates: string     // "Jun 22 – Jun 26"
  icsStart: string  // "20260622"
  icsEnd: string    // "20260627" (Saturday — exclusive end for ICS)
}

/**
 * Parse a DB week_key like "W22" → 22.
 * Returns null for unrecognised formats.
 */
export function parseWeekNum(weekKey: string): number | null {
  const m = weekKey.match(/^W(\d+)$/)
  return m ? parseInt(m[1]!, 10) : null
}

/** Return the Monday (UTC) of ISO week `week` in `year`. */
function isoWeekMonday(year: number, week: number): Date {
  // Jan 4 is always in ISO week 1 (by definition of ISO 8601)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() || 7   // Mon=1 … Sun=7
  const mon1 = new Date(jan4)
  mon1.setUTCDate(jan4.getUTCDate() - (dow - 1))
  const target = new Date(mon1)
  target.setUTCDate(mon1.getUTCDate() + (week - 1) * 7)
  return target
}

const MONTH_ABR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const

function fmtDate(d: Date): string {
  return `${MONTH_ABR[d.getUTCMonth()]} ${d.getUTCDate()}`
}

function icsDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}${m}${day}`
}

/**
 * Derive SummerWeek entries from loaded camp data.
 *
 * - Uses the actual `week_key` values from the DB (e.g. "W22", "W25")
 * - Sorts ascending by ISO week number
 * - Assigns sequential display labels: "Week 1", "Week 2", …
 * - Computes exact Mon–Fri dates and ICS stamps from the ISO week + year
 *
 * This makes the Plan tab robust across years — no hardcoded date tables.
 */
export function deriveSummerWeeks(camps: CampSession[]): SummerWeek[] {
  // Collect unique non-empty week keys
  const keySet = new Set<string>()
  for (const c of camps) {
    if (c.week_key) keySet.add(c.week_key)
  }

  // Sort numerically by ISO week number; fall back to lexical
  const keys = [...keySet].sort((a, b) => {
    const na = parseWeekNum(a) ?? 9999
    const nb = parseWeekNum(b) ?? 9999
    return na !== nb ? na - nb : a.localeCompare(b)
  })

  return keys.map((key, i) => {
    const weekNum = parseWeekNum(key)
    // Use the year from the first camp with this week_key
    const year = camps.find((c) => c.week_key === key)?.year ?? new Date().getUTCFullYear()

    if (weekNum !== null) {
      const mon = isoWeekMonday(year, weekNum)
      const fri = new Date(mon); fri.setUTCDate(mon.getUTCDate() + 4)
      const sat = new Date(mon); sat.setUTCDate(mon.getUTCDate() + 5) // ICS end is exclusive
      return {
        key,
        label: `Week ${i + 1}`,
        dates: `${fmtDate(mon)} – ${fmtDate(fri)}`,
        icsStart: icsDate(mon),
        icsEnd: icsDate(sat),
      }
    }

    // Unrecognised key format — fall back to the camp's own date range string
    const fallbackDates = camps.find((c) => c.week_key === key)?.week_date_range ?? ""
    return { key, label: `Week ${i + 1}`, dates: fallbackDates, icsStart: "", icsEnd: "" }
  })
}

/**
 * Hardcoded 2026 weeks — kept for unit tests and backward compatibility.
 * Prefer deriveSummerWeeks(camps) in application code.
 */
export const SUMMER_WEEKS: SummerWeek[] = [
  { key: "W01", label: "Week 1", dates: "Jun 22 – Jun 26", icsStart: "20260622", icsEnd: "20260627" },
  { key: "W02", label: "Week 2", dates: "Jun 29 – Jul 3",  icsStart: "20260629", icsEnd: "20260704" },
  { key: "W03", label: "Week 3", dates: "Jul 7 – Jul 11",  icsStart: "20260707", icsEnd: "20260712" },
  { key: "W04", label: "Week 4", dates: "Jul 14 – Jul 18", icsStart: "20260714", icsEnd: "20260719" },
  { key: "W05", label: "Week 5", dates: "Jul 21 – Jul 25", icsStart: "20260721", icsEnd: "20260726" },
  { key: "W06", label: "Week 6", dates: "Jul 28 – Aug 1",  icsStart: "20260728", icsEnd: "20260802" },
  { key: "W07", label: "Week 7", dates: "Aug 4 – Aug 8",   icsStart: "20260804", icsEnd: "20260809" },
  { key: "W08", label: "Week 8", dates: "Aug 11 – Aug 15", icsStart: "20260811", icsEnd: "20260816" },
  { key: "W09", label: "Week 9", dates: "Aug 17 – Aug 21", icsStart: "20260817", icsEnd: "20260822" },
]

