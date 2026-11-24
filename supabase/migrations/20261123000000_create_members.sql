begin;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  external_code text unique,
  name text not null check (length(btrim(name)) > 0),
  photo_path text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'not_revalidated')),
  congregation text not null default 'Nova Suíça'
    check (length(btrim(congregation)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index members_name_sort_idx on public.members (lower(name));
create index members_status_idx on public.members (status);

create or replace function public.set_member_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_member_updated_at();

alter table public.members enable row level security;
revoke all on public.members from anon, authenticated;
grant select, insert, update, delete on public.members to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-photos',
  'member-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
