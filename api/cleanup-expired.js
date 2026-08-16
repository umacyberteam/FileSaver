// api/cleanup-expired.js
// Dipanggil otomatis oleh Vercel Cron (lihat vercel.json) sekali sehari.
// Menghapus file yang sudah lewat expires_at: objek di Storage + baris di tabel `files`.
// Pakai SERVICE ROLE KEY (bukan anon key) supaya bisa melewati RLS dan
// menjangkau file milik SEMUA user — key ini HANYA boleh dipakai di server,
// jangan pernah dikirim ke frontend.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Vercel Cron mengirim header Authorization: Bearer <CRON_SECRET>.
  // Ini mencegah orang lain memicu penghapusan lewat URL publik endpoint ini.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers['authorization'] || '';
    if (authHeader !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur.' });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: expiredFiles, error: fetchError } = await supabase
      .from('files')
      .select('id, storage_path')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!expiredFiles || expiredFiles.length === 0) {
      res.status(200).json({ deleted: 0 });
      return;
    }

    const paths = expiredFiles.map((f) => f.storage_path);
    const ids = expiredFiles.map((f) => f.id);

    const { error: storageError } = await supabase.storage.from('files').remove(paths);
    if (storageError) throw storageError;

    const { error: deleteError } = await supabase.from('files').delete().in('id', ids);
    if (deleteError) throw deleteError;

    res.status(200).json({ deleted: expiredFiles.length });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gagal membersihkan file kadaluarsa.' });
  }
}
