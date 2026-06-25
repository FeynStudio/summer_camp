// Shared test fixtures for @repo/core unit tests

import type { CampSession, KidProfile, ChildPlan } from "../types"

/** Build a minimal valid CampSession, overriding only specified fields. */
export function makeSession(overrides: Partial<CampSession> = {}): CampSession {
  return {
    id: "test-id-1",
    run_id: "run-1",
    year: 2026,
    camp_id: "2026_ORG_CODE_W01_1",
    organization_id: "ORG",
    week_key: "W01",
    week_date_range: "Jun 22 – Jun 26",
    individual_week: null,
    camp_name: "Test Camp",
    location_address: "123 Main St, Princeton, NJ",
    source_url: "https://example.com",
    distance_from_princeton: "2.5 mi",
    ages_grades: "Ages 7–12",
    daily_start_time: "9:00 AM",
    daily_end_time: "4:00 PM",
    before_care: "Yes, available",
    after_care: "No",
    price_tuition: "$350/week",
    registration_fee: "$25",
    camp_type: "SPRTS",
    weekly_activity: "Multi-sport",
    skill_level: "All levels",
    meals_included: "No",
    indoor_outdoor: "Outdoor",
    registration_start_date: "2026-02-01",
    registration_deadlines: "2026-05-01",
    cancellation_refund_notes: "Full refund before May 1",
    verification_status: "Verified",
    source_type_date_checked: "Web – 2026-01-15",
    best_fit_tags: ["Active", "Team sports"],
    registration_notes: null,
    created_at: "2026-01-01T00:00:00Z",
    run_date: "2026-01-15",
    completeness_score: 18,
    completeness_pct: 90,
    ...overrides,
  }
}

export const kid: KidProfile = {
  id: "kid-1",
  name: "Alex",
  age: 10,
  interests: ["SPRTS"],
}

export function makePlan(overrides: Partial<ChildPlan> = {}): ChildPlan {
  return { W01: null, W02: null, W03: null, ...overrides }
}
