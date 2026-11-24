-- 마루네 글 사진 저장소
-- Supabase 대시보드 > SQL Editor 에 붙여 넣고 실행하면 됩니다. 여러 번 실행해도 안전합니다.
-- 사진은 누구나 볼 수 있고, 로그인한 회원만 자기 폴더(회원 id)에 올릴 수 있어요. 한 장 3MB 까지, 사진 파일만.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 3145728, array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "post images: upload to own folder" on storage.objects;
create policy "post images: upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "post images: delete own or admin" on storage.objects;
create policy "post images: delete own or admin" on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.my_role() = 'admin'));
