# Summer Camp Agent — Project Handoff

**Last updated:** 2026-06-05
**Project folder:** `C:\Projects\summer_camp_agent\turborepo`
**Supabase project:** `otnqncflxfncjzpeennu` (Summer Camp Agent)

---

## What This Project Does

An automated research agent that searches the web for summer camps near Princeton, NJ, builds a comprehensive parent-ready comparison table, and persists all results to Supabase. Runs on a schedule via Cowork and preserves year-over-year history.

---

## Repository Layout

```
turborepo/
├── docs/
│   ├── prompts/
│   │   └── Summer Camp Project master prompt.md   ← Full agent instructions
│   ├── agent-tools.ts                             ← Tool definitions + implementations
│   └── HANDOFF.md                                 ← This file
├── scripts/
│   └── run-agent.ts                               ← Standalone agent runner
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20260429021819_organizations.sql        ← {{CAMP}} database
│       ├── 20260523000001_camp_sessions.sql        ← Research runs + camp sessions
│       └── 20260605000001_best_camp_sessions_view.sql  ← Scoring + dedup views
├── .env.example                                   ← Environment variable template
├── package.json                                   ← Dependencies + run scripts
└── turbo.json

# Project root (C:\Projects\summer_camp_agent\)
Data Layer Handoff - June 5 2026.docx             ← Full session handoff document
```

---

## Database Schema (Supabase)

### `organizations`
The `{{CAMP}}` database — canonical list of providers with their abbreviations.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | Full display name, unique |
| abbr | varchar(5) | Uppercase abbreviation, unique, max 5 chars |
| kind | text | `provider` / `school` / `organization` |
| created_at | timestamptz | |

### `research_runs`
One row per agent execution. Never deleted.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| year | integer | {{YEAR}} researched |
| run_date | timestamptz | When run started |
| model | text | Claude model used |
| notes | text | Optional operator notes |
| status | text | `in_progress` / `completed` / `failed` |
| created_at | timestamptz | |

### `camp_sessions`
One row per Final Output Table entry per run. Never deleted.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| run_id | uuid | FK → research_runs |
| year | integer | Denormalized for fast filtering |
| camp_id | text | `{{YEAR}}_{{CAMP}}_{{CATEGORY}}_W[week]_[seq]` |
| organization_id | uuid | FK → organizations |
| camp_name | text | Col 4 |
| week_date_range | text | Col 2 |
| individual_week | text | Col 3 |
| location_address | text | Col 6 |
| source_url | text | Col 7 |
| distance_from_princeton | text | Col 8 |
| ages_grades | text | Col 9 |
| daily_start_time | text | Col 10 |
| daily_end_time | text | Col 11 |
| before_care | text | Col 12 |
| after_care | text | Col 13 |
| price_tuition | text | Col 14 |
| registration_fee | text | Col 15 |
| camp_type | text | Col 16 |
| weekly_activity | text | Col 17 |
| skill_level | text | Col 18 |
| meals_included | text | Col 19 |
| indoor_outdoor | text | Col 20 |
| registration_start_date | text | Col 21 |
| registration_deadlines | text | Col 22 |
| cancellation_refund_notes | text | Col 23 |
| verification_status | text | Col 24 |
| source_type_date_checked | text | Col 25 |
| best_fit_tags | text[] | Col 26 — GIN indexed |
| registration_notes | text | Col 27 |
| created_at | timestamptz | |

Unique constraint: `(run_id, camp_id)` — idempotent within a run, never touches other runs.

### `camp_sessions_scored`  *(view — deployed 2026-06-05)*
All `camp_sessions` rows joined to `research_runs`, with two computed quality columns.

| Column | Type | Notes |
|---|---|---|
| *(all camp_sessions columns)* | | |
| run_date | timestamptz | From research_runs join |
| completeness_score | integer | 0–23. Count of non-null, non-placeholder fields |
| completeness_pct | integer | 0–100. `round(score / 23 * 100)` |

Placeholder = `trim(lower(value)) LIKE 'not posted%'`. Fields excluded from scoring: `camp_name` (always present), `individual_week` (null for single-week sessions by design).

### `best_camp_sessions`  *(view — deployed 2026-06-05)*
**Primary app query target.** One row per unique camp session — the highest-quality record across all research runs.

| Column | Type | Notes |
|---|---|---|
| *(all camp_sessions_scored columns)* | | |
| week_key | text | `split_part(camp_id, '_', 4)` — e.g. `W25` |

Dedup key: `(organization_id, camp_name, camp_type, week_key)`. Best row = highest `completeness_score`; tiebreak = `run_date DESC`.

