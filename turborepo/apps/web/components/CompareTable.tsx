"use client"

import React from "react"
import { Modal, Button } from "@repo/ui/components"
import { Icon } from "@repo/ui/Icon"
import type { CampSession } from "@repo/core"
import { formatCampType, formatPrice, formatCare, formatDateRange, campTypeColors } from "@repo/core"

interface CompareTableProps {
  /** When true, renders inline (no modal wrapper). Used in Compare tab. */
  inline?: boolean
  open?: boolean
  onClose?: () => void
  camps: CampSession[]
  onRemove: (id: string) => void
}

const ROWS: Array<{ label: string; render: (c: CampSession) => React.ReactNode }> = [
  { label: "Type", render: (c) => formatCampType(c.camp_type) },
  { label: "Week", render: (c) => formatDateRange(c.week_date_range) },
  { label: "Ages / Grades", render: (c) => c.ages_grades ?? "—" },
  { label: "Distance", render: (c) => c.distance_from_princeton ?? "—" },
  { label: "Hours", render: (c) => c.daily_start_time && c.daily_end_time ? `${c.daily_start_time} – ${c.daily_end_time}` : "—" },
  { label: "Before Care", render: (c) => formatCare(c.before_care) },
  { label: "After Care", render: (c) => formatCare(c.after_care) },
  { label: "Tuition", render: (c) => formatPrice(c.price_tuition) },
  { label: "Reg. Fee", render: (c) => formatPrice(c.registration_fee) },
  { label: "Activity", render: (c) => c.weekly_activity ?? "—" },
  { label: "Skill Level", render: (c) => c.skill_level ?? "—" },
  { label: "Meals", render: (c) => c.meals_included ?? "—" },
  { label: "Setting", render: (c) => c.indoor_outdoor ?? "—" },
  { label: "Reg. Deadline", render: (c) => c.registration_deadlines ?? "—" },
  { label: "Verification", render: (c) => c.verification_status ?? "—" },
  { label: "Completeness", render: (c) => `${c.completeness_pct}%` },
]

function CompareContent({ camps, onRemove }: { camps: CampSession[]; onRemove: (id: string) => void }) {
  const colWidth = camps.length === 1 ? "w-64" : camps.length === 2 ? "w-56" : "w-48"

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="w-36 min-w-[144px] text-left px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wide sticky left-0">
              Field
            </th>
            {camps.map((camp) => {
              const typeColor = campTypeColors[camp.camp_type ?? ""] ?? "bg-slate-100 text-slate-600"
              return (
                <th key={camp.id} className={`${colWidth} min-w-[160px] px-4 py-3 border-b border-slate-200 text-left align-top`}>
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm leading-snug">{camp.camp_name}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>
                        {formatCampType(camp.camp_type)}
                      </span>
                    </div>
                    <button
                      onClick={() => onRemove(camp.id)}
                      className="shrink-0 p-1 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                  {camp.source_url && (
                    <a
                      href={camp.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 mt-1"
                    >
                      <Icon name="link" size={11} />
                      Source
                    </a>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
              <td className="px-4 py-2.5 text-xs font-medium text-slate-500 sticky left-0 bg-inherit border-r border-slate-100">
                {row.label}
              </td>
              {camps.map((camp) => (
                <td key={camp.id} className="px-4 py-2.5 text-sm text-slate-700 align-top">
                  {row.render(camp)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CompareTable({ inline = false, open, onClose, camps, onRemove }: CompareTableProps) {
  if (camps.length === 0) return null

  if (inline) {
    return (
      <div className="pb-16">
        <div className="px-4 py-3 border-b border-slate-100 bg-white sticky top-0 z-10">
          <p className="text-sm font-semibold text-slate-900">
            Comparing {camps.length} camp{camps.length !== 1 ? "s" : ""}
          </p>
        </div>
        <CompareContent camps={camps} onRemove={onRemove} />
      </div>
    )
  }

  return (
    <Modal open={open ?? false} onClose={onClose ?? (() => {})} title="Compare Camps" maxWidth="max-w-4xl">
      <CompareContent camps={camps} onRemove={onRemove} />
    </Modal>
  )
}
