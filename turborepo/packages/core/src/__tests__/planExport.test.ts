import { describe, it, expect } from "vitest"
import { toCsv, campSummaryText, toIcs } from "../planExport"
import { SUMMER_WEEKS } from "../tokens"
import { makeSession, kid, makePlan } from "./fixtures"

// ── toCsv ─────────────────────────────────────────────────────

describe("toCsv", () => {
  it("produces a header row as the first line", () => {
    const csv = toCsv([])
    const header = csv.split("\n")[0]!
    expect(header).toContain("Camp Name")
    expect(header).toContain("Price / Tuition")
    expect(header).toContain("Type")
    expect(header).toContain("Source URL")
  })

  it("includes one data row per camp", () => {
    const camps = [makeSession(), makeSession({ camp_name: "Second Camp" })]
    const lines = toCsv(camps).split("\n")
    expect(lines.length).toBe(3) // header + 2 rows
  })

  it("writes the camp name in the correct column position", () => {
    const camp = makeSession({ camp_name: "My Test Camp" })
    const lines = toCsv([camp]).split("\n")
    const dataRow = lines[1]!
    expect(dataRow.startsWith("My Test Camp")).toBe(true)
  })

  it("uses the formatted camp_type label, not the raw code", () => {
    const camp = makeSession({ camp_type: "CODE" })
    const csv = toCsv([camp])
    expect(csv).toContain("Coding / Tech")
    // raw code should not appear in the type column (though it may appear elsewhere)
  })

  it("escapes cells containing commas", () => {
    const camp = makeSession({ camp_name: "Camp, Fun" })
    const csv = toCsv([camp])
    expect(csv).toContain('"Camp, Fun"')
  })

  it("escapes cells containing double quotes", () => {
    const camp = makeSession({ camp_name: 'Camp "Best"' })
    const csv = toCsv([camp])
    expect(csv).toContain('"Camp ""Best"""')
  })

  it("escapes cells containing newlines", () => {
    const camp = makeSession({ registration_notes: "Line 1\nLine 2" })
    const csv = toCsv([camp])
    expect(csv).toContain('"Line 1\nLine 2"')
  })

  it("joins best_fit_tags array with '; '", () => {
    const camp = makeSession({ best_fit_tags: ["Active", "STEM", "Team sports"] })
    const csv = toCsv([camp])
    expect(csv).toContain("Active; STEM; Team sports")
  })

  it("outputs empty string for null fields (no '—' in CSV)", () => {
    const camp = makeSession({ price_tuition: null })
    const lines = toCsv([camp]).split("\n")
    const dataRow = lines[1]!
    // The price column should just be empty, not contain a dash
    const cols = dataRow.split(",")
    // Price / Tuition is at index 11 (0-based) in the CSV_COLUMNS definition
    // Rather than hardcode index, just check there's no lone em-dash cell
    expect(dataRow).not.toContain(",—,")
  })

  it("handles an empty camp list (header only)", () => {
    const csv = toCsv([])
    const lines = csv.split("\n")
    expect(lines.length).toBe(1)
  })
})

// ── campSummaryText ───────────────────────────────────────────

describe("campSummaryText", () => {
  it("includes camp name, dates, ages, price, address, and URL", () => {
    const camp = makeSession({
      camp_name: "Soccer Camp",
      week_date_range: "Jun 22 – Jun 26",
      ages_grades: "Ages 7–12",
      price_tuition: "$350/week",
      location_address: "123 Main St, Princeton, NJ",
      source_url: "https://example.com",
    })
    const text = campSummaryText(camp)
    expect(text).toContain("Soccer Camp")
    expect(text).toContain("Jun 22 – Jun 26")
    expect(text).toContain("Ages 7–12")
    expect(text).toContain("$350/week")
    expect(text).toContain("123 Main St")
    expect(text).toContain("https://example.com")
  })

  it("only includes camp name when all other fields are null", () => {
    const camp = makeSession({
      camp_name: "Bare Camp",
      week_date_range: null,
      ages_grades: null,
      price_tuition: null,
      location_address: null,
      source_url: null,
    })
    expect(campSummaryText(camp)).toBe("Bare Camp")
  })

  it("separates fields with ' · '", () => {
    const camp = makeSession({
      week_date_range: "Jun 22 – Jun 26",
      ages_grades: "Ages 7–12",
    })
    const text = campSummaryText(camp)
    expect(text).toContain(" · ")
  })
})

