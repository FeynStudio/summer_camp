# Summer Camp Agent — Project Memory

**Owner:** Agent Echo (noreply.feynstudio@gmail.com)
**Last updated:** 2026-06-05

---

## What This Project Is

Automated research agent that searches the web for summer camps near Princeton, NJ, builds a 27-column parent-ready comparison table, and persists results to Supabase. Runs on a Cowork schedule and preserves year-over-year history — rows are never overwritten or deleted.

---

## Key File Locations

| File | Purpose |
|---|---|
| `docs/prompts/Summer Camp Project master prompt.md` | Full agent instructions (4-pass research + DB persistence) |
| `docs/agent-tools.ts` | 6 tool definitions + implementations (web_search + 5 Supabase tools) |
| `scripts/run-agent.ts` | Standalone agentic loop runner |
| `docs/HANDOFF.md` | Full technical handoff document |
| `supabase/migrations/20260429021819_organizations.sql` | `organizations` table ({{CAMP}} database) |
| `supabase/migrations/20260523000001_camp_sessions.sql` | `research_runs` + `camp_sessions` tables |
| `supabase/migrations/20260605000001_best_camp_sessions_view.sql` | `camp_sessions_scored` + `best_camp_sessions` views (deployed 2026-06-05) |
| `../Data Layer Handoff - June 5 2026.docx` | Session handoff doc — data layer dedup design and decisions |
| `.env.example` | Environment variable template |
| `.env` | Live credentials (all 4 keys populated as of 2026-06-05) |

---

## Supabase

- **Project name:** Summer Camp Agent
- **Project ref:** `otnqncflxfncjzpeennu`
- **URL:** `https://otnqncflxfncjzpeennu.supabase.co`
- **Tables:** `organizations`, `research_runs`, `camp_sessions`
- **Views (deployed 2026-06-05):**
  - `camp_sessions_scored` — all rows + `completeness_score` (0–23) + `completeness_pct` (0–100) + `run_date`
  - `best_camp_sessions` — one best row per `(organization_id, camp_name, camp_type, split_part(camp_id,'_',4))`; highest score wins, tiebreak by `run_date DESC`. **Primary app query target.**

---

## How to Run

```bash
pnpm install              # first time only
pnpm research             # research current year
pnpm research:year 2027   # specific year
```

**Scheduled task:** `annual-summer-camp-research` in Cowork sidebar → Scheduled
**Schedule:** 1:00 AM on the 9th, 18th, and 27th of each month, January–July

---

## Camp ID Format

```
{{YEAR}}_{{CAMP}}_{{CATEGORY}}_W[week]_[seq]
```

Example: `2026_PRNRC_REC_W01_01`

- `{{CAMP}}` — ≤5 char uppercase code from `organizations.abbr`
- `{{CATEGORY}}` — one of: `GEN SPRTS BASE BSKT SOCR TNIS ROW VB FH MART DANCE CHESS MATH AOSP SCI CODE ART THTR MUS NAT WRIT PREP REC`
- `W[week]` — 2-digit week of summer the session starts (e.g. `W03`)
- `[seq]` — 2-digit disambiguator for same provider/category/week

---

## Agent Tools (`docs/agent-tools.ts`)

| Tool | Purpose |
|---|---|
| `web_search` | Tavily — used for all 4 research passes |
| `create_research_run` | Register a new run, returns `run_id` |
| `complete_research_run` | Mark run `completed` or `failed` |
| `lookup_organization` | Check if provider exists in `organizations` |
| `upsert_organization` | Add new provider, or return existing unchanged |
| `upsert_camp_session` | Insert/update one camp row for current run only |

---

## User Preferences

- **Single table output** — all data in one 27-column Final Output Table; no separate Best Fit Summary, Coverage Audit, or Info to Confirm sections
- **Year-over-year preservation** — never overwrite or delete historical rows; always insert new rows
- **`organizations` is the source of truth** — always `lookup_organization` before `upsert_organization`
- **Prose over bullets** in explanations; minimal formatting
- **Standalone scripts** over Next.js API routes for long-running agent work
- **Cowork schedule skill** for all scheduled tasks
- **Console logs** for run monitoring (no UI dashboard needed)
- Prefers up to 5 clarifying questions before starting ambiguous multi-step work

---

## Environment Variables

All 4 keys are set in `.env`. Template in `.env.example`.

| Variable | Source |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `TAVILY_API_KEY` | app.tavily.com (free tier: 1,000 searches/month) |
| `SUPABASE_URL` | `https://otnqncflxfncjzpeennu.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard → Settings → API → service_role key |

---

## First-Run Checklist

- [ ] Run `pnpm install` in this folder
- [ ] Apply Supabase migrations (`supabase db push` or via dashboard)
- [ ] Click **Run now** on the Cowork scheduled task once to pre-approve tool permissions

---

## Open Decisions

| # | Decision | Detail |
|---|---|---|
| 1 | **Upsert conflict key** | Currently `unique(run_id, camp_id)` — each run inserts new rows, never updates old ones. A change to `unique(camp_id)` was drafted and reverted for review. Full scope in `Data Layer Handoff - June 5 2026.docx` Section 7. |
| 2 | **Web app query target** | Should query `best_camp_sessions` view, not raw `camp_sessions`. Not yet wired up. |

---

## Open Issues (minor, not blocking)

1. Typo `abbriviation` → `abbreviation` in master prompt Variables section
2. `{{CATEGORY}}` not declared in master prompt Variables section
3. Formatting inconsistency on line 8 of master prompt Variables section
