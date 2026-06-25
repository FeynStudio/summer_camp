-- ============================================================
-- research_runs
-- One row per agent research execution.
-- Rows are NEVER deleted — all year-over-year history is kept.
-- ============================================================

create table research_runs (
  id         uuid        primary key default gen_random_uuid(),
  year       integer     not null check (year >= 2020),
  run_date   timestamptz not null default now(),
  model      text,
  notes      text,
  status     text        not null default 'in_progress'
                         check (status in ('in_progress', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index research_runs_year_idx   on research_runs (year);
create index research_runs_status_idx on research_runs (status);

comment on table  research_runs          is 'One row per agent research execution. All years and re-runs are preserved — rows are never deleted or overwritten.';
comment on column research_runs.id       is 'Surrogate primary key.';
comment on column research_runs.year     is 'The {{YEAR}} being researched (e.g. 2026).';
comment on column research_runs.run_date is 'When this research run was started (UTC).';
comment on column research_runs.model    is 'Claude model used for this run (e.g. claude-sonnet-4-6).';
comment on column research_runs.notes    is 'Optional operator notes about this run.';
comment on column research_runs.status   is 'Run lifecycle state: in_progress | completed | failed.';


-- ============================================================
-- camp_sessions
-- One row per Final Output Table entry per research run.
-- Rows are NEVER deleted — all year-over-year history is kept.
-- unique(run_id, camp_id) ensures idempotent upserts within a
-- single run without touching rows from any other run.
-- ============================================================

create table camp_sessions (
  id                          uuid        primary key default gen_random_uuid(),

  -- Run linkage
  run_id                      uuid        not null references research_runs (id) on delete cascade,
  year                        integer     not null,  -- denormalized for fast year filtering

  -- Camp identity
  camp_id                     text        not null,  -- {{YEAR}}_{{CAMP}}_{{CATEGORY}}_W[week]_[seq]
  organization_id             uuid        references organizations (id),

  -- Final Output Table columns (col 2–27)
  week_date_range             text,                  -- col 2
  individual_week             text,                  -- col 3
  camp_name                   text        not null,  -- col 4
  location_address            text,                  -- col 6
  source_url                  text,                  -- col 7
  distance_from_princeton     text,                  -- col 8
  ages_grades                 text,                  -- col 9
  daily_start_time            text,                  -- col 10
  daily_end_time              text,                  -- col 11
  before_care                 text,                  -- col 12
  after_care                  text,                  -- col 13
  price_tuition               text,                  -- col 14
  registration_fee            text,                  -- col 15
  camp_type                   text,                  -- col 16
  weekly_activity             text,                  -- col 17
  skill_level                 text,                  -- col 18
  meals_included              text,                  -- col 19
  indoor_outdoor              text,                  -- col 20
  registration_start_date     text,                  -- col 21
  registration_deadlines      text,                  -- col 22
  cancellation_refund_notes   text,                  -- col 23
  verification_status         text,                  -- col 24
  source_type_date_checked    text,                  -- col 25
  best_fit_tags               text[],                -- col 26
  registration_notes          text,                  -- col 27

  created_at                  timestamptz not null default now(),

  unique (run_id, camp_id)
);

create index camp_sessions_run_id_idx      on camp_sessions (run_id);
create index camp_sessions_year_idx        on camp_sessions (year);
create index camp_sessions_camp_id_idx     on camp_sessions (camp_id);
create index camp_sessions_org_id_idx      on camp_sessions (organization_id);
create index camp_sessions_verif_idx       on camp_sessions (verification_status);
create index camp_sessions_best_fit_idx    on camp_sessions using gin (best_fit_tags);

comment on table  camp_sessions                           is 'One row per camp session per research run. All runs and years are preserved — rows are never deleted or overwritten.';
comment on column camp_sessions.run_id                    is 'FK to research_runs — which execution produced this row.';
comment on column camp_sessions.year                      is 'Denormalized year for fast year-based filtering without joining research_runs.';
comment on column camp_sessions.camp_id                   is 'Structured Camp ID: {{YEAR}}_{{CAMP}}_{{CATEGORY}}_W[week]_[seq]. Unique within a run.';
comment on column camp_sessions.organization_id           is 'FK to organizations — the provider/school/org running this camp.';
comment on column camp_sessions.week_date_range           is 'Full date range of the session (col 2).';
comment on column camp_sessions.individual_week           is 'Individual week label within a multi-week session (col 3).';
comment on column camp_sessions.camp_name                 is 'Camp or program name (col 4).';
comment on column camp_sessions.location_address          is 'Physical location/address (col 6).';
comment on column camp_sessions.source_url                is 'URL or source reference (col 7).';
comment on column camp_sessions.distance_from_princeton   is 'Approx. distance from downtown Princeton 08540 (col 8).';
comment on column camp_sessions.ages_grades               is 'Target ages or grade range (col 9).';
comment on column camp_sessions.daily_start_time          is 'Daily start time, or "Not posted publicly" (col 10).';
comment on column camp_sessions.daily_end_time            is 'Daily end time, or "Not posted publicly" (col 11).';
comment on column camp_sessions.before_care               is 'Before-care availability (col 12).';
comment on column camp_sessions.after_care                is 'After-care availability (col 13).';
comment on column camp_sessions.price_tuition             is 'Price/tuition, or "Not posted publicly" (col 14).';
comment on column camp_sessions.registration_fee          is 'Registration fee or extra required fees (col 15).';
comment on column camp_sessions.camp_type                 is 'Camp type category (col 16).';
comment on column camp_sessions.weekly_activity           is 'Specific weekly activity or program offered (col 17).';
comment on column camp_sessions.skill_level               is 'Skill level if posted (col 18).';
comment on column camp_sessions.meals_included            is 'Meals/snacks/lunch included? (col 19).';
comment on column camp_sessions.indoor_outdoor            is 'Indoor / outdoor / mixed (col 20).';
comment on column camp_sessions.registration_start_date   is 'Registration open date (col 21).';
comment on column camp_sessions.registration_deadlines    is 'Registration deadlines and notes (col 22).';
comment on column camp_sessions.cancellation_refund_notes is 'Cancellation/refund policy if published (col 23).';
comment on column camp_sessions.verification_status       is 'Verification status label (col 24).';
comment on column camp_sessions.source_type_date_checked  is 'Source type and date checked (col 25).';
comment on column camp_sessions.best_fit_tags             is 'Array of Best Fit Tags for filtering (col 26).';
comment on column camp_sessions.registration_notes        is 'Registration confirmation and missing info notes (col 27).';
