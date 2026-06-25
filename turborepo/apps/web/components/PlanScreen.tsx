"use client"

import { useState, useMemo } from "react"
import { Button, Badge, Empty, Spinner } from "@repo/ui/components"
import { Icon } from "@repo/ui/Icon"
import type { CampSession, PlanState, KidProfile, SummerWeek } from "@repo/core"
import {
  formatCampType,
  formatPrice,
  parsePriceNum,
  campTypeColors,
  EMPTY_PLAN_STATE,
  PLAN_SCHEMA_VERSION,
  isValidPlanState,
} from "@repo/core"

// ── localStorage hook ────────────────────────────────────────

const STORAGE_KEY = "camp-planner-plan-v1"

// ── Versioned envelope ────────────────────────────────────────
// Stored format: { schemaVersion: number, data: PlanState }
// The schemaVersion field lets us detect stale data on every load.

interface PlanEnvelope {
  schemaVersion: number
  data: PlanState
}


/**
 * Migrates stored data from an older schema version.
 *
 * HOW TO ADD A MIGRATION:
 * When you bump PLAN_SCHEMA_VERSION in types.ts, add a case here:
 *
 *   if (envelope.schemaVersion === 1) {
 *     // Example: v1 → v2 added `preferences` to KidProfile
 *     return {
 *       ...envelope.data,
 *       children: envelope.data.children.map((k) => ({ ...k, preferences: {} })),
 *     }
 *   }
 *
 * If the old data is unrecoverable, return EMPTY_PLAN_STATE.
 */
function migratePlanState(envelope: PlanEnvelope): PlanState {
  // No migrations defined yet — reset on version mismatch.
  // Future migrations go here as PLAN_SCHEMA_VERSION increments.
  console.warn(
    `[Camp Planner] Plan schema v${envelope.schemaVersion} → v${PLAN_SCHEMA_VERSION}: ` +
    `no migration defined, starting with an empty plan.`
  )
  return EMPTY_PLAN_STATE
}

/**
 * Load, validate, and (if needed) migrate the plan from localStorage.
 * Returns a valid PlanState in all cases — never throws.
 */
function loadPlanState(): PlanState {
  if (typeof window === "undefined") return EMPTY_PLAN_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_PLAN_STATE

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return EMPTY_PLAN_STATE

    // ── Legacy path: data stored before versioning was added ──────
    // Old format was bare PlanState with no envelope.
    if (!("schemaVersion" in (parsed as object))) {
      if (isValidPlanState(parsed)) {
        // Shape still matches current schema — silently upgrade the envelope.
        // The next save will wrap it properly.
        return parsed
      }
      console.warn("[Camp Planner] Legacy localStorage data failed shape validation — resetting.")
      return EMPTY_PLAN_STATE
    }

    // ── Versioned path ────────────────────────────────────────────
    const envelope = parsed as PlanEnvelope

    if (envelope.schemaVersion === PLAN_SCHEMA_VERSION) {
      // Current version: validate shape before trusting the data.
      if (isValidPlanState(envelope.data)) return envelope.data
      console.warn("[Camp Planner] localStorage plan failed shape validation — resetting.")
      return EMPTY_PLAN_STATE
    }

    // Version mismatch: run migration logic.
    return migratePlanState(envelope)
  } catch {
    return EMPTY_PLAN_STATE
  }
}

export function usePlanState(): [PlanState, (next: PlanState) => void] {
  const [state, setState] = useState<PlanState>(loadPlanState)

  function update(next: PlanState) {
    setState(next)
    try {
      const envelope: PlanEnvelope = { schemaVersion: PLAN_SCHEMA_VERSION, data: next }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
    } catch {}
  }

  return [state, update]
}

// ── Helpers ──────────────────────────────────────────────────

function planBudget(plan: Record<string, string | null>, campById: Map<string, CampSession>): number {
  let total = 0
  for (const campId of Object.values(plan)) {
    if (!campId) continue
    const camp = campById.get(campId)
    if (camp) total += parsePriceNum(camp.price_tuition) ?? 0
  }
  return total
}

