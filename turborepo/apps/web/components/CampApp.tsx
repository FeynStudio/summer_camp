"use client"

import { useState, useMemo } from "react"
import { trpc } from "../lib/trpc/client"
import { Icon, type IconName } from "@repo/ui/Icon"
import { Button, Badge, Spinner, Empty } from "@repo/ui/components"
import { FilterSheet } from "./FilterSheet"
import { DetailSheet } from "./DetailSheet"
import { CompareTable } from "./CompareTable"
import { ExportSheet } from "./ExportSheet"
import { RadialMap } from "./RadialMap"
import { PlanScreen, usePlanState } from "./PlanScreen"
import type { CampSession, CampFilters } from "@repo/core"
import {
  matchesFilters,
  sortCamps,
  DEFAULT_FILTERS,
  formatCampType,
  formatPrice,
  formatDateRange,
  formatCare,
  completenessColor,
  campTypeColors,
  deriveSummerWeeks,
  type SortKey,
  type SummerWeek,
} from "@repo/core"

type Tab = "plan" | "search" | "compare" | "map"

// ── Camp Card ────────────────────────────────────────────────

function CampCard({
  camp,
  onSelect,
  onCompare,
  inCompare,
  compareDisabled,
}: {
  camp: CampSession
  onSelect: () => void
  onCompare: () => void
  inCompare: boolean
  compareDisabled: boolean
}) {
  const typeColor = campTypeColors[camp.camp_type ?? ""] ?? "bg-slate-100 text-slate-700"

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
          {camp.camp_name}
        </h3>
        <Badge className={`${typeColor} shrink-0`}>{formatCampType(camp.camp_type)}</Badge>
      </div>

      <div className="space-y-1 mb-3">
        {camp.week_date_range && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name="calendar" size={12} className="shrink-0" />
            <span className="truncate">{formatDateRange(camp.week_date_range)}</span>
          </div>
        )}
        {camp.location_address && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name="location" size={12} className="shrink-0" />
            <span className="truncate">{camp.location_address}</span>
          </div>
        )}
        {camp.ages_grades && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name="user" size={12} className="shrink-0" />
            <span>{camp.ages_grades}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3 text-xs">
        {camp.price_tuition && (
          <div className="flex items-center gap-1 font-medium text-slate-700">
            <Icon name="money" size={12} />
            <span>{formatPrice(camp.price_tuition)}</span>
          </div>
        )}
        {formatCare(camp.before_care) === "Yes" && (
          <span className="text-slate-400">🌅 Before</span>
        )}
        {formatCare(camp.after_care) === "Yes" && (
          <span className="text-slate-400">🌇 After</span>
        )}
      </div>

      {(camp.best_fit_tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {camp.best_fit_tags!.slice(0, 3).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full">
              {tag}
            </span>
          ))}
          {camp.best_fit_tags!.length > 3 && (
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[10px] rounded-full">
              +{camp.best_fit_tags!.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${completenessColor(camp.completeness_pct)}`}>
          {camp.completeness_pct}% complete
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onCompare() }}
          disabled={!inCompare && compareDisabled}
          className={`p-1.5 rounded-lg transition-colors ${
            inCompare
              ? "text-blue-600 bg-blue-50"
              : "text-slate-300 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"
          }`}
          title={inCompare ? "Remove from compare" : compareDisabled ? "Max 3 camps" : "Add to compare"}
        >
          <Icon name="compare" size={14} />
        </button>
      </div>
    </div>
  )
}

// ── CampApp ──────────────────────────────────────────────────

export function CampApp() {
  // Remote data
  const { data: allCamps = [], isLoading, error } = trpc.camps.list.useQuery()
  const { data: years = [] } = trpc.camps.years.useQuery()

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>("plan")

  // Plan state (persisted to localStorage)
  const [planState, setPlanState] = usePlanState()

  // Search tab state
  const [filters, setFilters] = useState<CampFilters>(DEFAULT_FILTERS)
  const [sortKey, setSortKey] = useState<SortKey>("camp_name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [search, setSearch] = useState("")
  const [showFilter, setShowFilter] = useState(false)
  const [showExport, setShowExport] = useState(false)

  // Shared state
  const [selectedCamp, setSelectedCamp] = useState<CampSession | null>(null)
  const [compareList, setCompareList] = useState<CampSession[]>([])

  // Derive summer weeks from actual camp data (uses DB week_key values e.g. "W22")
  const summerWeeks = useMemo(() => deriveSummerWeeks(allCamps), [allCamps])

  // Derived
  const activeYear = years[0] ?? new Date().getFullYear()

  // Memoized so the object reference only changes when filter values actually change.
  // Without this, activeFilters is a new literal on every render and the filtered
  // memo below re-runs on every keystroke regardless of whether anything changed.
  const activeFilters = useMemo<CampFilters>(
    () => ({ ...filters, search, year: filters.year || activeYear }),
    [filters, search, activeYear],
  )

  const filtered = useMemo(
    () => sortCamps(allCamps.filter((c) => matchesFilters(c, activeFilters)), sortKey, sortDir),
    [allCamps, activeFilters, sortKey, sortDir],
  )

  const activeFilterCount = [
    filters.campTypes.length > 0,
    filters.bestFitTags.length > 0,
    filters.hasBeforeCare,
    filters.hasAfterCare,
    !!filters.indoorOutdoor,
    filters.verifiedOnly,
  ].filter(Boolean).length

  function toggleCompare(camp: CampSession) {
    setCompareList((prev) => {
      if (prev.some((c) => c.id === camp.id)) return prev.filter((c) => c.id !== camp.id)
      if (prev.length >= 3) return prev
      return [...prev, camp]
    })
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Empty
          icon={<Icon name="x-circle" size={48} />}
          title="Failed to load camps"
          description={error.message}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Global header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Icon name="camp" size={17} />
            </div>
            <span className="font-semibold text-slate-900">Camp Planner</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setShowExport(true)}>
              <Icon name="export" size={15} />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Search toolbar — only on search tab */}
      {activeTab === "search" && (
        <div className="bg-white border-b border-slate-100 sticky top-[57px] z-20">
          <div className="max-w-2xl mx-auto px-4 py-2 space-y-2">
            {/* Search bar */}
            <div className="relative">
              <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search camps…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors placeholder:text-slate-300"
              />
            </div>
            {/* Filter row */}
            <div className="flex items-center gap-2">
              <Button
                variant={activeFilterCount > 0 ? "primary" : "secondary"}
                size="sm"
                onClick={() => setShowFilter(true)}
              >
                <Icon name="filter" size={14} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 bg-white/30 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <span className="text-xs text-slate-400">
                {isLoading ? "Loading…" : `${filtered.length} of ${allCamps.length}`}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="camp_name">Name</option>
                  <option value="week_date_range">Week</option>
                  <option value="price_tuition">Price</option>
                  <option value="distance_from_princeton">Distance</option>
                  <option value="completeness_pct">Completeness</option>
                </select>
                <button
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
                  title={sortDir === "asc" ? "Ascending" : "Descending"}
                >
                  <Icon name={sortDir === "asc" ? "chevron-down" : "chevron-right"} size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto">
        {/* Plan tab */}
        {activeTab === "plan" && (
          <PlanScreen
            planState={planState}
            onPlanChange={setPlanState}
            allCamps={allCamps}
            isLoading={isLoading}
            onSelectCamp={setSelectedCamp}
            summerWeeks={summerWeeks}
          />
        )}

        {/* Search tab */}
        {activeTab === "search" && (
          <div className="flex-1 px-4 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3">
                  <Spinner size={32} />
                  <p className="text-sm text-slate-400">Loading camps…</p>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <Empty
                icon={<Icon name="camp" size={48} />}
                title="No camps found"
                description={
                  activeFilterCount > 0 || search
                    ? "Try clearing some filters or broadening your search."
                    : "No camp data yet. Run the research agent to populate camps."
                }
                action={
                  activeFilterCount > 0 || search ? (
                    <Button variant="secondary" onClick={() => { setFilters(DEFAULT_FILTERS); setSearch("") }}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((camp) => (
                  <CampCard
                    key={camp.id}
                    camp={camp}
                    onSelect={() => setSelectedCamp(camp)}
                    onCompare={() => toggleCompare(camp)}
                    inCompare={compareList.some((c) => c.id === camp.id)}
                    compareDisabled={compareList.length >= 3}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Compare tab */}
        {activeTab === "compare" && (
          <div className="flex-1 overflow-auto">
            {compareList.length === 0 ? (
              <Empty
                icon={<Icon name="compare" size={48} />}
                title="No camps selected"
                description="Go to Search and tap the compare icon on any camp card to add it here (max 3)."
                action={<Button variant="secondary" onClick={() => setActiveTab("search")}>Go to Search</Button>}
              />
            ) : (
              <CompareTable
                inline
                camps={compareList}
                onRemove={(id) => setCompareList((prev) => prev.filter((c) => c.id !== id))}
              />
            )}
          </div>
        )}

        {/* Map tab */}
        {activeTab === "map" && (
          <div className="flex-1 overflow-auto">
            <RadialMap
              inline
              camps={filtered.length > 0 ? filtered : allCamps}
              onSelect={(camp) => { setSelectedCamp(camp) }}
            />
          </div>
        )}
      </main>

      {/* Bottom tab nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30">
        <div className="max-w-2xl mx-auto flex">
          {(
            [
              { id: "plan", icon: "calendar", label: "Plan" },
              { id: "search", icon: "search", label: "Search" },
              { id: "compare", icon: "compare", label: "Compare", badge: compareList.length },
              { id: "map", icon: "map", label: "Map" },
            ] as Array<{ id: Tab; icon: string; label: string; badge?: number }>
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors relative ${
                activeTab === tab.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon name={tab.icon as IconName} size={22} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {tab.badge != null && tab.badge > 0 && (
                <span className="absolute -top-0.5 right-[calc(50%-18px)] min-w-[16px] h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Sheets */}
      <FilterSheet
        open={showFilter}
        onClose={() => setShowFilter(false)}
        filters={filters}
        onChange={setFilters}
        availableYears={years}
        camps={allCamps}
      />
      <DetailSheet
        camp={selectedCamp}
        onClose={() => setSelectedCamp(null)}
        onCompare={toggleCompare}
        compareList={compareList}
        planState={planState}
        onPlanChange={setPlanState}
        summerWeeks={summerWeeks}
      />
      <ExportSheet
        open={showExport}
        onClose={() => setShowExport(false)}
        camps={allCamps}
        filteredCamps={filtered}
        planState={planState}
        summerWeeks={summerWeeks}
      />
    </div>
  )
}
