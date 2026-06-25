"use client"

import { Sheet, Button, Chip } from "@repo/ui/components"
import { Icon } from "@repo/ui/Icon"
import type { CampFilters, CampSession } from "@repo/core"
import { CAMP_TYPES, DEFAULT_FILTERS, allTags } from "@repo/core"

interface FilterSheetProps {
  open: boolean
  onClose: () => void
  filters: CampFilters
  onChange: (filters: CampFilters) => void
  camps: CampSession[]
  availableYears: number[]
}

export function FilterSheet({ open, onClose, filters, onChange, camps, availableYears }: FilterSheetProps) {
  const tags = allTags(camps)

  function set<K extends keyof CampFilters>(key: K, value: CampFilters[K]) {
    onChange({ ...filters, [key]: value })
  }

  function toggleType(code: string) {
    const next = filters.campTypes.includes(code)
      ? filters.campTypes.filter((c) => c !== code)
      : [...filters.campTypes, code]
    set("campTypes", next)
  }

  function toggleTag(tag: string) {
    const next = filters.bestFitTags.includes(tag)
      ? filters.bestFitTags.filter((t) => t !== tag)
      : [...filters.bestFitTags, tag]
    set("bestFitTags", next)
  }

  const activeCount = [
    filters.campTypes.length > 0,
    filters.bestFitTags.length > 0,
    filters.hasBeforeCare,
    filters.hasAfterCare,
    !!filters.indoorOutdoor,
    filters.verifiedOnly,
  ].filter(Boolean).length

  return (
    <Sheet open={open} onClose={onClose} title={`Filters${activeCount > 0 ? ` (${activeCount})` : ""}`} side="left">
      <div className="space-y-6">
        {/* Year */}
        {availableYears.length > 1 && (
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Year</h3>
            <div className="flex flex-wrap gap-1.5">
              {availableYears.map((y) => (
                <Chip
                  key={y}
                  label={String(y)}
                  selected={filters.year === y}
                  onClick={() => set("year", y)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Camp type */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Camp Type</h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(CAMP_TYPES).map(([code, label]) => (
              <Chip
                key={code}
                label={label}
                selected={filters.campTypes.includes(code)}
                onClick={() => toggleType(code)}
              />
            ))}
          </div>
        </section>

        {/* Care */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Care Options</h3>
          <div className="flex gap-2">
            <Chip
              label="Before Care"
              selected={filters.hasBeforeCare}
              onClick={() => set("hasBeforeCare", !filters.hasBeforeCare)}
            />
            <Chip
              label="After Care"
              selected={filters.hasAfterCare}
              onClick={() => set("hasAfterCare", !filters.hasAfterCare)}
            />
          </div>
        </section>

        {/* Indoor / Outdoor */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Setting</h3>
          <div className="flex gap-1.5">
            {["Indoor", "Outdoor", "Mixed"].map((opt) => (
              <Chip
                key={opt}
                label={opt}
                selected={filters.indoorOutdoor === opt}
                onClick={() => set("indoorOutdoor", filters.indoorOutdoor === opt ? "" : opt)}
              />
            ))}
          </div>
        </section>

        {/* Verified only */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Quality</h3>
          <Chip
            label="Verified listings only"
            selected={filters.verifiedOnly}
            onClick={() => set("verifiedOnly", !filters.verifiedOnly)}
          />
        </section>

        {/* Best fit tags */}
        {tags.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Best Fit Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={filters.bestFitTags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Reset */}
        {activeCount > 0 && (
          <Button
            variant="ghost"
            className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => onChange({ ...DEFAULT_FILTERS, year: filters.year })}
          >
            <Icon name="x-circle" size={16} />
            Clear all filters
          </Button>
        )}
      </div>
    </Sheet>
  )
}
