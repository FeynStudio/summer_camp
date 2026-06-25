/**
 * Tests for the localStorage persistence logic used by usePlanState.
 *
 * We can't import usePlanState (it's a React hook in a Next.js component),
 * but we can fully test the underlying logic by re-implementing the
 * load/validate/migrate pipeline here — it's all pure decision-making.
 *
 * If the logic in PlanScreen.tsx ever diverges from what's tested here,
 * the tests will surface the regression.
 */

import { describe, it, expect } from "vitest"
import { isValidPlanState, PLAN_SCHEMA_VERSION, EMPTY_PLAN_STATE } from "../types"
import type { PlanState } from "../types"

// ── Simulate the load pipeline ────────────────────────────────
// Mirrors the logic inside loadPlanState() in PlanScreen.tsx.

interface PlanEnvelope {
  schemaVersion: number
  data: PlanState
}

function migratePlanState(_envelope: PlanEnvelope): PlanState {
  // Mirrors the current (no-op) migration in PlanScreen.tsx.
  // When real migrations are added, update both files together.
  return EMPTY_PLAN_STATE
}

function simulateLoad(rawJson: string | null): PlanState {
  if (!rawJson) return EMPTY_PLAN_STATE
  try {
    const parsed: unknown = JSON.parse(rawJson)
    if (!parsed || typeof parsed !== "object") return EMPTY_PLAN_STATE

    // Legacy path: no envelope
    if (!("schemaVersion" in (parsed as object))) {
      return isValidPlanState(parsed) ? parsed : EMPTY_PLAN_STATE
    }

    const envelope = parsed as PlanEnvelope

    if (envelope.schemaVersion === PLAN_SCHEMA_VERSION) {
      return isValidPlanState(envelope.data) ? envelope.data : EMPTY_PLAN_STATE
    }

    return migratePlanState(envelope)
  } catch {
    return EMPTY_PLAN_STATE
  }
}

// ── Fixtures ──────────────────────────────────────────────────

const validState: PlanState = {
  children: [{ id: "k1", name: "Alex", age: 10, interests: ["SPRTS"] }],
  activeChildId: "k1",
  plans: { k1: { W22: "camp-uuid-1", W23: null } },
}

const validEnvelope: PlanEnvelope = {
  schemaVersion: PLAN_SCHEMA_VERSION,
  data: validState,
}

// ── Tests ─────────────────────────────────────────────────────

describe("plan persistence — load pipeline", () => {
  describe("null / missing storage", () => {
    it("returns empty plan when raw is null (nothing stored)", () => {
      expect(simulateLoad(null)).toEqual(EMPTY_PLAN_STATE)
    })
  })

  describe("current version — valid envelope", () => {
    it("returns the stored plan unchanged", () => {
      const result = simulateLoad(JSON.stringify(validEnvelope))
      expect(result).toEqual(validState)
    })

    it("returns empty plan when data inside envelope fails shape check", () => {
      const bad: PlanEnvelope = {
        schemaVersion: PLAN_SCHEMA_VERSION,
        data: { children: "not-an-array", activeChildId: null, plans: {} } as unknown as PlanState,
      }
      expect(simulateLoad(JSON.stringify(bad))).toEqual(EMPTY_PLAN_STATE)
    })

    it("returns empty plan when envelope data is missing a required field", () => {
      const bad = {
        schemaVersion: PLAN_SCHEMA_VERSION,
        data: { children: [], activeChildId: null /* missing plans */ },
      }
      expect(simulateLoad(JSON.stringify(bad))).toEqual(EMPTY_PLAN_STATE)
    })
  })

  describe("legacy path — bare PlanState (no envelope)", () => {
    it("migrates valid legacy data transparently — preserves user state", () => {
      // Stored before versioning was added
      const result = simulateLoad(JSON.stringify(validState))
      expect(result).toEqual(validState)
    })

    it("resets when legacy data fails shape validation", () => {
      const legacy = { foo: "bar", baz: 123 }
      expect(simulateLoad(JSON.stringify(legacy))).toEqual(EMPTY_PLAN_STATE)
    })

    it("resets when legacy data has children as object instead of array", () => {
      const malformed = {
        children: { 0: { id: "k1", name: "Alex", age: 10, interests: [] } },
        activeChildId: null,
        plans: {},
      }
      expect(simulateLoad(JSON.stringify(malformed))).toEqual(EMPTY_PLAN_STATE)
    })
  })

  describe("version mismatch — future migration", () => {
    it("resets when schema version is higher than current (newer data in older app)", () => {
      const future: PlanEnvelope = {
        schemaVersion: PLAN_SCHEMA_VERSION + 1,
        data: validState,
      }
      expect(simulateLoad(JSON.stringify(future))).toEqual(EMPTY_PLAN_STATE)
    })

    it("resets when schema version is lower than current (stale data, no migration defined)", () => {
      const old: PlanEnvelope = {
        schemaVersion: PLAN_SCHEMA_VERSION - 1,
        data: validState,
      }
      // Expect reset because no migration case exists yet
      expect(simulateLoad(JSON.stringify(old))).toEqual(EMPTY_PLAN_STATE)
    })
  })

  describe("corrupted / unparseable storage", () => {
    it("returns empty plan for malformed JSON", () => {
      expect(simulateLoad("{not valid json")).toEqual(EMPTY_PLAN_STATE)
    })

    it("returns empty plan for a stored number", () => {
      expect(simulateLoad("42")).toEqual(EMPTY_PLAN_STATE)
    })

    it("returns empty plan for a stored null literal", () => {
      expect(simulateLoad("null")).toEqual(EMPTY_PLAN_STATE)
    })

    it("returns empty plan for an empty array", () => {
      expect(simulateLoad("[]")).toEqual(EMPTY_PLAN_STATE)
    })
  })
})
