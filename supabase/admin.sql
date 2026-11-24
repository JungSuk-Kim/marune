-- 마루네 운영 기능 (운영자 화면, 신고, 글 수정, 도전미션·공약 관리)
-- schema.sql 다음에 실행. 여러 번 실행해도 안전합니다.

-- ── 회원: 활동 정지 표시 ───────────────────────────────────
alter table public.profiles add column if not exists banned boolean not null default false;

-- 정지된 회원은 글·댓글을 쓸 수 없음
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated with check (
  author_id = auth.uid()
  and not coalesce((select banned from public.profiles where id = auth.uid()), false)
  and (
    category = 'free'
    or (category = 'diary' and public.my_role() in ('streamer', 'admin'))
    or (category = 'notice' and public.my_role() = 'admin')
  )
);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated with check (
  author_id = auth.uid() and not coalesce((select banned from public.profiles where id = auth.uid()), false)
);

-- ── 글 수정 (본인 또는 운영자, 제목·본문만) ─────────────────
alter table public.posts add column if not exists updated_at timestamptz;
drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update to authenticated
  using (author_id = auth.uid() or public.my_role() = 'admin')
  with check (author_id = auth.uid() or public.my_role() = 'admin');
grant update (title, body) on public.posts to authenticated;

create or replace function public.touch_post() returns trigger
language plpgsql as $$
begin
  if new.title is distinct from old.title or new.body is distinct from old.body then new.updated_at := now(); end if;
  return new;
end $$;
drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts for each row execute function public.touch_post();

-- ── 운영자 전용 함수 ──────────────────────────────────────
-- 회원 목록 (이메일·글 수 포함, 운영자만)
create or replace function public.admin_members()
returns table (id uuid, nickname text, role text, banned boolean, email text, provider text, created_at timestamptz, last_sign_in_at timestamptz, posts bigint, comments bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' then raise exception '운영자만 볼 수 있어요'; end if;
  return query
    select p.id, p.nickname, p.role, p.banned, u.email::text, (u.raw_app_meta_data->>'provider')::text, p.created_at, u.last_sign_in_at,
      (select count(*) from public.posts x where x.author_id = p.id),
      (select count(*) from public.comments c where c.author_id = p.id)
    from public.profiles p join auth.users u on u.id = p.id
    order by p.created_at desc;
end $$;

-- 역할 바꾸기 (자기 자신의 운영자 권한은 내릴 수 없음)
create or replace function public.admin_set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' then raise exception '운영자만 바꿀 수 있어요'; end if;
  if new_role not in ('member', 'streamer', 'admin') then raise exception '잘못된 역할이에요'; end if;
  if target = auth.uid() and new_role <> 'admin' then raise exception '내 운영자 권한은 내릴 수 없어요'; end if;
  update public.profiles set role = new_role where id = target;
end $$;

-- 활동 정지·해제
create or replace function public.admin_set_banned(target uuid, value boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' then raise exception '운영자만 바꿀 수 있어요'; end if;
  if target = auth.uid() then raise exception '나 자신은 정지할 수 없어요'; end if;
  update public.profiles set banned = value where id = target;
end $$;

revoke all on function public.admin_members() from public, anon;
revoke all on function public.admin_set_role(uuid, text) from public, anon;
revoke all on function public.admin_set_banned(uuid, boolean) from public, anon;
grant execute on function public.admin_members() to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;

-- ── 신고 ─────────────────────────────────────────────────
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id bigint not null,
  post_id bigint not null,
  reason text not null check (char_length(reason) between 1 and 300),
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists reports_admin_read on public.reports;
create policy reports_admin_read on public.reports for select to authenticated using (public.my_role() = 'admin' or reporter_id = auth.uid());
drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update on public.reports for update to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
drop policy if exists reports_admin_delete on public.reports;
create policy reports_admin_delete on public.reports for delete to authenticated using (public.my_role() = 'admin');
revoke all on public.reports from anon, authenticated;
grant select, delete on public.reports to authenticated;
grant insert (target_type, target_id, post_id, reason) on public.reports to authenticated;
grant update (status) on public.reports to authenticated;

-- 신고 도배 막기: 한 사람이 하루 20건까지
create or replace function public.limit_report_rate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reports where reporter_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception '신고는 하루 20건까지 할 수 있어요';
  end if;
  return new;
end $$;
drop trigger if exists reports_rate on public.reports;
create trigger reports_rate before insert on public.reports for each row execute function public.limit_report_rate();

-- ── 도전미션 · 공약 (누구나 보기, 운영자만 쓰기) ─────────────
create table if not exists public.missions (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 120),
  balloons integer not null default 0 check (balloons >= 0),
  requester text not null default '' check (char_length(requester) <= 30),
  status text not null default '진행중' check (status in ('진행중', '성공', '실패')),
  day date not null default current_date,
  created_at timestamptz not null default now()
);
create table if not exists public.promises (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 120),
  now_value integer not null default 0,
  goal integer not null default 1 check (goal > 0),
  unit text not null default '' check (char_length(unit) <= 10),
  note text not null default '' check (char_length(note) <= 120),
  done boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.missions enable row level security;
alter table public.promises enable row level security;
drop policy if exists missions_read on public.missions;
create policy missions_read on public.missions for select using (true);
drop policy if exists missions_admin on public.missions;
create policy missions_admin on public.missions for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
drop policy if exists promises_read on public.promises;
create policy promises_read on public.promises for select using (true);
drop policy if exists promises_admin on public.promises;
create policy promises_admin on public.promises for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
revoke all on public.missions, public.promises from anon, authenticated;
grant select on public.missions, public.promises to anon, authenticated;
grant insert, update, delete on public.missions, public.promises to authenticated;
