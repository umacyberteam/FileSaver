// assets/js/ui.js — helper tampilan yang dipakai di semua halaman

window.FileSaver = window.FileSaver || {};

/** Tampilkan pesan singkat mengambang di pojok bawah layar. */
window.FileSaver.toast = function toast(message, variant = 'info') {
  let host = document.getElementById('fs-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'fs-toast-host';
    host.className = 'fs-toast-host';
    document.body.appendChild(host);
  }

  const el = document.createElement('div');
  el.className = `fs-toast fs-toast--${variant}`;
  el.textContent = message;
  host.appendChild(el);

  requestAnimationFrame(() => el.classList.add('is-visible'));

  setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 250);
  }, 4000);
};

/** Ubah bytes jadi teks singkat: 1536 -> "1.5 KB" */
window.FileSaver.formatBytes = function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/** Format tanggal ke format Indonesia singkat: "15 Agu 2026, 14:30" */
window.FileSaver.formatDate = function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Status kadaluarsa file untuk ditampilkan sebagai badge.
 * Return: { label, tone } — tone salah satu dari: 'permanent' | 'ok' | 'soon' | 'expired'
 */
window.FileSaver.expiryStatus = function expiryStatus(expiresAt) {
  if (!expiresAt) return { label: 'Permanen', tone: 'permanent' };

  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return { label: 'Kadaluarsa', tone: 'expired' };

  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffHours / 24);

  if (diffHours < 24) {
    const h = Math.max(1, Math.round(diffHours));
    return { label: `${h} jam lagi`, tone: 'soon' };
  }
  if (diffDays <= 3) {
    return { label: `${diffDays} hari lagi`, tone: 'soon' };
  }
  return { label: `${diffDays} hari lagi`, tone: 'ok' };
};
