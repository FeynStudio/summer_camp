-- Reference table for provider/school/organization names and their abbreviations.
-- Abbreviations are enforced at the DB level: max 5 characters, unique.

create table organizations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  abbr       varchar(5)  not null unique check (char_length(abbr) <= 5),
  kind       text        check (kind in ('provider', 'school', 'organization')),
  created_at timestamptz not null default now()
);

-- Index on kind for fast filtered lookups (e.g. "all schools")
create index organizations_kind_idx on organizations (kind);

comment on table  organizations             is 'Canonical list of providers, schools, and organizations with their short abbreviations.';
comment on column organizations.name        is 'Full display name — must be unique.';
comment on column organizations.abbr        is 'Up to 5-character abbreviation — must be unique.';
comment on column organizations.kind        is 'Category: provider | school | organization.';
comment on column organizations.created_at  is 'Row creation timestamp (UTC).';
