"use client"

import { useState } from "react"
import { Sheet, Badge, FieldRow, Button } from "@repo/ui/components"
import { Icon } from "@repo/ui/Icon"
import type { CampSession, PlanState, SummerWeek } from "@repo/core"
import {
  formatCampType, formatPrice, formatCare, formatDateRange,
  completenessColor, campSummaryText, campTypeColors,
} from "@repo/core"

interface DetailSheetProps {
  camp: CampSession | null
  onClose: () => void
  onCompare: (camp: CampSession) => void
  compareList: CampSession[]
  planState: PlanState
  onPlanChange: (next: PlanState) => void
  summerWeeks: SummerWeek[]
}

export function DetailSheet({ camp, onClose, onCompare, compareList, planState, onPlanChange, summerWeeks }: DetailSheetProps) {
  const [pickedChildId, setPickedChildId] = useState<string | null>(null)

  if (!camp) return null

  const inCompare = compareList.some((c) => c.id === camp.id)
  const typeColor = campTypeColors[camp.camp_type ?? ""] ?? "bg-slate-100 text-slate-700"

  const { children, plans } = planState
  const week = summerWeeks.find((w) => w.key === camp.week_key)

  // Determine which child (if any) already has this camp in their plan
  function childHasCamp(childId: string) {
    return plans[childId]?.[camp.week_key] === camp.id
  }

  function assignToChild(childId: string) {
    const childPlan = { ...(plans[childId] ?? {}), [camp.week_key]: camp.id }
    onPlanChange({
      ...planState,
      activeChildId: childId,
      plans: { ...plans, [childId]: childPlan },
    })
  }

  function removeFromChild(childId: string) {
    const childPlan = { ...(plans[childId] ?? {}), [camp.week_key]: null }
    onPlanChange({ ...planState, plans: { ...plans, [childId]: childPlan } })
  }

  function copyText() {
    navigator.clipboard.writeText(campSummaryText(camp)).catch(() => {})
  }

  // Which child to assign to (auto-select if only 1)
  const effectiveChildId = pickedChildId ?? (children.length === 1 ? children[0]!.id : null)

  return (
    <Sheet open={!!camp} onClose={() => { setPickedChildId(null); onClose() }} title="Camp Details" side="right" width="w-full max-w-lg">
      {/* Header */}
      <div className="space-y-3 mb-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 leading-snug">{camp.camp_name}</h2>
          <Badge className={typeColor}>{formatCampType(camp.camp_type)}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {camp.week_date_range && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Icon name="calendar" size={13} />
              <span>{formatDateRange(camp.week_date_range)}</span>
            </div>
          )}
          {camp.distance_from_princeton && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Icon name="location" size={13} />
              <span>{camp.distance_from_princeton}</span>
            </div>
          )}
          {camp.ages_grades && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Icon name="user" size={13} />
              <span>{camp.ages_grades}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${completenessColor(camp.completeness_pct)}`}>
            {camp.completeness_pct}% complete
          </span>
          {camp.verification_status && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <Icon name="verified" size={13} />
              {camp.verification_status}
            </span>
          )}
        </div>

        {(camp.best_fit_tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {camp.best_fit_tags!.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Add to Plan ──────────────────────────────────── */}
        {week && (
          <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Add to Plan · {week.label} ({week.dates})
            </p>

            {children.length === 0 ? (
              <p className="text-xs text-slate-400">
                Add a child in the Plan tab to save camps to your plan.
              </p>
            ) : children.length === 1 ? (
              /* Single child — direct add/remove */
              (() => {
                const kid = children[0]!
                const added = childHasCamp(kid.id)
                return (
                  <Button
                    variant={added ? "secondary" : "primary"}
                    size="sm"
                    onClick={() => added ? removeFromChild(kid.id) : assignToChild(kid.id)}
                    className="w-full"
                  >
                    <Icon name={added ? "check" : "plus"} size={14} />
                    {added ? `In ${kid.name}'s plan` : `Add to ${kid.name}'s plan`}
                  </Button>
                )
              })()
            ) : (
              /* Multiple children — pick one */
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {children.map((kid) => (
                    <button
                      key={kid.id}
                      onClick={() => setPickedChildId(pickedChildId === kid.id ? null : kid.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        effectiveChildId === kid.id
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      {kid.name}
                      {childHasCamp(kid.id) && " ✓"}
                    </button>
                  ))}
                </div>
                {effectiveChildId && (() => {
                  const added = childHasCamp(effectiveChildId)
                  const kid = children.find((k) => k.id === effectiveChildId)!
                  return (
                    <Button
                      variant={added ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => added ? removeFromChild(effectiveChildId) : assignToChild(effectiveChildId)}
                      className="w-full"
                    >
                      <Icon name={added ? "check" : "plus"} size={14} />
                      {added ? `In ${kid.name}'s plan` : `Add to ${kid.name}'s plan`}
                    </Button>
                  )
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1">
        <FieldRow label="Price / Tuition" value={formatPrice(camp.price_tuition)} />
        <FieldRow label="Registration Fee" value={formatPrice(camp.registration_fee)} />
        <FieldRow label="Ages / Grades" value={camp.ages_grades} />
        <FieldRow label="Daily Hours" value={camp.daily_start_time && camp.daily_end_time ? `${camp.daily_start_time} – ${camp.daily_end_time}` : null} />
        <FieldRow label="Before Care" value={formatCare(camp.before_care)} />
        <FieldRow label="After Care" value={formatCare(camp.after_care)} />
        <FieldRow label="Activity" value={camp.weekly_activity} />
        <FieldRow label="Skill Level" value={camp.skill_level} />
        <FieldRow label="Meals Included" value={camp.meals_included} />
        <FieldRow label="Indoor / Outdoor" value={camp.indoor_outdoor} />
        <FieldRow label="Address" value={camp.location_address} />
        <FieldRow label="Distance" value={camp.distance_from_princeton} />
        <FieldRow label="Reg. Start" value={camp.registration_start_date} />
        <FieldRow label="Reg. Deadline" value={camp.registration_deadlines} />
        <FieldRow label="Cancellation" value={camp.cancellation_refund_notes} />
        <FieldRow label="Registration Notes" value={camp.registration_notes} />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
        <div className="flex gap-2">
          <Button
            variant={inCompare ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onCompare(camp)}
            className="flex-1"
          >
            <Icon name="compare" size={14} />
            {inCompare ? "Remove from Compare" : "Add to Compare"}
          </Button>
          <Button variant="ghost" size="sm" onClick={copyText} className="flex-1">
            <Icon name="copy" size={14} />
            Copy
          </Button>
        </div>
        {camp.source_url && (
          <a
            href={camp.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Icon name="link" size={14} />
            View Source
          </a>
        )}
      </div>
    </Sheet>
  )
}
