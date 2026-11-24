begin;

alter table public.members
  add column phone text,
  add column cep text,
  add column street text,
  add column number text,
  add column neighborhood text,
  add column complement text,
  add column city text,
  add column state text;

commit;

