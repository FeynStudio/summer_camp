// ============================================================
// Core domain types for Camp Planner
// Mirrors the best_camp_sessions Supabase view schema exactly.
// ============================================================

export interface CampSession {
  id: string
  run_id: string
  year: number
  camp_id: string
  organization_id: string | null
  week_key: string // e.g. "W25" — derived from camp_id
  week_date_range: string | null
  individual_week: string | null
  camp_name: string
  location_address: string | null
  source_url: string | null
  distance_from_princeton: string | null
  ages_grades: string | null
  daily_start_time: string | null
  daily_end_time: string | null
  before_care: string | null
  after_care: string | null
  price_tuition: string | null
  registration_fee: string | null
  camp_type: string | null
  weekly_activity: string | null
  skill_level: string | null
  meals_included: string | null
  indoor_outdoor: string | null
  registration_start_date: string | null
  registration_deadlines: string | null
  cancellation_refund_notes: string | null
  verification_status: string | null
  source_type_date_checked: string | null
  best_fit_tags: string[] | null
  registration_notes: string | null
  created_at: string
  run_date: string
  completeness_score: number
  completeness_pct: number
}

// ── Kid / plan types ─────────────────────────────────────────

export interface KidProfile {
  id: string
  name: string
  age: number
  interests: string[] // camp_type values e.g. ["SPRTS", "ART", "CODE"]
}

/** weekKey → campId (or null = empty slot) */
export type ChildPlan = Record<string, string | null>

/** Full plan state — persisted to localStorage. */
export interface PlanState {
  children: KidProfile[]
  activeChildId: string | null
  /** childId → ChildPlan */
  plans: Record<string, ChildPlan>
}

export const EMPTY_PLAN_STATE: PlanState = {
  children: [],
  activeChildId: null,
  plans: {},
}

// ── Filter types ─────────────────────────────────────────────

export interface CampFilters {
  search: string
  year: number
  campTypes: string[]
  ageTag: string
  bestFitTags: string[]
  hasBeforeCare: boolean
  hasAfterCare: boolean
  indoorOutdoor: string // "Indoor" | "Outdoor" | "Mixed" | ""
  verifiedOnly: boolean
}

export const CAMP_TYPES: Record<string, string> = {
  GEN: "General",
  SPRTS: "Multi-Sport",
  BASE: "Baseball",
  BSKT: "Basketball",
  SOCR: "Soccer",
  TNIS: "Tennis",
  ROW: "Rowing",
  VB: "Volleyball",
  FH: "Field Hockey",
  MART: "Martial Arts",
  DANCE: "Dance",
  CHESS: "Chess",
  MATH: "Math / Academic",
  AOSP: "Aerospace / STEM",
  SCI: "Science",
  CODE: "Coding / Tech",
  ART: "Arts & Crafts",
  THTR: "Theater",
  MUS: "Music",
  NAT: "Nature / Outdoors",
  WRIT: "Writing",
  PREP: "College Prep",
  REC: "Recreation",
}

export const DEFAULT_FILTERS: CampFilters = {
  search: "",
  year: 0,
  campTypes: [],
  ageTag: "",
  bestFitTags: [],
  hasBeforeCare: false,
  hasAfterCare: false,
  indoorOutdoor: "",
  verifiedOnly: false,
}
