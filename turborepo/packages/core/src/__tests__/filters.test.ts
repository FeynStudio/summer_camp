import { describe, it, expect } from "vitest"
import { matchesFilters, sortCamps, allTags, allYears } from "../filters"
import { DEFAULT_FILTERS } from "../types"
import { makeSession } from "./fixtures"
import type { CampSession } from "../types"

// ── matchesFilters ────────────────────────────────────────────

describe("matchesFilters", () => {
  it("returns true when all filters are at defaults", () => {
    expect(matchesFilters(makeSession(), DEFAULT_FILTERS)).toBe(true)
  })

  describe("search", () => {
    it("matches against camp_name (case-insensitive)", () => {
      const camp = makeSession({ camp_name: "Princeton Soccer Camp" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, search: "soccer" })).toBe(true)
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, search: "PRINCETON" })).toBe(true)
    })

    it("matches against weekly_activity", () => {
      const camp = makeSession({ weekly_activity: "Robotics & Coding" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, search: "robotics" })).toBe(true)
    })

    it("matches against location_address", () => {
      const camp = makeSession({ location_address: "456 Elm St, Lawrenceville, NJ" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, search: "lawrenceville" })).toBe(true)
    })

    it("returns false when search term is not found", () => {
      const camp = makeSession({ camp_name: "Art Camp" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, search: "coding" })).toBe(false)
    })

    it("ignores whitespace-only search", () => {
      expect(matchesFilters(makeSession(), { ...DEFAULT_FILTERS, search: "   " })).toBe(true)
    })
  })

  describe("year", () => {
    it("passes when year matches", () => {
      expect(matchesFilters(makeSession({ year: 2026 }), { ...DEFAULT_FILTERS, year: 2026 })).toBe(true)
    })

    it("fails when year does not match", () => {
      expect(matchesFilters(makeSession({ year: 2025 }), { ...DEFAULT_FILTERS, year: 2026 })).toBe(false)
    })

    it("passes when year is 0 (no filter)", () => {
      expect(matchesFilters(makeSession({ year: 2025 }), { ...DEFAULT_FILTERS, year: 0 })).toBe(true)
    })
  })

  describe("campTypes", () => {
    it("passes when camp_type is in the list", () => {
      const camp = makeSession({ camp_type: "CODE" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, campTypes: ["CODE", "ART"] })).toBe(true)
    })

    it("fails when camp_type is not in the list", () => {
      const camp = makeSession({ camp_type: "SPRTS" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, campTypes: ["CODE"] })).toBe(false)
    })

    it("fails when camp_type is null and filter is active", () => {
      const camp = makeSession({ camp_type: null })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, campTypes: ["CODE"] })).toBe(false)
    })

    it("passes when campTypes is empty (no filter)", () => {
      const camp = makeSession({ camp_type: null })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, campTypes: [] })).toBe(true)
    })
  })

  describe("bestFitTags", () => {
    it("passes when camp has at least one matching tag", () => {
      const camp = makeSession({ best_fit_tags: ["Active", "STEM"] })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, bestFitTags: ["STEM", "Arts"] })).toBe(true)
    })

    it("fails when camp has no matching tags", () => {
      const camp = makeSession({ best_fit_tags: ["Active"] })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, bestFitTags: ["STEM"] })).toBe(false)
    })

    it("fails when camp has null tags and filter is active", () => {
      const camp = makeSession({ best_fit_tags: null })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, bestFitTags: ["STEM"] })).toBe(false)
    })
  })

  describe("hasBeforeCare", () => {
    it("passes when before_care contains 'yes'", () => {
      const camp = makeSession({ before_care: "Yes, 7:30 AM" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, hasBeforeCare: true })).toBe(true)
    })

    it("passes when before_care contains 'avail'", () => {
      const camp = makeSession({ before_care: "Available upon request" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, hasBeforeCare: true })).toBe(true)
    })

    it("fails when before_care is 'No'", () => {
      const camp = makeSession({ before_care: "No" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, hasBeforeCare: true })).toBe(false)
    })

    it("fails when before_care is null", () => {
      const camp = makeSession({ before_care: null })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, hasBeforeCare: true })).toBe(false)
    })

    it("passes when filter is false regardless of value", () => {
      const camp = makeSession({ before_care: null })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, hasBeforeCare: false })).toBe(true)
    })
  })

  describe("hasAfterCare", () => {
    it("passes when after_care contains 'yes'", () => {
      const camp = makeSession({ after_care: "Yes, until 6 PM" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, hasAfterCare: true })).toBe(true)
    })

    it("fails when after_care is 'No'", () => {
      const camp = makeSession({ after_care: "No" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, hasAfterCare: true })).toBe(false)
    })
  })

  describe("indoorOutdoor", () => {
    it("passes when indoor_outdoor includes the filter value", () => {
      const camp = makeSession({ indoor_outdoor: "Mostly Outdoor" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, indoorOutdoor: "outdoor" })).toBe(true)
    })

    it("fails when indoor_outdoor does not match", () => {
      const camp = makeSession({ indoor_outdoor: "Indoor" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, indoorOutdoor: "outdoor" })).toBe(false)
    })

    it("passes when indoorOutdoor filter is empty", () => {
      const camp = makeSession({ indoor_outdoor: null })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, indoorOutdoor: "" })).toBe(true)
    })
  })

  describe("verifiedOnly", () => {
    it("passes when verification_status contains 'verified'", () => {
      const camp = makeSession({ verification_status: "Verified – Jan 2026" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, verifiedOnly: true })).toBe(true)
    })

    it("passes when verification_status contains 'confirmed'", () => {
      const camp = makeSession({ verification_status: "Confirmed" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, verifiedOnly: true })).toBe(true)
    })

    it("fails when verification_status is 'Unverified'", () => {
      const camp = makeSession({ verification_status: "Unverified" })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, verifiedOnly: true })).toBe(false)
    })

    it("fails when verification_status is null", () => {
      const camp = makeSession({ verification_status: null })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, verifiedOnly: true })).toBe(false)
    })

    it("passes when verifiedOnly is false regardless of status", () => {
      const camp = makeSession({ verification_status: null })
      expect(matchesFilters(camp, { ...DEFAULT_FILTERS, verifiedOnly: false })).toBe(true)
    })
  })
})

