-- ============================================================
-- Migration: completeness scoring + best_camp_sessions view
--
-- Creates two read-only views. Raw data is never modified.
--
-- ── View 1: camp_sessions_scored ─────────────────────────────
--   All camp_sessions rows, each annotated with:
--     completeness_score  integer  0–23
--     completeness_pct    integer  0–100 (rounded %)
--     run_date            timestamptz  (joined from research_runs)
--
-- ── View 2: best_camp_sessions ───────────────────────────────
--   One row per natural-key group, selecting the row with the
--   highest completeness_score (tiebreak: latest run_date).
--
--   Natural key:
--     organization_id              stable UUID, never drifts
--     camp_name                    provider-facing session name
--     camp_type                    controlled vocab (GEN, SPRTS, …)
--     split_part(camp_id, '_', 4)  week segment derived from
--                                  structured camp_id, e.g. "W25"
--                                  from "2026_PRCAM_GEN_W25_02"
--
-- ── Scoring rules ────────────────────────────────────────────
--   23 optional data fields are scored (1 point each).
--   A field earns 1 point when it is:
--     • NOT NULL, AND
--     • trim(lower(value)) NOT LIKE 'not posted%'
--       (covers "Not posted publicly", "Not posted publicly.", etc.)
--   best_fit_tags earns 1 point when the array is not null
--   and has at least one element.
--
--   Excluded from scoring (always present or structurally N/A):
--     id, run_id, year, camp_id, organization_id,
--     camp_name (required / always populated),
--     individual_week (expected null for single-week sessions).
-- ============================================================


-- ── View 1: camp_sessions_scored ─────────────────────────────

create or replace view camp_sessions_scored as
with base as (
  select
    cs.id,
    cs.run_id,
    cs.year,
    cs.camp_id,
    cs.organization_id,
    cs.week_date_range,
    cs.individual_week,
    cs.camp_name,
    cs.location_address,
    cs.source_url,
    cs.distance_from_princeton,
    cs.ages_grades,
    cs.daily_start_time,
    cs.daily_end_time,
    cs.before_care,
    cs.after_care,
    cs.price_tuition,
    cs.registration_fee,
    cs.camp_type,
    cs.weekly_activity,
    cs.skill_level,
    cs.meals_included,
    cs.indoor_outdoor,
    cs.registration_start_date,
    cs.registration_deadlines,
    cs.cancellation_refund_notes,
    cs.verification_status,
    cs.source_type_date_checked,
    cs.best_fit_tags,
    cs.registration_notes,
    cs.created_at,
    rr.run_date,

    -- ── Completeness score (0–23) ─────────────────────────
    -- 1 point per field that is populated and not a placeholder.
    (
      case when cs.week_date_range            is not null and trim(lower(cs.week_date_range))            not like 'not posted%' then 1 else 0 end
    + case when cs.location_address           is not null and trim(lower(cs.location_address))           not like 'not posted%' then 1 else 0 end
    + case when cs.source_url                 is not null and trim(lower(cs.source_url))                 not like 'not posted%' then 1 else 0 end
    + case when cs.distance_from_princeton    is not null and trim(lower(cs.distance_from_princeton))    not like 'not posted%' then 1 else 0 end
    + case when cs.ages_grades                is not null and trim(lower(cs.ages_grades))                not like 'not posted%' then 1 else 0 end
    + case when cs.daily_start_time           is not null and trim(lower(cs.daily_start_time))           not like 'not posted%' then 1 else 0 end
    + case when cs.daily_end_time             is not null and trim(lower(cs.daily_end_time))             not like 'not posted%' then 1 else 0 end
    + case when cs.before_care                is not null and trim(lower(cs.before_care))                not like 'not posted%' then 1 else 0 end
    + case when cs.after_care                 is not null and trim(lower(cs.after_care))                 not like 'not posted%' then 1 else 0 end
    + case when cs.price_tuition              is not null and trim(lower(cs.price_tuition))              not like 'not posted%' then 1 else 0 end
    + case when cs.registration_fee           is not null and trim(lower(cs.registration_fee))           not like 'not posted%' then 1 else 0 end
    + case when cs.camp_type                  is not null and trim(lower(cs.camp_type))                  not like 'not posted%' then 1 else 0 end
    + case when cs.weekly_activity            is not null and trim(lower(cs.weekly_activity))            not like 'not posted%' then 1 else 0 end
    + case when cs.skill_level                is not null and trim(lower(cs.skill_level))                not like 'not posted%' then 1 else 0 end
    + case when cs.meals_included             is not null and trim(lower(cs.meals_included))             not like 'not posted%' then 1 else 0 end
    + case when cs.indoor_outdoor             is not null and trim(lower(cs.indoor_outdoor))             not like 'not posted%' then 1 else 0 end
    + case when cs.registration_start_date    is not null and trim(lower(cs.registration_start_date))    not like 'not posted%' then 1 else 0 end
    + case when cs.registration_deadlines     is not null and trim(lower(cs.registration_deadlines))     not like 'not posted%' then 1 else 0 end
    + case when cs.cancellation_refund_notes  is not null and trim(lower(cs.cancellation_refund_notes))  not like 'not posted%' then 1 else 0 end
    + case when cs.verification_status        is not null and trim(lower(cs.verification_status))        not like 'not posted%' then 1 else 0 end
    + case when cs.source_type_date_checked   is not null and trim(lower(cs.source_type_date_checked))   not like 'not posted%' then 1 else 0 end
    + case when cs.best_fit_tags              is not null and array_length(cs.best_fit_tags, 1) > 0      then 1 else 0 end
    + case when cs.registration_notes         is not null and trim(lower(cs.registration_notes))         not like 'not posted%' then 1 else 0 end
    ) as completeness_score

  from camp_sessions cs
  join research_runs rr on cs.run_id = rr.id
)
select
  *,
  -- Percentage: score out of 23 possible fields, rounded to nearest integer.
  round(completeness_score::numeric * 100.0 / 23)::integer as completeness_pct
