// api/config.js
// Endpoint publik yang mengirim konfigurasi Supabase ke frontend.
// URL dan anon key TIDAK di-hardcode di file JS — keduanya dibaca dari
// Environment Variables Vercel saat function ini dijalankan di server.
// Anon key aman dikirim ke browser (memang didesain publik oleh Supabase);
// akses data tetap dijaga oleh Row Level Security, bukan oleh key ini.

export default function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({
      error: 'SUPABASE_URL / SUPABASE_ANON_KEY belum diatur di Environment Variables Vercel.',
    });
    return;
  }

  // Cache ringan di edge/browser selama 5 menit — nilainya jarang berubah.
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({ supabaseUrl, supabaseAnonKey });
}