// ── sortCamps ─────────────────────────────────────────────────

describe("sortCamps", () => {
  const alpha = makeSession({ camp_name: "Alpha Camp", completeness_pct: 50 })
  const beta = makeSession({ camp_name: "Beta Camp", completeness_pct: 80 })
  const gamma = makeSession({ camp_name: "Gamma Camp", completeness_pct: 30 })

  it("sorts by camp_name ascending", () => {
    const result = sortCamps([gamma, alpha, beta], "camp_name", "asc")
    expect(result.map((c: CampSession) => c.camp_name)).toEqual(["Alpha Camp", "Beta Camp", "Gamma Camp"])
  })

  it("sorts by camp_name descending", () => {
    const result = sortCamps([alpha, gamma, beta], "camp_name", "desc")
    expect(result.map((c: CampSession) => c.camp_name)).toEqual(["Gamma Camp", "Beta Camp", "Alpha Camp"])
  })

  it("sorts by completeness_pct ascending", () => {
    const result = sortCamps([alpha, beta, gamma], "completeness_pct", "asc")
    expect(result.map((c: CampSession) => c.completeness_pct)).toEqual([30, 50, 80])
  })

  it("sorts by completeness_pct descending", () => {
    const result = sortCamps([alpha, beta, gamma], "completeness_pct", "desc")
    expect(result.map((c: CampSession) => c.completeness_pct)).toEqual([80, 50, 30])
  })

  it("does not mutate the original array", () => {
    const original = [beta, alpha]
    sortCamps(original, "camp_name", "asc")
    expect(original[0]?.camp_name).toBe("Beta Camp")
  })

  it("defaults sort direction to asc", () => {
    const result = sortCamps([beta, alpha], "camp_name")
    expect(result[0]?.camp_name).toBe("Alpha Camp")
  })
})

// ── allTags ───────────────────────────────────────────────────

describe("allTags", () => {
  it("returns sorted unique tags from all camps", () => {
    const camps = [
      makeSession({ best_fit_tags: ["Active", "STEM"] }),
      makeSession({ best_fit_tags: ["Arts", "STEM"] }),
      makeSession({ best_fit_tags: null }),
    ]
    expect(allTags(camps)).toEqual(["Active", "Arts", "STEM"])
  })

  it("returns empty array when no tags exist", () => {
    expect(allTags([makeSession({ best_fit_tags: null })])).toEqual([])
  })

  it("handles empty array", () => {
    expect(allTags([])).toEqual([])
  })
})

// ── allYears ──────────────────────────────────────────────────

describe("allYears", () => {
  it("returns unique years sorted descending", () => {
    const camps = [
      makeSession({ year: 2025 }),
      makeSession({ year: 2026 }),
      makeSession({ year: 2025 }),
    ]
    expect(allYears(camps)).toEqual([2026, 2025])
  })

  it("handles empty array", () => {
    expect(allYears([])).toEqual([])
  })
})
