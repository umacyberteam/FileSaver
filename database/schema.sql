-- FileSaver — schema.sql
-- Jalankan di Supabase SQL Editor (Project > SQL Editor > New query)

-- Tabel metadata file. File fisik disimpan di Supabase Storage,
-- tabel ini menyimpan informasi tentang file tsb (nama asli, lokasi, ukuran, kadaluarsa).
create table if not exists public.files (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  file_name     text not null,
  storage_path  text not null unique,
  file_size     bigint not null,
  mime_type     text,
  uploaded_at   timestamptz not null default now(),
  expires_at    timestamptz          -- null = tidak pernah kadaluarsa
);

create index if not exists files_user_id_idx on public.files (user_id);
create index if not exists files_expires_at_idx on public.files (expires_at) where expires_at is not null;

alter table public.files enable row level security;

-- Bucket storage privat untuk file. Limit 50MB per file (52428800 bytes).
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 52428800)
on conflict (id) do update set file_size_limit = 52428800, public = false;
