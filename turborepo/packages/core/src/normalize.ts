// ============================================================
// Data normalization — cleans raw DB rows before use in the UI.
// ============================================================

import type { CampSession } from "./types"

/** Replace "Not posted publicly" placeholder values with null. */
function clean(val: string | null | undefined): string | null {
  if (!val) return null
  if (val.trim().toLowerCase().startsWith("not posted")) return null
  return val.trim() || null
}

/** Normalize a raw best_camp_sessions row for UI display. */
export function normalizeSession(raw: CampSession): CampSession {
  return {
    ...raw,
    week_date_range: clean(raw.week_date_range),
    individual_week: clean(raw.individual_week),
    location_address: clean(raw.location_address),
    source_url: clean(raw.source_url),
    distance_from_princeton: clean(raw.distance_from_princeton),
    ages_grades: clean(raw.ages_grades),
    daily_start_time: clean(raw.daily_start_time),
    daily_end_time: clean(raw.daily_end_time),
    before_care: clean(raw.before_care),
    after_care: clean(raw.after_care),
    price_tuition: clean(raw.price_tuition),
    registration_fee: clean(raw.registration_fee),
    camp_type: clean(raw.camp_type),
    weekly_activity: clean(raw.weekly_activity),
    skill_level: clean(raw.skill_level),
    meals_included: clean(raw.meals_included),
    indoor_outdoor: clean(raw.indoor_outdoor),
    registration_start_date: clean(raw.registration_start_date),
    registration_deadlines: clean(raw.registration_deadlines),
    cancellation_refund_notes: clean(raw.cancellation_refund_notes),
    verification_status: clean(raw.verification_status),
    source_type_date_checked: clean(raw.source_type_date_checked),
    registration_notes: clean(raw.registration_notes),
    best_fit_tags: raw.best_fit_tags?.filter(Boolean) ?? null,
  }
}

/** Normalize an array of sessions. */
export function normalizeSessions(rows: CampSession[]): CampSession[] {
  return rows.map(normalizeSession)
}
