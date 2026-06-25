import { describe, it, expect } from "vitest"
import {
  formatCampType,
  formatPrice,
  parsePriceNum,
  formatCare,
  completenessColor,
  parseDistanceMiles,
  truncate,
  formatDateRange,
} from "../format"

// ── formatCampType ────────────────────────────────────────────

describe("formatCampType", () => {
  it("returns human-readable label for known codes", () => {
    expect(formatCampType("SPRTS")).toBe("Multi-Sport")
    expect(formatCampType("CODE")).toBe("Coding / Tech")
    expect(formatCampType("ART")).toBe("Arts & Crafts")
  })

  it("returns the code itself for unknown codes", () => {
    expect(formatCampType("UNKNOWN_CODE")).toBe("UNKNOWN_CODE")
  })

  it("returns '—' for null", () => {
    expect(formatCampType(null)).toBe("—")
  })

  it("returns '—' for undefined", () => {
    expect(formatCampType(undefined)).toBe("—")
  })

  it("returns '—' for empty string", () => {
    expect(formatCampType("")).toBe("—")
  })
})

// ── formatPrice ───────────────────────────────────────────────

describe("formatPrice", () => {
  it("returns the price string as-is for normal values", () => {
    expect(formatPrice("$350/week")).toBe("$350/week")
    expect(formatPrice("$1,200")).toBe("$1,200")
  })

  it("returns 'Not posted' for not-posted values (case-insensitive)", () => {
    expect(formatPrice("Not posted publicly")).toBe("Not posted")
    expect(formatPrice("NOT POSTED")).toBe("Not posted")
  })

  it("returns '—' for null", () => {
    expect(formatPrice(null)).toBe("—")
  })

  it("returns '—' for undefined", () => {
    expect(formatPrice(undefined)).toBe("—")
  })
})

// ── parsePriceNum ─────────────────────────────────────────────

describe("parsePriceNum", () => {
  it("parses '$350/week'", () => {
    expect(parsePriceNum("$350/week")).toBe(350)
  })

  it("parses '$1,200'", () => {
    expect(parsePriceNum("$1,200")).toBe(1200)
  })

  it("parses a plain number string", () => {
    expect(parsePriceNum("500")).toBe(500)
  })

  it("parses a decimal value", () => {
    expect(parsePriceNum("$49.99")).toBeCloseTo(49.99)
  })

  it("returns null for 'Not posted' values", () => {
    expect(parsePriceNum("Not posted publicly")).toBeNull()
  })

  it("returns null for null", () => {
    expect(parsePriceNum(null)).toBeNull()
  })

  it("returns null for undefined", () => {
    expect(parsePriceNum(undefined)).toBeNull()
  })

  it("returns null for non-numeric strings", () => {
    expect(parsePriceNum("free")).toBeNull()
  })
})

// ── formatCare ────────────────────────────────────────────────

describe("formatCare", () => {
  it("returns 'Yes' for values starting with 'yes'", () => {
    expect(formatCare("Yes, available")).toBe("Yes")
    expect(formatCare("yes")).toBe("Yes")
  })

  it("returns 'No' for values starting with 'no'", () => {
    expect(formatCare("No")).toBe("No")
    expect(formatCare("none")).toBe("No")
  })

  it("returns '—' for 'Not posted' values", () => {
    expect(formatCare("Not posted publicly")).toBe("—")
  })

  it("returns '—' for null", () => {
    expect(formatCare(null)).toBe("—")
  })

  it("returns '—' for undefined", () => {
    expect(formatCare(undefined)).toBe("—")
  })

  it("returns raw value for other strings", () => {
    expect(formatCare("Available upon request")).toBe("Available upon request")
  })
})

// ── completenessColor ─────────────────────────────────────────

describe("completenessColor", () => {
  it("returns green classes for ≥80%", () => {
    expect(completenessColor(80)).toContain("emerald")
    expect(completenessColor(100)).toContain("emerald")
  })

  it("returns yellow classes for 50–79%", () => {
    expect(completenessColor(50)).toContain("yellow")
    expect(completenessColor(79)).toContain("yellow")
  })

  it("returns red classes for <50%", () => {
    expect(completenessColor(49)).toContain("red")
    expect(completenessColor(0)).toContain("red")
  })
})

// ── parseDistanceMiles ────────────────────────────────────────

describe("parseDistanceMiles", () => {
  it("parses miles strings", () => {
    expect(parseDistanceMiles("2.5 mi")).toBeCloseTo(2.5)
    expect(parseDistanceMiles("10 mi from Princeton")).toBeCloseTo(10)
  })

  it("converts kilometers to miles", () => {
    expect(parseDistanceMiles("5 km")).toBeCloseTo(3.107, 2)
  })

  it("returns null for null", () => {
    expect(parseDistanceMiles(null)).toBeNull()
  })

  it("returns null for non-distance strings", () => {
    expect(parseDistanceMiles("unknown")).toBeNull()
  })
})

// ── truncate ──────────────────────────────────────────────────

describe("truncate", () => {
  it("returns the string unchanged when under maxLen", () => {
    expect(truncate("Short text", 80)).toBe("Short text")
  })

  it("truncates and appends ellipsis when over maxLen", () => {
    const long = "a".repeat(90)
    const result = truncate(long, 80)
    expect(result.length).toBe(80)
    expect(result.endsWith("…")).toBe(true)
  })

  it("uses default maxLen of 80", () => {
    const long = "a".repeat(90)
    const result = truncate(long)
    expect(result.length).toBe(80)
  })

  it("returns '—' for null", () => {
    expect(truncate(null)).toBe("—")
  })

  it("returns '—' for undefined", () => {
    expect(truncate(undefined)).toBe("—")
  })
})

// ── formatDateRange ───────────────────────────────────────────

describe("formatDateRange", () => {
  it("returns the range string as-is", () => {
    expect(formatDateRange("Jun 22 – Jun 26")).toBe("Jun 22 – Jun 26")
  })

  it("returns 'Not posted' for not-posted values", () => {
    expect(formatDateRange("Not posted publicly")).toBe("Not posted")
  })

  it("returns '—' for null", () => {
    expect(formatDateRange(null)).toBe("—")
  })

  it("returns '—' for undefined", () => {
    expect(formatDateRange(undefined)).toBe("—")
  })
})
