/**
 * agent-tools.ts
 *
 * Claude API tool definitions and implementations for the Summer Camp research agent.
 * Includes: Tavily web search + Supabase persistence tools.
 *
 * Usage: pass TOOL_DEFINITIONS to the `tools` array in your
 * Anthropic API call, and wire handleToolCall into your tool_use dispatch loop.
 *
 * Required environment variables:
 *   TAVILY_API_KEY        — from app.tavily.com
 *   SUPABASE_URL          — e.g. https://xyzxyz.supabase.co
 *   SUPABASE_SERVICE_KEY  — service role key (keep server-side only)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
}

export interface SupabaseOrganization {
  id: string;
  name: string;
  abbr: string;
  kind: "provider" | "school" | "organization";
  created_at: string;
}

export interface SupabaseResearchRun {
  id: string;
  year: number;
  run_date: string;
  model: string | null;
  notes: string | null;
  status: "in_progress" | "completed" | "failed";
  created_at: string;
}

export interface UpsertCampSessionInput {
  run_id: string;
  year: number;
  camp_id: string;
  organization_id?: string;
  week_date_range?: string;
  individual_week?: string;
  camp_name: string;
  location_address?: string;
  source_url?: string;
  distance_from_princeton?: string;
  ages_grades?: string;
  daily_start_time?: string;
  daily_end_time?: string;
  before_care?: string;
  after_care?: string;
  price_tuition?: string;
  registration_fee?: string;
  camp_type?: string;
  weekly_activity?: string;
  skill_level?: string;
  meals_included?: string;
  indoor_outdoor?: string;
  registration_start_date?: string;
  registration_deadlines?: string;
  cancellation_refund_notes?: string;
  verification_status?: string;
  source_type_date_checked?: string;
  best_fit_tags?: string[];
  registration_notes?: string;
}

// ---------------------------------------------------------------------------
// Tavily web search implementation
// ---------------------------------------------------------------------------

/**
 * web_search
 * Search the web via Tavily and return the top results.
 * Used by the agent during all four research passes.
 */
async function webSearch(input: {
  query: string;
  max_results?: number;
}): Promise<TavilySearchResponse> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY must be set.");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query: input.query,
      max_results: input.max_results ?? 10,
      search_depth: "advanced",
      include_answer: false,
      include_raw_content: false,
    }),
  });
  if (!res.ok) throw new Error(`web_search failed: ${await res.text()}`);
  return res.json() as Promise<TavilySearchResponse>;
}

// ---------------------------------------------------------------------------
// Supabase REST helpers
// ---------------------------------------------------------------------------

function supabaseHeaders(): Record<string, string> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.");
  return {
    "Content-Type": "application/json",
    "apikey": key,
    "Authorization": `Bearer ${key}`,
  };
}

