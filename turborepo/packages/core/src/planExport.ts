// ============================================================
// Export utilities — CSV and ICS calendar exports.
// ============================================================

import type { CampSession, KidProfile, ChildPlan } from "./types"
import { formatCampType, formatCare, formatPrice, formatDateRange } from "./format"
import type { SummerWeek } from "./tokens"

// ── CSV ──────────────────────────────────────────────────────

const CSV_COLUMNS: Array<{ header: string; key: keyof CampSession | "camp_type_label" }> = [
  { header: "Camp Name", key: "camp_name" },
  { header: "Year", key: "year" },
  { header: "Week", key: "week_date_range" },
  { header: "Type", key: "camp_type_label" },
  { header: "Ages / Grades", key: "ages_grades" },
  { header: "Address", key: "location_address" },
  { header: "Distance (Princeton)", key: "distance_from_princeton" },
  { header: "Daily Start", key: "daily_start_time" },
  { header: "Daily End", key: "daily_end_time" },
  { header: "Before Care", key: "before_care" },
  { header: "After Care", key: "after_care" },
  { header: "Price / Tuition", key: "price_tuition" },
  { header: "Registration Fee", key: "registration_fee" },
  { header: "Activity", key: "weekly_activity" },
  { header: "Skill Level", key: "skill_level" },
  { header: "Meals Included", key: "meals_included" },
  { header: "Indoor / Outdoor", key: "indoor_outdoor" },
  { header: "Reg. Start", key: "registration_start_date" },
  { header: "Reg. Deadline", key: "registration_deadlines" },
  { header: "Cancellation", key: "cancellation_refund_notes" },
  { header: "Verification", key: "verification_status" },
  { header: "Best Fit Tags", key: "best_fit_tags" },
  { header: "Registration Notes", key: "registration_notes" },
  { header: "Source URL", key: "source_url" },
  { header: "Completeness %", key: "completeness_pct" },
]

function escapeCell(val: unknown): string {
  if (val === null || val === undefined) return ""
  const str = Array.isArray(val) ? val.join("; ") : String(val)
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Convert an array of camp sessions to a CSV string. */
export function toCsv(camps: CampSession[]): string {
  const header = CSV_COLUMNS.map((c) => escapeCell(c.header)).join(",")
  const rows = camps.map((camp) =>
    CSV_COLUMNS.map(({ key }) => {
      if (key === "camp_type_label") return escapeCell(formatCampType(camp.camp_type))
      return escapeCell(camp[key as keyof CampSession])
    }).join(","),
  )
  return [header, ...rows].join("\n")
}

/** Trigger a CSV download in the browser. */
export function downloadCsv(camps: CampSession[], filename = "camp-planner-export.csv"): void {
  const csv = toCsv(camps)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// ── ICS calendar export ──────────────────────────────────────

function escapeIcs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

function nowStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

/**
 * Build an ICS calendar string for one child's plan.
 * Each assigned week becomes a VEVENT spanning Mon–Fri.
 *
 * @param weeks - Derived week list from deriveSummerWeeks(). Drives which
 *   weeks appear in the calendar and what dates each one gets.
 */
export function toIcs(
  child: KidProfile,
  plan: ChildPlan,
  campById: Map<string, CampSession>,
  weeks: SummerWeek[],
): string {
  const dtstamp = nowStamp()

  const events = weeks
    .filter((week) => {
      const campId = plan[week.key]
      return !!campId && campById.has(campId)
    })
    .map((week) => {
      const campId = plan[week.key]!
      const camp = campById.get(campId)!
      const summary = escapeIcs(camp.camp_name)
      const location = camp.location_address ? escapeIcs(camp.location_address) : ""
      const url = camp.source_url ?? ""
      const desc = escapeIcs(
        `${week.label} ${week.dates} · ${formatCampType(camp.camp_type)}` +
        (camp.ages_grades ? ` · Ages: ${camp.ages_grades}` : "") +
        (camp.price_tuition ? ` · ${formatPrice(camp.price_tuition)}` : ""),
      )
      return [
        "BEGIN:VEVENT",
        `UID:${camp.camp_id}-${child.id}@camp-planner`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${week.icsStart}`,
        `DTEND;VALUE=DATE:${week.icsEnd}`,
        `SUMMARY:${summary} (${escapeIcs(child.name)})`,
        location ? `LOCATION:${location}` : null,
        url ? `URL:${url}` : null,
        `DESCRIPTION:${desc}`,
        "END:VEVENT",
      ].filter(Boolean).join("\r\n")
    })

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Camp Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(child.name)}'s Summer 2026`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n")
}

/** Trigger an .ics calendar download in the browser. */
export function downloadIcs(icsString: string, filename: string): void {
  const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// ── Summary text for sharing / clipboard ─────────────────────

/** Build a shareable plain-text summary of a camp session. */
export function campSummaryText(camp: CampSession): string {
  const parts: string[] = [camp.camp_name]
  if (camp.week_date_range) parts.push(formatDateRange(camp.week_date_range))
  if (camp.ages_grades) parts.push(`Ages: ${camp.ages_grades}`)
  if (camp.price_tuition) parts.push(formatPrice(camp.price_tuition))
  if (camp.location_address) parts.push(camp.location_address)
  if (camp.source_url) parts.push(camp.source_url)
  return parts.join(" · ")
}