from base;

comment on view camp_sessions_scored is
  'All camp_sessions rows annotated with completeness_score (0–23) and '
  'completeness_pct (0–100). Joins research_runs for run_date. '
  'Use this view for debugging data quality across all runs.';


-- ── View 2: best_camp_sessions ───────────────────────────────

create or replace view best_camp_sessions as
with ranked as (
  select
    *,
    -- Natural key group: org + name + type + week derived from camp_id.
    -- Highest completeness_score wins; latest run_date breaks ties.
    row_number() over (
      partition by
        organization_id,
        camp_name,
        camp_type,
        split_part(camp_id, '_', 4)   -- e.g. "W25" from "2026_PRCAM_GEN_W25_02"
      order by
        completeness_score desc,
        run_date desc
    ) as rn
  from camp_sessions_scored
)
select
  id,
  run_id,
  year,
  camp_id,
  organization_id,
  split_part(camp_id, '_', 4)  as week_key,   -- e.g. "W25" — derived dedup key segment
  week_date_range,
  individual_week,
  camp_name,
  location_address,
  source_url,
  distance_from_princeton,
  ages_grades,
  daily_start_time,
  daily_end_time,
  before_care,
  after_care,
  price_tuition,
  registration_fee,
  camp_type,
  weekly_activity,
  skill_level,
  meals_included,
  indoor_outdoor,
  registration_start_date,
  registration_deadlines,
  cancellation_refund_notes,
  verification_status,
  source_type_date_checked,
  best_fit_tags,
  registration_notes,
  created_at,
  run_date,
  completeness_score,
  completeness_pct
from ranked
where rn = 1;

comment on view best_camp_sessions is
  'One row per unique camp session, selected as the highest-quality record '
  'across all research runs. Grouped by (organization_id, camp_name, camp_type, '
  'week_key). Best row = highest completeness_score; tiebreak = latest run_date. '
  'This is the primary view for the web app — parents always see the most '
  'complete available data. completeness_pct shows data quality at a glance.';