// ── Camp Picker Sheet ─────────────────────────────────────────
// Slide-up sheet for picking a camp to assign to a week slot.

interface CampPickerProps {
  weekKey: string
  summerWeeks: SummerWeek[]
  allCamps: CampSession[]
  isLoading: boolean
  onPick: (campId: string) => void
  onClose: () => void
}

function CampPickerSheet({ weekKey, summerWeeks, allCamps, isLoading, onPick, onClose }: CampPickerProps) {
  const [search, setSearch] = useState("")
  const week = summerWeeks.find((w) => w.key === weekKey)

  const filtered = useMemo(() => {
    // Primary: camps with matching week_key
    const weekCamps = allCamps.filter((c) => c.week_key === weekKey)
    // Apply search if any
    if (!search.trim()) return weekCamps
    const q = search.toLowerCase()
    return weekCamps.filter(
      (c) =>
        c.camp_name.toLowerCase().includes(q) ||
        (c.camp_type ?? "").toLowerCase().includes(q) ||
        (c.weekly_activity ?? "").toLowerCase().includes(q),
    )
  }, [allCamps, weekKey, search])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 flex flex-col max-h-[85vh]">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-slate-200" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-base font-semibold text-slate-900">{week?.label ?? weekKey}</p>
            <p className="text-xs text-slate-400">{week?.dates}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <Icon name="close" size={18} />
          </button>
        </div>
        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search camps for this week…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              autoFocus
            />
          </div>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size={24} />
            </div>
          ) : filtered.length === 0 ? (
            <Empty
              icon={<Icon name="camp" size={36} />}
              title={search ? "No camps match your search" : "No camps for this week"}
              description={search ? "Try a different search term." : "The research agent may not have found camps for this week yet."}
            />
          ) : (
            <ul className="divide-y divide-slate-100 pb-6">
              {filtered.map((camp) => {
                const typeColor = campTypeColors[camp.camp_type ?? ""] ?? "bg-slate-100 text-slate-700"
                return (
                  <li key={camp.id}>
                    <button
                      onClick={() => { onPick(camp.id); onClose() }}
                      className="w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 leading-snug">{camp.camp_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={typeColor}>{formatCampType(camp.camp_type)}</Badge>
                          {camp.price_tuition && (
                            <span className="text-xs text-slate-400">{formatPrice(camp.price_tuition)}</span>
                          )}
                          {camp.ages_grades && (
                            <span className="text-xs text-slate-400">Ages {camp.ages_grades}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mt-0.5">
                        <Icon name="plus" size={16} />
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

// ── KidForm ──────────────────────────────────────────────────

import { CAMP_TYPES } from "@repo/core"

const INTEREST_GROUPS = [
  { label: "Sports", codes: ["SPRTS", "BASE", "BSKT", "SOCR", "TNIS", "ROW", "VB", "FH", "MART"] },
  { label: "Arts & Creative", codes: ["DANCE", "ART", "THTR", "MUS", "WRIT"] },
  { label: "Academic", codes: ["CHESS", "MATH", "AOSP", "SCI", "CODE", "PREP"] },
  { label: "Outdoor & General", codes: ["GEN", "NAT", "REC"] },
]

function KidForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: KidProfile
  onSave: (k: KidProfile) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [age, setAge] = useState(initial?.age ?? 8)
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? [])

  function toggle(code: string) {
    setInterests((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code])
  }

  return (
    <div className="space-y-5 px-5 py-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Age</label>
        <div className="flex items-center gap-3">
          <button onClick={() => setAge((a) => Math.max(3, a - 1))} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50">
            <Icon name="minus" size={14} />
          </button>
          <span className="text-lg font-semibold w-8 text-center">{age}</span>
          <button onClick={() => setAge((a) => Math.min(18, a + 1))} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50">
            <Icon name="plus" size={14} />
          </button>
          <span className="text-sm text-slate-400">years old</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Interests</label>
        <div className="space-y-3">
          {INTEREST_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.codes.map((code) => (
                  <button
                    key={code}
                    onClick={() => toggle(code)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      interests.includes(code)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    {CAMP_TYPES[code] ?? code}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-2 pb-6">
        <Button
          variant="primary"
          disabled={!name.trim()}
          onClick={() => onSave({ id: initial?.id ?? crypto.randomUUID(), name: name.trim(), age, interests })}
        >
          {initial ? "Save changes" : "Add child"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// ── PlanScreen ────────────────────────────────────────────────

interface PlanScreenProps {
  planState: PlanState
  onPlanChange: (next: PlanState) => void
  allCamps: CampSession[]
  isLoading: boolean
  onSelectCamp: (camp: CampSession) => void
  summerWeeks: SummerWeek[]
}

export function PlanScreen({ planState, onPlanChange, allCamps, isLoading, onSelectCamp, summerWeeks }: PlanScreenProps) {
  const [pickingWeek, setPickingWeek] = useState<string | null>(null)
  const [showKidForm, setShowKidForm] = useState<KidProfile | "new" | null>(null)

  const { children, activeChildId, plans } = planState
  const activeChild = children.find((k) => k.id === activeChildId) ?? null
  const activePlan: Record<string, string | null> = activeChild ? (plans[activeChild.id] ?? {}) : {}

  // Build campById lookup
  const campById = useMemo(() => {
    const map = new Map<string, CampSession>()
    for (const c of allCamps) map.set(c.id, c)
    return map
  }, [allCamps])

  const budget = planBudget(activePlan, campById)
  const assignedCount = Object.values(activePlan).filter(Boolean).length

  function setActiveChild(id: string) {
    onPlanChange({ ...planState, activeChildId: id })
  }

  function assignCamp(weekKey: string, campId: string) {
    if (!activeChild) return
    const childPlan = { ...(plans[activeChild.id] ?? {}), [weekKey]: campId }
    onPlanChange({ ...planState, plans: { ...plans, [activeChild.id]: childPlan } })
  }

  function removeCamp(weekKey: string) {
    if (!activeChild) return
    const childPlan = { ...(plans[activeChild.id] ?? {}), [weekKey]: null }
    onPlanChange({ ...planState, plans: { ...plans, [activeChild.id]: childPlan } })
  }

  function saveKid(kid: KidProfile) {
    let next: typeof children
    if (showKidForm === "new") {
      next = [...children, kid]
    } else {
      next = children.map((k) => (k.id === kid.id ? kid : k))
    }
    const newActiveId = showKidForm === "new" ? kid.id : activeChildId
    onPlanChange({ ...planState, children: next, activeChildId: newActiveId ?? null })
    setShowKidForm(null)
  }

  function deleteKid(id: string) {
    const next = children.filter((k) => k.id !== id)
    onPlanChange({
      ...planState,
      children: next,
      activeChildId: activeChildId === id ? (next[0]?.id ?? null) : activeChildId,
    })
  }

  // ── Kid form overlay ─────────────────────────────────────────
  if (showKidForm !== null) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto pb-20">
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center gap-3">
          <button onClick={() => setShowKidForm(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <Icon name="chevron-left" size={20} />
          </button>
          <h2 className="text-base font-semibold text-slate-900">
            {showKidForm === "new" ? "Add a child" : `Edit ${(showKidForm as KidProfile).name}`}
          </h2>
        </div>
        <KidForm
          initial={showKidForm === "new" ? undefined : (showKidForm as KidProfile)}
          onSave={saveKid}
          onCancel={() => setShowKidForm(null)}
        />
      </div>
    )
  }

  // ── Empty state — no children yet ────────────────────────────
  if (children.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 pb-20">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <Icon name="user" size={32} className="text-blue-600" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Build your summer plan</h2>
          <p className="text-sm text-slate-400 max-w-xs">
            Add a child to start filling their 9-week summer schedule and tracking the budget.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowKidForm("new")}>
          <Icon name="plus" size={16} />
          Add a child
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto pb-20">
      {/* Child tabs + budget */}
      <div className="bg-white border-b border-slate-100 px-4 pt-3 pb-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {children.map((kid) => (
            <button
              key={kid.id}
              onClick={() => setActiveChild(kid.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all shrink-0 ${
                activeChildId === kid.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
            >
              {kid.name}
              <span className={`text-[10px] font-semibold ${activeChildId === kid.id ? "text-blue-200" : "text-slate-400"}`}>
                {kid.age}yr
              </span>
            </button>
          ))}
          <button
            onClick={() => setShowKidForm("new")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm font-medium border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all shrink-0"
          >
            <Icon name="plus" size={13} />
            Add
          </button>
        </div>
      </div>

      {/* Active child header */}
      {activeChild && (
        <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {activeChild.name}'s plan
              </p>
              <p className="text-xs text-slate-400">
                {assignedCount} of {summerWeeks.length} weeks planned
              </p>
            </div>
          </div>
          <div className="text-right">
            {budget > 0 && (
              <>
                <p className="text-xs text-slate-400">Est. total</p>
                <p className="text-base font-bold text-slate-900">
                  ${budget.toLocaleString()}
                </p>
              </>
            )}
          </div>
          <div className="flex gap-1 ml-3">
            <button
              onClick={() => setShowKidForm(activeChild)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              title="Edit child"
            >
              <Icon name="info" size={15} />
            </button>
            <button
              onClick={() => deleteKid(activeChild.id)}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"
              title="Remove child"
            >
              <Icon name="x-circle" size={15} />
            </button>
          </div>
        </div>
      )}

      {/* 9-week grid */}
      <div className="px-4 py-4 space-y-2.5">
        {summerWeeks.map((week) => {
          const campId = activePlan[week.key] ?? null
          const camp = campId ? campById.get(campId) ?? null : null
          const typeColor = camp ? (campTypeColors[camp.camp_type ?? ""] ?? "bg-slate-100 text-slate-700") : ""

          return (
            <div key={week.key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Week label */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{week.label}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">{week.dates}</span>
                </div>
              </div>

              {/* Slot content */}
              {camp ? (
                /* Filled slot */
                <div className="px-4 py-3 flex items-start justify-between gap-3">
                  <button
                    onClick={() => onSelectCamp(camp)}
                    className="flex-1 text-left group"
                  >
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                      {camp.camp_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className={typeColor}>{formatCampType(camp.camp_type)}</Badge>
                      {camp.price_tuition && (
                        <span className="text-xs text-slate-400">{formatPrice(camp.price_tuition)}</span>
                      )}
                      {camp.location_address && (
                        <span className="text-xs text-slate-400 truncate max-w-[140px]">{camp.location_address}</span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setPickingWeek(week.key)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                      title="Change camp"
                    >
                      <Icon name="sort" size={14} />
                    </button>
                    <button
                      onClick={() => removeCamp(week.key)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"
                      title="Remove"
                    >
                      <Icon name="x-circle" size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty slot */
                <button
                  onClick={() => setPickingWeek(week.key)}
                  className="w-full px-4 py-3.5 flex items-center gap-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full border-2 border-dashed border-current flex items-center justify-center">
                    <Icon name="plus" size={12} />
                  </div>
                  <span className="text-sm font-medium">Add a camp</span>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Camp picker sheet */}
      {pickingWeek && (
        <CampPickerSheet
          weekKey={pickingWeek}
          summerWeeks={summerWeeks}
          allCamps={allCamps}
          isLoading={isLoading}
          onPick={(campId) => assignCamp(pickingWeek, campId)}
          onClose={() => setPickingWeek(null)}
        />
      )}
    </div>
  )
}
