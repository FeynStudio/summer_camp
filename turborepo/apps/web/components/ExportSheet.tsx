"use client"

import { Sheet } from "@repo/ui/components"
import { Icon } from "@repo/ui/Icon"
import type { CampSession, PlanState, SummerWeek } from "@repo/core"
import { downloadCsv, toIcs, downloadIcs } from "@repo/core"

interface ExportSheetProps {
  open: boolean
  onClose: () => void
  camps: CampSession[]
  filteredCamps: CampSession[]
  planState: PlanState
  summerWeeks: SummerWeek[]
}

export function ExportSheet({ open, onClose, camps, filteredCamps, planState, summerWeeks }: ExportSheetProps) {
  const { children, plans } = planState

  const campById = new Map(camps.map((c) => [c.id, c]))

  const childrenWithPlans = children.filter((kid) => {
    const plan = plans[kid.id] ?? {}
    return Object.values(plan).some(Boolean)
  })

  return (
    <Sheet open={open} onClose={onClose} title="Export" side="right" width="w-full max-w-sm">
      <div className="space-y-6">

        {/* Camp data CSV */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Camp Data</h3>
          <div className="space-y-2.5">
            <button
              onClick={() => { downloadCsv(filteredCamps, "camps-filtered.csv"); onClose() }}
              className="w-full flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
            >
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                <Icon name="filter" size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Current view</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {filteredCamps.length} camp{filteredCamps.length !== 1 ? "s" : ""} · CSV
                </p>
              </div>
            </button>

            <button
              onClick={() => { downloadCsv(camps, "camps-all.csv"); onClose() }}
              className="w-full flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
            >
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
                <Icon name="export" size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">All camps</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {camps.length} total · CSV
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* Summer Plan — ICS calendar export */}
        {children.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Summer Plan · Calendar
            </h3>
            {childrenWithPlans.length === 0 ? (
              <p className="text-xs text-slate-400 px-1">
                Add camps to your plan to export a calendar.
              </p>
            ) : (
              <div className="space-y-2.5">
                {childrenWithPlans.map((kid) => {
                  const plan = plans[kid.id] ?? {}
                  const weekCount = Object.values(plan).filter(Boolean).length
                  return (
                    <button
                      key={kid.id}
                      onClick={() => {
                        const ics = toIcs(kid, plan, campById, summerWeeks)
                        downloadIcs(ics, `${kid.name.toLowerCase().replace(/\s+/g, "-")}-summer-2026.ics`)
                        onClose()
                      }}
                      className="w-full flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                        <Icon name="calendar" size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{kid.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {weekCount} week{weekCount !== 1 ? "s" : ""} planned · .ics
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )}

      </div>
    </Sheet>
  )
}
