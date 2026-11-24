-- 방송 일정표 (운영자·스트리머가 사이트 안에서 고침). schema.sql 다음에 실행. 여러 번 실행해도 안전해요.
create table if not exists public.schedule_week (
  dow smallint primary key check (dow between 0 and 6),   -- 0=월 ... 6=일
  title text not null default '' check (char_length(title) <= 40),
  time text not null default '' check (char_length(time) <= 20),
  rest boolean not null default false
);
create table if not exists public.schedule_special (
  id bigint generated always as identity primary key,
  day date not null unique,
  title text not null check (char_length(title) between 1 and 40),
  time text not null default '' check (char_length(time) <= 20),
  rest boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.schedule_week enable row level security;
alter table public.schedule_special enable row level security;
drop policy if exists sw_read on public.schedule_week;
create policy sw_read on public.schedule_week for select using (true);
drop policy if exists sw_write on public.schedule_week;
create policy sw_write on public.schedule_week for all to authenticated using (public.my_role() in ('admin','streamer')) with check (public.my_role() in ('admin','streamer'));
drop policy if exists ss_read on public.schedule_special;
create policy ss_read on public.schedule_special for select using (true);
drop policy if exists ss_write on public.schedule_special;
create policy ss_write on public.schedule_special for all to authenticated using (public.my_role() in ('admin','streamer')) with check (public.my_role() in ('admin','streamer'));
revoke all on public.schedule_week, public.schedule_special from anon, authenticated;
grant select on public.schedule_week, public.schedule_special to anon, authenticated;
grant insert, update, delete on public.schedule_week, public.schedule_special to authenticated;
insert into public.schedule_week (dow, title, time, rest) values
  (0,'개인방송','14:00',false),(1,'개인방송','14:00',false),(2,'개인방송','14:00',false),(3,'개인방송','14:00',false),
  (4,'휴방','',true),(5,'개인방송','14:00',false),(6,'개인방송','14:00',false)
on conflict (dow) do nothing;
insert into public.schedule_special (day, title, time) values ('2026-11-25','꿀지원 합방','') on conflict (day) do nothing;
