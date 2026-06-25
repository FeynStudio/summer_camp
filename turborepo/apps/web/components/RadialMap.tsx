"use client"

import { Modal } from "@repo/ui/components"
import type { CampSession } from "@repo/core"
import { parseDistanceMiles, formatCampType, campTypeColors } from "@repo/core"

interface RadialMapProps {
  /** When true, renders inline (no modal wrapper). Used in Map tab. */
  inline?: boolean
  open?: boolean
  onClose?: () => void
  camps: CampSession[]
  onSelect: (camp: CampSession) => void
}

const MAX_RADIUS_MI = 10
const CENTER_LABEL = "Princeton, NJ"
const SVG_SIZE = 440
const CENTER = SVG_SIZE / 2
const MAX_RING_R = 185
const RINGS = [2, 5, 10]

function miToR(mi: number) {
  return Math.min((mi / MAX_RADIUS_MI) * MAX_RING_R, MAX_RING_R)
}

function campAngle(campId: string): number {
  let hash = 0
  for (let i = 0; i < campId.length; i++) {
    hash = (hash * 31 + campId.charCodeAt(i)) >>> 0
  }
  return (hash % 360) * (Math.PI / 180)
}

function MapContent({ camps, onSelect, onClose }: { camps: CampSession[]; onSelect: (c: CampSession) => void; onClose?: () => void }) {
  const mappable = camps.filter((c) => parseDistanceMiles(c.distance_from_princeton) !== null)
  const unmappable = camps.filter((c) => parseDistanceMiles(c.distance_from_princeton) === null)

  return (
    <div className="flex flex-col md:flex-row gap-0">
      {/* SVG Map */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200">
        <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} width={SVG_SIZE} height={SVG_SIZE} className="w-full max-w-[380px]">
          {RINGS.map((mi, i) => (
            <circle key={mi} cx={CENTER} cy={CENTER} r={miToR(mi)}
              fill={i % 2 === 0 ? "#f8fafc" : "#f1f5f9"} stroke="#e2e8f0" strokeWidth={1} />
          ))}
          {RINGS.map((mi) => (
            <text key={`label-${mi}`} x={CENTER + miToR(mi) + 4} y={CENTER - 4}
              fontSize={9} fill="#94a3b8" fontFamily="sans-serif">
              {mi}mi
            </text>
          ))}
          <circle cx={CENTER} cy={CENTER} r={6} fill="#3b82f6" />
          <text x={CENTER} y={CENTER + 18} textAnchor="middle" fontSize={10}
            fontWeight="600" fill="#1d4ed8" fontFamily="sans-serif">
            {CENTER_LABEL}
          </text>
          {mappable.map((camp) => {
            const mi = parseDistanceMiles(camp.distance_from_princeton)!
            const r = miToR(mi)
            const angle = campAngle(camp.camp_id)
            const x = CENTER + r * Math.cos(angle)
            const y = CENTER + r * Math.sin(angle)
            return (
              <g key={camp.id} onClick={() => { onSelect(camp); onClose?.() }} className="cursor-pointer">
                <circle cx={x} cy={y} r={7} fill="#6366f1" opacity={0.85}
                  stroke="white" strokeWidth={1.5} className="hover:opacity-100 transition-opacity" />
                <title>{camp.camp_name} ({mi.toFixed(1)} mi)</title>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend / list */}
      <div className="w-full md:w-64 overflow-y-auto max-h-[400px]">
        <div className="p-4 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {mappable.length} camps with distance data
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {[...mappable]
            .sort((a, b) => {
              const am = parseDistanceMiles(a.distance_from_princeton) ?? 99
              const bm = parseDistanceMiles(b.distance_from_princeton) ?? 99
              return am - bm
            })
            .map((camp) => {
              const mi = parseDistanceMiles(camp.distance_from_princeton)
              return (
                <li key={camp.id}>
                  <button
                    onClick={() => { onSelect(camp); onClose?.() }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{camp.camp_name}</p>
                      <p className="text-xs text-slate-400">{formatCampType(camp.camp_type)}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{mi?.toFixed(1)}mi</span>
                  </button>
                </li>
              )
            })}
          {unmappable.length > 0 && (
            <li className="px-4 py-2 text-xs text-slate-400">
              +{unmappable.length} without distance data
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

export function RadialMap({ inline = false, open, onClose, camps, onSelect }: RadialMapProps) {
  if (inline) {
    return (
      <div className="pb-16">
        <MapContent camps={camps} onSelect={onSelect} />
      </div>
    )
  }

  return (
    <Modal open={open ?? false} onClose={onClose ?? (() => {})} title="Distance Map — Princeton, NJ" maxWidth="max-w-3xl">
      <MapContent camps={camps} onSelect={onSelect} onClose={onClose} />
    </Modal>
  )
}
