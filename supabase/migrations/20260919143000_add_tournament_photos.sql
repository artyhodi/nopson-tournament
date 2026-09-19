create table if not exists public.tournament_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique check (storage_path !~ '(^/|\.\.)'),
  category text not null check (category in ('winners', 'podium', 'moments')),
  caption text not null default '' check (char_length(caption) <= 160),
  uploaded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists tournament_photos_uploaded_by_idx
on public.tournament_photos (uploaded_by);

alter table public.tournament_photos enable row level security;
revoke all on table public.tournament_photos from anon, authenticated;
grant select on table public.tournament_photos to anon, authenticated;
grant insert, delete on table public.tournament_photos to authenticated;

drop policy if exists "Tournament photos are publicly readable" on public.tournament_photos;
create policy "Tournament photos are publicly readable"
on public.tournament_photos for select
to anon, authenticated
using (true);

drop policy if exists "Approved scorers can add tournament photos" on public.tournament_photos;
create policy "Approved scorers can add tournament photos"
on public.tournament_photos for insert
to authenticated
with check (
  uploaded_by = (select auth.uid())
  and exists (
    select 1 from public.tournament_admins
    where email = lower((select auth.jwt()) ->> 'email')
  )
);

drop policy if exists "Approved scorers can remove tournament photos" on public.tournament_photos;
create policy "Approved scorers can remove tournament photos"
on public.tournament_photos for delete
to authenticated
using (
  exists (
    select 1 from public.tournament_admins
    where email = lower((select auth.jwt()) ->> 'email')
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tournament-photos',
  'tournament-photos',
  true,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Approved scorers can upload tournament photos" on storage.objects;
create policy "Approved scorers can upload tournament photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'tournament-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
  and exists (
    select 1 from public.tournament_admins
    where email = lower((select auth.jwt()) ->> 'email')
  )
);

drop policy if exists "Approved scorers can delete tournament photos" on storage.objects;
create policy "Approved scorers can delete tournament photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'tournament-photos'
  and exists (
    select 1 from public.tournament_admins
    where email = lower((select auth.jwt()) ->> 'email')
  )
);

do $block$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tournament_photos'
  ) then
    alter publication supabase_realtime add table public.tournament_photos;
  end if;
end;
$block$;
