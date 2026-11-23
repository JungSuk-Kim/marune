-- 마루네 게시판 데이터베이스
-- Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여 넣고 실행하면 됩니다.
-- 여러 번 실행해도 안전하도록 썼습니다.

-- ── 회원 정보 ──────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 16),
  role text not null default 'member' check (role in ('member', 'streamer', 'admin')),
  created_at timestamptz not null default now()
);

-- ── 글 ────────────────────────────────────────────────────
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  category text not null check (category in ('notice', 'free', 'diary')),
  title text not null check (char_length(title) between 1 and 100),
  body text not null check (char_length(body) between 1 and 5000),
  author_id uuid not null,
  created_at timestamptz not null default now(),
  views integer not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  constraint posts_author_id_fkey foreign key (author_id) references public.profiles(id) on delete cascade
);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_category_idx on public.posts (category, created_at desc);

-- ── 댓글 ──────────────────────────────────────────────────
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  author_id uuid not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  constraint comments_author_id_fkey foreign key (author_id) references public.profiles(id) on delete cascade
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- ── 추천 (한 사람이 한 글에 한 번) ────────────────────────
create table if not exists public.post_likes (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ── 도우미 함수 ───────────────────────────────────────────
-- 지금 로그인한 사람의 역할
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'guest');
$$;

-- 가입하면 회원 정보 자동 생성 (닉네임은 소셜 계정 이름에서 가져오고, 없으면 "체리" + 숫자)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  nick text;
begin
  nick := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  );
  if nick is null or char_length(nick) < 2 then
    nick := '체리' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  insert into public.profiles (id, nickname) values (new.id, left(nick, 16))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 조회수 올리기
create or replace function public.increment_view(pid bigint) returns void
language sql security definer set search_path = public as $$
  update public.posts set views = views + 1 where id = pid;
$$;

-- 추천 수·댓글 수 자동 계산
create or replace function public.sync_like_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  else
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists post_likes_count on public.post_likes;
create trigger post_likes_count after insert or delete on public.post_likes
  for each row execute function public.sync_like_count();

create or replace function public.sync_comment_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  else
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists comments_count on public.comments;
create trigger comments_count after insert or delete on public.comments
  for each row execute function public.sync_comment_count();

-- 도배 방지: 같은 사람이 글은 30초, 댓글은 5초 안에 연달아 쓰지 못함 (운영자 제외)
create or replace function public.limit_post_rate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' and exists (
    select 1 from public.posts where author_id = new.author_id and created_at > now() - interval '30 seconds'
  ) then
    raise exception '글은 30초에 한 번만 쓸 수 있어요';
  end if;
  return new;
end;
$$;
drop trigger if exists posts_rate on public.posts;
create trigger posts_rate before insert on public.posts
  for each row execute function public.limit_post_rate();

create or replace function public.limit_comment_rate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' and exists (
    select 1 from public.comments where author_id = new.author_id and created_at > now() - interval '5 seconds'
  ) then
    raise exception '댓글은 5초에 한 번만 쓸 수 있어요';
  end if;
  return new;
end;
$$;
drop trigger if exists comments_rate on public.comments;
create trigger comments_rate before insert on public.comments
  for each row execute function public.limit_comment_rate();

-- ── 권한 (누가 무엇을 할 수 있는지) ───────────────────────
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;

-- 회원 정보: 누구나 닉네임을 볼 수 있고, 본인은 닉네임만 고칠 수 있음 (역할은 고칠 수 없음)
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (nickname) on public.profiles to authenticated;

-- 글: 누구나 읽기. 자유게시판은 회원 누구나, 일기장은 스트리머·운영자, 공지는 운영자만 쓰기. 삭제는 본인이나 운영자
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (true);
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated with check (
  author_id = auth.uid() and (
    category = 'free'
    or (category = 'diary' and public.my_role() in ('streamer', 'admin'))
    or (category = 'notice' and public.my_role() = 'admin')
  )
);
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.my_role() = 'admin');
revoke insert, update, delete on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert (category, title, body, author_id), delete on public.posts to authenticated;

-- 댓글: 누구나 읽기, 회원 쓰기, 삭제는 본인이나 운영자
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select using (true);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.my_role() = 'admin');
revoke insert, update, delete on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (post_id, body, author_id), delete on public.comments to authenticated;

-- 추천: 본인 것만 넣고 빼기
drop policy if exists likes_read on public.post_likes;
create policy likes_read on public.post_likes for select to authenticated using (user_id = auth.uid());
drop policy if exists likes_insert on public.post_likes;
create policy likes_insert on public.post_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists likes_delete on public.post_likes;
create policy likes_delete on public.post_likes for delete to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.post_likes from anon, authenticated;
grant select, insert (post_id, user_id), delete on public.post_likes to authenticated;

grant execute on function public.increment_view(bigint) to anon, authenticated;
grant execute on function public.my_role() to anon, authenticated;

-- ── 운영자·스트리머 지정 ──────────────────────────────────
-- 먼저 사이트에 한 번 로그인한 뒤, 아래에서 닉네임을 바꿔 실행하세요.
-- update public.profiles set role = 'admin' where nickname = '내닉네임';
-- update public.profiles set role = 'streamer' where nickname = '마루닉네임';
