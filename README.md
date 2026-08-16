# FileSaver

Penyimpanan file sementara lintas perangkat. Login dengan akun yang sama di HP dan
laptop, dan file yang diupload dari satu perangkat langsung bisa diambil dari perangkat lain.

## Struktur proyek

```
filesaver/
├── index.html              Landing page
├── login.html               Halaman masuk
├── register.html            Halaman daftar
├── forgot-password.html     Minta link reset password
├── reset-password.html      Set password baru (dibuka dari link email)
├── dashboard.html           Upload & daftar file
├── assets/
│   ├── css/                 style.css (global), auth.css, dashboard.css
│   └── js/                  config.js, ui.js, auth.js, dashboard.js
├── api/
│   ├── config.js             Serverless function — kirim Supabase URL & anon key ke frontend
│   └── cleanup-expired.js    Serverless function — hapus file kadaluarsa (dipicu cron)
├── database/
│   ├── schema.sql            Tabel `files` + bucket storage
│   └── policies.sql          Row Level Security
├── vercel.json               Jadwal cron harian untuk cleanup-expired
└── package.json
```

## 1. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan isi `database/schema.sql`, lalu jalankan `database/policies.sql`.
   Ini membuat tabel `files`, bucket storage privat bernama `files` (limit 50 MB/file), dan
   semua RLS policy supaya user hanya bisa mengakses filenya sendiri.
3. Buka **Authentication → URL Configuration**, isi:
   - **Site URL**: domain Vercel kamu, mis. `https://filesaver-kamu.vercel.app`
   - **Redirect URLs**: tambahkan `https://filesaver-kamu.vercel.app/reset-password.html`
   (tanpa ini, link "Lupa Password" tidak akan mengarah ke halaman yang benar).
4. Di **Authentication → Providers → Email**, atur apakah verifikasi email wajib
   ("Confirm email") sesuai kebutuhan kamu. Kalau diaktifkan, user baru harus klik
   link di email dulu sebelum bisa login.
5. Catat 3 nilai ini dari **Project Settings → API**, dipakai di langkah berikutnya:
   - `Project URL`
   - `anon public` key
   - `service_role` key (⚠️ rahasia, jangan pernah dikirim ke browser)

## 2. Deploy ke Vercel

1. Push folder ini ke repo GitHub/GitLab, lalu import ke [vercel.com](https://vercel.com).
2. Di **Project Settings → Environment Variables**, tambahkan:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | Project URL dari Supabase |
   | `SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
   | `CRON_SECRET` | string acak bebas, mis. hasil `openssl rand -hex 32` |

   Vercel otomatis mengirim `CRON_SECRET` sebagai header `Authorization` setiap kali
   memicu cron job, itu sebabnya `api/cleanup-expired.js` memvalidasi header tsb.
3. Deploy. Vercel otomatis mendaftarkan jadwal cron dari `vercel.json`
   (`api/cleanup-expired` berjalan tiap hari jam 00:00 UTC) — cek limit cron job
   sesuai plan Vercel kamu (Hobby punya batasan jumlah & frekuensi).
4. Setelah live, kembali ke Supabase → Authentication → URL Configuration dan
   pastikan Site URL/Redirect URL memakai domain Vercel yang sebenarnya.

## Cara kerja singkat

- **Auth**: Supabase Auth (email/password). Sesi login tersimpan di browser masing-masing
  perangkat — karena itu login di HP dan login di laptop dianggap dua sesi terpisah,
  tapi keduanya merujuk ke akun (dan data) yang sama.
- **Upload**: file dikirim ke Supabase Storage di path `{user_id}/{nama-unik}`, lalu
  metadatanya (nama asli, ukuran, kapan kadaluarsa) disimpan di tabel `files`.
- **Kadaluarsa**: user memilih permanen / 1 / 7 / 30 hari / custom saat upload. Frontend
  langsung menyembunyikan tombol unduh untuk file yang sudah lewat waktu, dan
  `api/cleanup-expired.js` benar-benar menghapusnya (storage + baris DB) sekali sehari.
- **Keamanan**: RLS di tabel `files` dan di `storage.objects` memastikan query/akses
  file hanya berhasil kalau `auth.uid()` cocok dengan pemilik — jadi meskipun anon key
  ada di frontend, user lain tidak bisa membaca file siapapun selain miliknya sendiri.

## Menjalankan lokal (opsional)

Karena situs ini statis (tanpa build step) dan bergantung ke `/api/config.js`, cara
paling gampang untuk mencoba lokal adalah lewat Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

Vercel CLI akan membaca env var dari `vercel env pull` atau dari dashboard project.
