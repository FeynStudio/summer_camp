import { describe, it, expect } from "vitest"
import { isValidPlanState, EMPTY_PLAN_STATE, PLAN_SCHEMA_VERSION } from "../types"

// ── isValidPlanState ──────────────────────────────────────────

describe("isValidPlanState", () => {
  const valid = {
    children: [{ id: "k1", name: "Alex", age: 10, interests: ["SPRTS"] }],
    activeChildId: "k1",
    plans: { k1: { W22: "camp-uuid-1", W23: null } },
  }

  it("accepts a fully populated valid state", () => {
    expect(isValidPlanState(valid)).toBe(true)
  })

  it("accepts the empty plan state constant", () => {
    expect(isValidPlanState(EMPTY_PLAN_STATE)).toBe(true)
  })

  it("accepts activeChildId as null", () => {
    expect(isValidPlanState({ ...valid, activeChildId: null })).toBe(true)
  })

  it("accepts an empty children array", () => {
    expect(isValidPlanState({ children: [], activeChildId: null, plans: {} })).toBe(true)
  })

  it("accepts empty interests array on a child", () => {
    const state = {
      ...valid,
      children: [{ id: "k1", name: "Alex", age: 10, interests: [] }],
    }
    expect(isValidPlanState(state)).toBe(true)
  })

  it("rejects null", () => {
    expect(isValidPlanState(null)).toBe(false)
  })

  it("rejects undefined", () => {
    expect(isValidPlanState(undefined)).toBe(false)
  })

  it("rejects a plain string", () => {
    expect(isValidPlanState("plan")).toBe(false)
  })

  it("rejects missing children array", () => {
    const { children: _c, ...rest } = valid
    expect(isValidPlanState(rest)).toBe(false)
  })

  it("rejects children as non-array (e.g. object)", () => {
    expect(isValidPlanState({ ...valid, children: {} })).toBe(false)
  })

  it("rejects activeChildId as a number", () => {
    expect(isValidPlanState({ ...valid, activeChildId: 42 })).toBe(false)
  })

  it("rejects missing plans", () => {
    const { plans: _p, ...rest } = valid
    expect(isValidPlanState(rest)).toBe(false)
  })

  it("rejects plans as an array", () => {
    expect(isValidPlanState({ ...valid, plans: [] })).toBe(false)
  })

  it("rejects a child missing id", () => {
    const state = {
      ...valid,
      children: [{ name: "Alex", age: 10, interests: [] }],
    }
    expect(isValidPlanState(state)).toBe(false)
  })

  it("rejects a child with numeric id", () => {
    const state = {
      ...valid,
      children: [{ id: 123, name: "Alex", age: 10, interests: [] }],
    }
    expect(isValidPlanState(state)).toBe(false)
  })

  it("rejects a child missing name", () => {
    const state = {
      ...valid,
      children: [{ id: "k1", age: 10, interests: [] }],
    }
    expect(isValidPlanState(state)).toBe(false)
  })

  it("rejects a child with string age", () => {
    const state = {
      ...valid,
      children: [{ id: "k1", name: "Alex", age: "ten", interests: [] }],
    }
    expect(isValidPlanState(state)).toBe(false)
  })

  it("rejects a child with object interests (not array)", () => {
    const state = {
      ...valid,
      children: [{ id: "k1", name: "Alex", age: 10, interests: "SPRTS" }],
    }
    expect(isValidPlanState(state)).toBe(false)
  })
})

// ── PLAN_SCHEMA_VERSION ───────────────────────────────────────

describe("PLAN_SCHEMA_VERSION", () => {
  it("is a positive integer", () => {
    expect(Number.isInteger(PLAN_SCHEMA_VERSION)).toBe(true)
    expect(PLAN_SCHEMA_VERSION).toBeGreaterThan(0)
  })
})
