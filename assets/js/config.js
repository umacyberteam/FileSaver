// assets/js/config.js
// Supabase URL & anon key TIDAK ditulis langsung di file ini.
// Keduanya diambil dari /api/config (serverless function Vercel) yang
// membacanya dari Environment Variables saat runtime.

window.FileSaver = window.FileSaver || {};

let clientPromise = null;

window.FileSaver.getClient = function getClient() {
  if (clientPromise) return clientPromise;

  clientPromise = fetch('/api/config')
    .then((res) => {
      if (!res.ok) throw new Error('Gagal memuat konfigurasi server.');
      return res.json();
    })
    .then(({ supabaseUrl, supabaseAnonKey }) => {
      if (!window.supabase || !window.supabase.createClient) {
        throw new Error('Library supabase-js belum dimuat.');
      }
      return window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    })
    .catch((err) => {
      clientPromise = null; // biar bisa dicoba ulang, bukan macet di error selamanya
      throw err;
    });

  return clientPromise;
};
