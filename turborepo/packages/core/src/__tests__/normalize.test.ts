import { describe, it, expect } from "vitest"
import { normalizeSession, normalizeSessions } from "../normalize"
import { makeSession } from "./fixtures"

const NOT_POSTED = "Not posted publicly"

// ── normalizeSession ──────────────────────────────────────────

describe("normalizeSession", () => {
  it("replaces 'Not posted publicly' with null on string fields", () => {
    const raw = makeSession({
      price_tuition: NOT_POSTED,
      location_address: "Not posted publicly – confirmed via website",
      before_care: NOT_POSTED,
      after_care: NOT_POSTED,
      indoor_outdoor: NOT_POSTED,
      verification_status: NOT_POSTED,
    })
    const result = normalizeSession(raw)
    expect(result.price_tuition).toBeNull()
    expect(result.location_address).toBeNull()
    expect(result.before_care).toBeNull()
    expect(result.after_care).toBeNull()
    expect(result.indoor_outdoor).toBeNull()
    expect(result.verification_status).toBeNull()
  })

  it("is case-insensitive when detecting placeholder text", () => {
    const raw = makeSession({ price_tuition: "NOT POSTED PUBLICLY" })
    expect(normalizeSession(raw).price_tuition).toBeNull()
  })

  it("trims leading/trailing whitespace from string fields", () => {
    const raw = makeSession({ location_address: "  123 Main St  " })
    expect(normalizeSession(raw).location_address).toBe("123 Main St")
  })

  it("converts empty-string fields to null", () => {
    const raw = makeSession({ weekly_activity: "" })
    expect(normalizeSession(raw).weekly_activity).toBeNull()
  })

  it("passes through null fields unchanged", () => {
    const raw = makeSession({ individual_week: null })
    expect(normalizeSession(raw).individual_week).toBeNull()
  })

  it("keeps valid string values unchanged", () => {
    const raw = makeSession({ price_tuition: "$350/week" })
    expect(normalizeSession(raw).price_tuition).toBe("$350/week")
  })

  it("filters null/empty values from best_fit_tags array", () => {
    const raw = makeSession({ best_fit_tags: ["Active", "", "STEM"] as string[] })
    // cast: in practice the array may contain empties from DB
    const result = normalizeSession(raw)
    // filter(Boolean) removes falsy values
    expect(result.best_fit_tags).toEqual(["Active", "STEM"])
  })

  it("sets best_fit_tags to null when array is null", () => {
    const raw = makeSession({ best_fit_tags: null })
    expect(normalizeSession(raw).best_fit_tags).toBeNull()
  })

  it("does not mutate the original object", () => {
    const raw = makeSession({ price_tuition: NOT_POSTED })
    normalizeSession(raw)
    expect(raw.price_tuition).toBe(NOT_POSTED)
  })
})

// ── normalizeSessions ─────────────────────────────────────────

describe("normalizeSessions", () => {
  it("applies normalizeSession to every element", () => {
    const rows = [
      makeSession({ price_tuition: NOT_POSTED }),
      makeSession({ price_tuition: "$400/week" }),
    ]
    const results = normalizeSessions(rows)
    expect(results[0]?.price_tuition).toBeNull()
    expect(results[1]?.price_tuition).toBe("$400/week")
  })

  it("returns an empty array for empty input", () => {
    expect(normalizeSessions([])).toEqual([])
  })
})