function supabaseUrl(path: string): string {
  return `${process.env.SUPABASE_URL}/rest/v1${path}`;
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

/**
 * create_research_run
 * Register a new run at the start of the persistence phase.
 * Returns the new run's UUID to use as run_id in all subsequent calls.
 */
async function createResearchRun(input: {
  year: number;
  model?: string;
  notes?: string;
}): Promise<SupabaseResearchRun> {
  const res = await fetch(supabaseUrl("/research_runs"), {
    method: "POST",
    headers: { ...supabaseHeaders(), "Prefer": "return=representation" },
    body: JSON.stringify({
      year: input.year,
      model: input.model ?? null,
      notes: input.notes ?? null,
      status: "in_progress",
    }),
  });
  if (!res.ok) throw new Error(`create_research_run failed: ${await res.text()}`);
  const rows = await res.json() as SupabaseResearchRun[];
  return rows[0];
}

/**
 * complete_research_run
 * Mark a run as completed or failed once all camp sessions are upserted.
 */
async function completeResearchRun(input: {
  run_id: string;
  status: "completed" | "failed";
  notes?: string;
}): Promise<void> {
  const res = await fetch(supabaseUrl(`/research_runs?id=eq.${input.run_id}`), {
    method: "PATCH",
    headers: { ...supabaseHeaders(), "Prefer": "return=minimal" },
    body: JSON.stringify({
      status: input.status,
      ...(input.notes ? { notes: input.notes } : {}),
    }),
  });
  if (!res.ok) throw new Error(`complete_research_run failed: ${await res.text()}`);
}

/**
 * lookup_organization
 * Check whether a provider already exists in the {{CAMP}} database.
 * Returns the existing record, or null if not found.
 */
async function lookupOrganization(input: {
  name: string;
}): Promise<SupabaseOrganization | null> {
  const encoded = encodeURIComponent(input.name);
  const res = await fetch(supabaseUrl(`/organizations?name=eq.${encoded}&limit=1`), {
    method: "GET",
    headers: supabaseHeaders(),
  });
  if (!res.ok) throw new Error(`lookup_organization failed: ${await res.text()}`);
  const rows = await res.json() as SupabaseOrganization[];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * upsert_organization
 * Add a new provider to the {{CAMP}} database, or return the existing record
 * unchanged if one already exists with the same name.
 * Never overwrites an existing abbreviation.
 */
async function upsertOrganization(input: {
  name: string;
  abbr: string;
  kind: "provider" | "school" | "organization";
}): Promise<SupabaseOrganization> {
  // Always check first — only insert if truly new.
  const existing = await lookupOrganization({ name: input.name });
  if (existing) return existing;

  const res = await fetch(supabaseUrl("/organizations"), {
    method: "POST",
    headers: { ...supabaseHeaders(), "Prefer": "return=representation" },
    body: JSON.stringify({
      name: input.name,
      abbr: input.abbr.toUpperCase().slice(0, 5),
      kind: input.kind,
    }),
  });
  if (!res.ok) throw new Error(`upsert_organization failed: ${await res.text()}`);
  const rows = await res.json() as SupabaseOrganization[];
  return rows[0];
}

/**
 * upsert_camp_session
 * Insert a camp session row, or update it if the same run_id + camp_id
 * already exists (idempotent within a run).
 * Rows from previous runs are NEVER touched.
 */
async function upsertCampSession(input: UpsertCampSessionInput): Promise<void> {
  const res = await fetch(supabaseUrl("/camp_sessions"), {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      // On conflict (run_id, camp_id), update all fields — idempotent within this run only.
      "Prefer": "return=minimal,resolution=merge-duplicates",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`upsert_camp_session failed: ${await res.text()}`);
}

// ---------------------------------------------------------------------------
// Claude API tool definitions
// Pass this array as `tools` in your Anthropic API call.
// ---------------------------------------------------------------------------

export const TOOL_DEFINITIONS = [
  // ── Web search ────────────────────────────────────────────────────────────
  {
    name: "web_search",
    description:
      "Search the web for current information about summer camps, programs, and providers. " +
      "Use this for every search query in Pass 1 (town-by-town), Pass 2 (category-by-category), " +
      "and Pass 3 (known-provider verification). " +
      "Always prefer results from official provider pages over third-party directories. " +
      "Returns a list of results with title, URL, and a content snippet.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query string, e.g. 'Princeton NJ 2026 summer camp tennis'.",
        },
        max_results: {
          type: "integer",
          description: "Number of results to return (default 10, max 20).",
        },
      },
      required: ["query"],
    },
  },

  // ── Supabase persistence ──────────────────────────────────────────────────
  {
    name: "create_research_run",
    description:
      "Register a new research run in the database before persisting any camp sessions. " +
      "Call this once at the start of the persistence phase. " +
      "Returns a run_id UUID that must be passed to every subsequent upsert_camp_session call.",
    input_schema: {
      type: "object",
      properties: {
        year:  { type: "integer", description: "The {{YEAR}} being researched (e.g. 2026)." },
        model: { type: "string",  description: "The Claude model performing this research." },
        notes: { type: "string",  description: "Optional notes about this run." },
      },
      required: ["year"],
    },
  },

  {
    name: "complete_research_run",
    description:
      "Mark a research run as completed or failed. " +
      "Call this once after all camp sessions have been upserted.",
    input_schema: {
      type: "object",
      properties: {
        run_id: { type: "string", description: "UUID returned by create_research_run." },
        status: { type: "string", enum: ["completed", "failed"], description: "Final run status." },
        notes:  { type: "string", description: "Optional closing notes or error summary." },
      },
      required: ["run_id", "status"],
    },
  },

  {
    name: "lookup_organization",
    description:
      "Check the {{CAMP}} database for an existing provider/school/organization by its full name. " +
      "Always call this before upsert_organization to avoid creating duplicates. " +
      "Returns the existing record (including its abbr/{{CAMP}} code) or null if not found.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full display name of the provider/school/organization." },
      },
      required: ["name"],
    },
  },

  {
    name: "upsert_organization",
    description:
      "Add a new provider/school/organization to the {{CAMP}} database. " +
      "If the name already exists, returns the existing record unchanged — it will NOT overwrite the stored abbreviation. " +
      "Only call this after lookup_organization returns null.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string",  description: "Full display name — must be unique." },
        abbr: { type: "string",  description: "Up to 5-character uppercase {{CAMP}} code." },
        kind: {
          type: "string",
          enum: ["provider", "school", "organization"],
          description: "Category of the entity.",
        },
      },
      required: ["name", "abbr", "kind"],
    },
  },

  {
    name: "upsert_camp_session",
    description:
      "Insert one camp session row into the database. " +
      "If a row with the same run_id and camp_id already exists (e.g. from a retry), it will be updated. " +
      "Rows from previous runs or previous years are NEVER modified. " +
      "Call this once per row in the Final Output Table.",
    input_schema: {
      type: "object",
      properties: {
        run_id:                    { type: "string",               description: "UUID from create_research_run." },
        year:                      { type: "integer",              description: "The {{YEAR}} being researched." },
        camp_id:                   { type: "string",               description: "Structured Camp ID: {{YEAR}}_{{CAMP}}_{{CATEGORY}}_W[week]_[seq]." },
        organization_id:           { type: "string",               description: "UUID from upsert_organization." },
        week_date_range:           { type: "string",               description: "Col 2: full session date range." },
        individual_week:           { type: "string",               description: "Col 3: individual week label." },
        camp_name:                 { type: "string",               description: "Col 4: camp or program name." },
        location_address:          { type: "string",               description: "Col 6: physical address." },
        source_url:                { type: "string",               description: "Col 7: URL or source reference." },
        distance_from_princeton:   { type: "string",               description: "Col 8: approx. distance from downtown Princeton 08540." },
        ages_grades:               { type: "string",               description: "Col 9: target ages or grade range." },
        daily_start_time:          { type: "string",               description: "Col 10: daily start time." },
        daily_end_time:            { type: "string",               description: "Col 11: daily end time." },
        before_care:               { type: "string",               description: "Col 12: before-care availability." },
        after_care:                { type: "string",               description: "Col 13: after-care availability." },
        price_tuition:             { type: "string",               description: "Col 14: price/tuition." },
        registration_fee:          { type: "string",               description: "Col 15: registration or extra fees." },
        camp_type:                 { type: "string",               description: "Col 16: camp type category." },
        weekly_activity:           { type: "string",               description: "Col 17: specific weekly activity or program." },
        skill_level:               { type: "string",               description: "Col 18: skill level if posted." },
        meals_included:            { type: "string",               description: "Col 19: meals/snacks/lunch included?" },
        indoor_outdoor:            { type: "string",               description: "Col 20: indoor / outdoor / mixed." },
        registration_start_date:   { type: "string",               description: "Col 21: registration open date." },
        registration_deadlines:    { type: "string",               description: "Col 22: registration deadlines and notes." },
        cancellation_refund_notes: { type: "string",               description: "Col 23: cancellation/refund policy." },
        verification_status:       { type: "string",               description: "Col 24: verification status label." },
        source_type_date_checked:  { type: "string",               description: "Col 25: source type and date checked." },
        best_fit_tags:             { type: "array", items: { type: "string" }, description: "Col 26: best fit tags array." },
        registration_notes:        { type: "string",               description: "Col 27: registration confirmation and missing info notes." },
      },
      required: ["run_id", "year", "camp_id", "camp_name"],
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Tool dispatch handler
// Wire this into your tool_use response loop.
// ---------------------------------------------------------------------------

export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "web_search":
      return webSearch(toolInput as Parameters<typeof webSearch>[0]);
    case "create_research_run":
      return createResearchRun(toolInput as Parameters<typeof createResearchRun>[0]);
    case "complete_research_run":
      return completeResearchRun(toolInput as Parameters<typeof completeResearchRun>[0]);
    case "lookup_organization":
      return lookupOrganization(toolInput as Parameters<typeof lookupOrganization>[0]);
    case "upsert_organization":
      return upsertOrganization(toolInput as Parameters<typeof upsertOrganization>[0]);
    case "upsert_camp_session":
      return upsertCampSession(toolInput as UpsertCampSessionInput);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