---

## Camp ID Format

```
{{YEAR}}_{{CAMP}}_{{CATEGORY}}_W[week]_[seq]
```

Example: `2026_PRNRC_REC_W01_01`

| Segment | Rules |
|---|---|
| `{{YEAR}}` | 4-digit year |
| `{{CAMP}}` | ≤5 char uppercase abbreviation from `organizations.abbr` |
| `{{CATEGORY}}` | One of: `GEN`, `SPRTS`, `BASE`, `BSKT`, `SOCR`, `TNIS`, `ROW`, `VB`, `FH`, `MART`, `DANCE`, `CHESS`, `MATH`, `AOSP`, `SCI`, `CODE`, `ART`, `THTR`, `MUS`, `NAT`, `WRIT`, `PREP`, `REC` |
| `W[week]` | 2-digit week number of summer the session starts (e.g. `W01`) |
| `[seq]` | 2-digit sequence to disambiguate same provider/category/week |

---

## Agent Tools (`docs/agent-tools.ts`)

| Tool | Purpose |
|---|---|
| `web_search` | Tavily search — used for all 4 research passes |
| `create_research_run` | Register a new run, returns `run_id` |
| `complete_research_run` | Mark run `completed` or `failed` |
| `lookup_organization` | Check if provider exists in `organizations` |
| `upsert_organization` | Add new provider, or return existing unchanged |
| `upsert_camp_session` | Insert/update one camp row for current run only |

---

## How to Run

### Prerequisites
1. Copy `.env.example` → `.env` and fill in all 4 values (already done)
2. Run `pnpm install` in `turborepo/` to install dependencies

### Manual run (current year)
```bash
cd turborepo
pnpm research
```

### Manual run (specific year)
```bash
cd turborepo
pnpm research:year 2027
```

### Scheduled (Cowork)
Cowork task `annual-summer-camp-research` runs automatically at:
**1:00 AM on the 9th, 18th, and 27th of each month, January through July.**

Manage from the Scheduled section in the Cowork sidebar.

---

## Environment Variables

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `TAVILY_API_KEY` | app.tavily.com (free tier: 1,000 searches/month) |
| `SUPABASE_URL` | `https://otnqncflxfncjzpeennu.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard → Settings → API → service_role key |

---

## Master Prompt Summary (`docs/prompts/Summer Camp Project master prompt.md`)

The prompt instructs the agent to:
1. Search Princeton, NJ area (≤10 miles) across 12 towns and 27 categories
2. Execute 4 passes: town-by-town → category-by-category → known-provider verification → self-audit
3. Build one comprehensive 27-column Final Output Table (no separate sections)
4. Persist results to Supabase using the 5 DB tools
5. Preserve all year-over-year history — never overwrite old rows

Key output columns: Camp ID, dates, provider, address, ages, hours, before/after-care, price, fees, activities, skill level, meals, verification status, source, Best Fit Tags, registration notes.

---

## Open Issues (from prompt review — lower priority)

| # | Issue | Status |
|---|---|---|
| 2 | Typo "abbriviation" in Variables section | Not yet fixed |
| 6 | `{{CATEGORY}}` not defined in Variables section | Not yet fixed |
| 7 | Formatting inconsistency in Variables section | Not yet fixed |

Issues 4 (sorting conflict) and 5 (W01 anchor date) were resolved by the user prior to handoff.

---

## Open Decisions

| # | Decision | Detail |
|---|---|---|
| 1 | **Upsert conflict key** | Currently `unique(run_id, camp_id)` — each run inserts new rows and never updates old ones. A change to `unique(camp_id)` was drafted and reverted for review. If approved, requires: new migration (drop old constraint, add `unique(camp_id)`, add `updated_at`), update to `upsertCampSession()` in `agent-tools.ts`, and update to Step 3 rules in the master prompt. Check for existing duplicate `camp_id`s in production before applying the constraint. Full scope in `Data Layer Handoff - June 5 2026.docx` Section 7. |
| 2 | **Web app query target** | Should query `best_camp_sessions`, not `camp_sessions` directly. Not yet wired up. |

---

## First Run Checklist

- [ ] Run `pnpm install` in `turborepo/`
- [ ] Verify `.env` has all 4 keys populated
- [ ] Click **Run now** on the `annual-summer-camp-research` Cowork task to pre-approve tool permissions
- [ ] Confirm all 3 Supabase migrations are applied (`supabase/migrations/`)
- [ ] Review results in Supabase after first run completes — query `best_camp_sessions` for deduped output
