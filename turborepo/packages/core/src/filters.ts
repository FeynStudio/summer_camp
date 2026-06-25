// ============================================================
// Filter logic — pure functions, no React/Next deps.
// ============================================================

import type { CampSession, CampFilters } from "./types"

/** Return true if the camp matches all active filters. */
export function matchesFilters(camp: CampSession, filters: CampFilters): boolean {
  // Search — matches name, org, activity, address
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase()
    const haystack = [
      camp.camp_name,
      camp.weekly_activity,
      camp.location_address,
      camp.camp_type,
      camp.ages_grades,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    if (!haystack.includes(q)) return false
  }

  // Year
  if (filters.year && camp.year !== filters.year) return false

  // Camp types
  if (filters.campTypes.length > 0) {
    if (!camp.camp_type || !filters.campTypes.includes(camp.camp_type)) return false
  }

  // Best fit tags
  if (filters.bestFitTags.length > 0) {
    const tags = camp.best_fit_tags ?? []
    if (!filters.bestFitTags.some((t) => tags.includes(t))) return false
  }

  // Before / after care
  if (filters.hasBeforeCare) {
    const val = (camp.before_care ?? "").toLowerCase()
    if (!val.includes("yes") && !val.includes("avail")) return false
  }
  if (filters.hasAfterCare) {
    const val = (camp.after_care ?? "").toLowerCase()
    if (!val.includes("yes") && !val.includes("avail")) return false
  }

  // Indoor / outdoor
  if (filters.indoorOutdoor) {
    const val = (camp.indoor_outdoor ?? "").toLowerCase()
    if (!val.includes(filters.indoorOutdoor.toLowerCase())) return false
  }

  // Verified only
  if (filters.verifiedOnly) {
    const v = (camp.verification_status ?? "").toLowerCase()
    if (!v.includes("verified") && !v.includes("confirmed")) return false
  }

  return true
}

/** Sort camps by a given key. */
export type SortKey = "camp_name" | "week_date_range" | "price_tuition" | "completeness_pct" | "distance_from_princeton"

export function sortCamps(
  camps: CampSession[],
  key: SortKey,
  dir: "asc" | "desc" = "asc",
): CampSession[] {
  return [...camps].sort((a, b) => {
    if (key === "completeness_pct") {
      const diff = (a.completeness_pct ?? 0) - (b.completeness_pct ?? 0)
      return dir === "asc" ? diff : -diff
    }
    const av = a[key] ?? ""
    const bv = b[key] ?? ""
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return dir === "asc" ? cmp : -cmp
  })
}

/** Collect all unique best_fit_tags across a camp list. */
export function allTags(camps: CampSession[]): string[] {
  const set = new Set<string>()
  for (const c of camps) {
    for (const t of c.best_fit_tags ?? []) set.add(t)
  }
  return [...set].sort()
}

/** Collect all unique years across a camp list. */
export function allYears(camps: CampSession[]): number[] {
  return [...new Set(camps.map((c) => c.year))].sort((a, b) => b - a)
}
