-- whodis database bootstrap
-- Run this on a dedicated whodis Supabase project.

create extension if not exists vector with schema extensions;

create table if not exists public.whodis_attendees (
  event_id text not null,
  attendee_id text not null,
  display_name text not null,
  initials text not null default '?',
  role text not null default 'Event attendee',
  org text not null default 'whodis event',
  interests text[] not null default '{}',
  goals text[] not null default '{}',
  projects text[] not null default '{}',
  links text[] not null default '{"Event profile"}',
  embedding extensions.vector(512) not null,
  consent boolean not null default false,
  enrolled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, attendee_id)
);

alter table public.whodis_attendees enable row level security;

-- No browser role should ever read raw face embeddings.
revoke all on table public.whodis_attendees from anon, authenticated;
grant select, insert, update, delete on table public.whodis_attendees to service_role;

create index if not exists whodis_attendees_event_idx
  on public.whodis_attendees (event_id)
  where consent = true;

create or replace function public.whodis_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists whodis_attendees_touch_updated_at on public.whodis_attendees;
create trigger whodis_attendees_touch_updated_at
before update on public.whodis_attendees
for each row execute function public.whodis_touch_updated_at();
