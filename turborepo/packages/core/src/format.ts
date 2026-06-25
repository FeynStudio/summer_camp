// ============================================================
// Display formatters — pure functions, no React deps.
// ============================================================

import { CAMP_TYPES } from "./types"

/** Format a camp_type code to a human-readable label. */
export function formatCampType(code: string | null | undefined): string {
  if (!code) return "—"
  return CAMP_TYPES[code] ?? code
}

/** Format a price string for display — strip redundant text. */
export function formatPrice(price: string | null | undefined): string {
  if (!price) return "—"
  if (price.toLowerCase().startsWith("not posted")) return "Not posted"
  return price
}

/**
 * Parse a price/tuition string to a numeric dollar value.
 * Returns null if the string cannot be parsed.
 * e.g. "$350/week" → 350, "$1,200" → 1200, "350" → 350
 */
export function parsePriceNum(price: string | null | undefined): number | null {
  if (!price) return null
  if (price.toLowerCase().startsWith("not posted")) return null
  const cleaned = price.replace(/[$,]/g, "")
  const match = cleaned.match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  return parseFloat(match[1]!)
}

/** Format time for display: "9:00 AM" */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "—"
  if (time.toLowerCase().startsWith("not posted")) return "Not posted"
  return time
}

/** Short date display from ISO string: "Jun 24" */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return iso
  }
}

/** Full date range display: "Jun 23 – Jun 27" */
export function formatDateRange(range: string | null | undefined): string {
  if (!range) return "—"
  if (range.toLowerCase().startsWith("not posted")) return "Not posted"
  return range
}

/** Format distance for display. */
export function formatDistance(dist: string | null | undefined): string {
  if (!dist) return "—"
  if (dist.toLowerCase().startsWith("not posted")) return "—"
  return dist
}

/** Parse a distance string to a numeric miles value for sorting/RadialMap. */
export function parseDistanceMiles(dist: string | null | undefined): number | null {
  if (!dist) return null
  const match = dist.match(/([\d.]+)\s*mi/)
  if (match) return parseFloat(match[1]!)
  const km = dist.match(/([\d.]+)\s*km/)
  if (km) return parseFloat(km[1]!) * 0.621371
  return null
}

/** Truncate long text for card display. */
export function truncate(text: string | null | undefined, maxLen = 80): string {
  if (!text) return "—"
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text
}

/** Format a yes/no/unknown care value. */
export function formatCare(care: string | null | undefined): string {
  if (!care) return "—"
  const lower = care.toLowerCase()
  if (lower.startsWith("yes")) return "Yes"
  if (lower.startsWith("no")) return "No"
  if (lower.startsWith("not posted")) return "—"
  return care
}

/** Return Tailwind classes for a completeness percentage. */
export function completenessColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-100 text-emerald-700"
  if (pct >= 50) return "bg-yellow-100 text-yellow-700"
  return "bg-red-100 text-red-700"
}
