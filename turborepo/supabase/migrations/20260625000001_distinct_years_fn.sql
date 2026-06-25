-- ============================================================
-- Migration: distinct_camp_years() helper function
--
-- Returns all distinct years present in best_camp_sessions,
-- ordered descending. Replaces the full-table scan + JS-side
-- deduplication previously used by the tRPC years procedure.
-- ============================================================

create or replace function distinct_camp_years()
returns setof integer
language sql stable
as $$
  select distinct year
  from best_camp_sessions
  order by year desc;
$$;

comment on function distinct_camp_years() is
  'Returns distinct years from best_camp_sessions ordered descending. '
  'Used by the tRPC years procedure to avoid a full view scan with JS dedup.';
