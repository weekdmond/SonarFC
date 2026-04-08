create table if not exists public.user_preferences (
  id uuid primary key references auth.users (id) on delete cascade,
  followed_team_ids text[] not null default '{}',
  followed_competition_ids text[] not null default '{}',
  language text not null default 'zh' check (language in ('zh', 'en')),
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  pre_match_alert boolean not null default true,
  daily_digest boolean not null default false,
  is_pro boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row
execute function public.set_user_preferences_updated_at();

alter table public.user_preferences enable row level security;

drop policy if exists "Users read own preferences" on public.user_preferences;
create policy "Users read own preferences"
on public.user_preferences
for select
using (auth.uid() = id);

drop policy if exists "Users insert own preferences" on public.user_preferences;
create policy "Users insert own preferences"
on public.user_preferences
for insert
with check (auth.uid() = id);

drop policy if exists "Users update own preferences" on public.user_preferences;
create policy "Users update own preferences"
on public.user_preferences
for update
using (auth.uid() = id);

drop policy if exists "Users delete own preferences" on public.user_preferences;
create policy "Users delete own preferences"
on public.user_preferences
for delete
using (auth.uid() = id);

create or replace function public.handle_new_user_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_preferences (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_preferences();