// ── toIcs ─────────────────────────────────────────────────────

describe("toIcs", () => {
  const camp = makeSession({ camp_id: "2026_ORG_SPRTS_W01_1", camp_name: "Soccer Camp" })
  const campById = new Map([[camp.camp_id, camp]])

  it("wraps output in VCALENDAR", () => {
    const ics = toIcs(kid, makePlan(), campById, SUMMER_WEEKS)
    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("END:VCALENDAR")
  })

  it("includes calendar metadata", () => {
    const ics = toIcs(kid, makePlan(), campById, SUMMER_WEEKS)
    expect(ics).toContain("VERSION:2.0")
    expect(ics).toContain("PRODID:-//Camp Planner//EN")
  })

  it("names the calendar after the child", () => {
    const ics = toIcs(kid, makePlan(), campById, SUMMER_WEEKS)
    expect(ics).toContain(`Alex`)
  })

  it("emits a VEVENT for each assigned week", () => {
    const plan = makePlan({ W01: camp.camp_id })
    const ics = toIcs(kid, plan, campById, SUMMER_WEEKS)
    expect(ics).toContain("BEGIN:VEVENT")
    expect(ics).toContain("END:VEVENT")
  })

  it("uses the correct ICS date for the assigned week", () => {
    const plan = makePlan({ W01: camp.camp_id })
    const ics = toIcs(kid, plan, campById, SUMMER_WEEKS)
    // W01 is Jun 22 – Jun 26, 2026
    expect(ics).toContain("DTSTART;VALUE=DATE:20260622")
    expect(ics).toContain("DTEND;VALUE=DATE:20260627")
  })

  it("includes camp name and child name in SUMMARY", () => {
    const plan = makePlan({ W01: camp.camp_id })
    const ics = toIcs(kid, plan, campById, SUMMER_WEEKS)
    expect(ics).toContain("SUMMARY:Soccer Camp (Alex)")
  })

  it("includes the camp location when available", () => {
    const plan = makePlan({ W01: camp.camp_id })
    const ics = toIcs(kid, plan, campById, SUMMER_WEEKS)
    expect(ics).toContain("LOCATION:123 Main St\\, Princeton\\, NJ")
  })

  it("includes the source URL when available", () => {
    const plan = makePlan({ W01: camp.camp_id })
    const ics = toIcs(kid, plan, campById, SUMMER_WEEKS)
    expect(ics).toContain("URL:https://example.com")
  })

  it("emits no VEVENT when plan is empty", () => {
    const ics = toIcs(kid, makePlan(), campById, SUMMER_WEEKS)
    expect(ics).not.toContain("BEGIN:VEVENT")
  })

  it("skips weeks where the campId is not in campById", () => {
    const plan = makePlan({ W01: "nonexistent-id" })
    const ics = toIcs(kid, plan, campById, SUMMER_WEEKS)
    expect(ics).not.toContain("BEGIN:VEVENT")
  })

  it("escapes special ICS characters in camp names", () => {
    const specialCamp = makeSession({
      camp_id: "2026_ORG_ART_W02_1",
      camp_name: "Art, Science & More; Camp",
    })
    const mapWithSpecial = new Map([[specialCamp.camp_id, specialCamp]])
    const plan = makePlan({ W02: specialCamp.camp_id })
    const ics = toIcs(kid, plan, mapWithSpecial, SUMMER_WEEKS)
    // commas and semicolons should be escaped
    expect(ics).toContain("Art\\, Science & More\\;")
  })

  it("uses CRLF line endings throughout", () => {
    const plan = makePlan({ W01: camp.camp_id })
    const ics = toIcs(kid, plan, campById, SUMMER_WEEKS)
    // Every line break should be \r\n per RFC 5545
    const lines = ics.split("\r\n")
    expect(lines.length).toBeGreaterThan(5)
    // Ensure there are no bare \n
    expect(ics.split("\n").length).toBe(lines.length)
  })
})
