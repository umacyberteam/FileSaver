-- FileSaver — policies.sql
-- Jalankan SETELAH schema.sql, di Supabase SQL Editor.
-- Aturan ini memastikan setiap user HANYA bisa melihat/mengubah filenya sendiri,
-- baik itu baris metadata di tabel `files` maupun objek fisik di Storage.
-- Ini yang membuat "login dari HP, ambil dari laptop dengan akun sama" aman:
-- akses ditentukan oleh sesi login (auth.uid()), bukan oleh perangkat.

-- ── Tabel public.files ──────────────────────────────────────────────
drop policy if exists "files_select_own" on public.files;
create policy "files_select_own"
  on public.files for select
  using (auth.uid() = user_id);

drop policy if exists "files_insert_own" on public.files;
create policy "files_insert_own"
  on public.files for insert
  with check (auth.uid() = user_id);

drop policy if exists "files_delete_own" on public.files;
create policy "files_delete_own"
  on public.files for delete
  using (auth.uid() = user_id);

-- ── Storage: bucket "files" ─────────────────────────────────────────
-- Konvensi path: {user_id}/{nama-file-unik}
-- (storage.foldername(name))[1] mengambil segmen folder pertama dari path,
-- yaitu user_id pemilik file.
drop policy if exists "storage_files_select_own" on storage.objects;
create policy "storage_files_select_own"
  on storage.objects for select
  using (
    bucket_id = 'files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "storage_files_insert_own" on storage.objects;
create policy "storage_files_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "storage_files_delete_own" on storage.objects;
create policy "storage_files_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
