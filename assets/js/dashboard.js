// assets/js/dashboard.js — upload, daftar file, download, hapus

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB, samakan dengan bucket limit di Supabase

document.addEventListener('DOMContentLoaded', async () => {
  const { toast, formatBytes, formatDate, expiryStatus } = window.FileSaver;

  const session = await window.FileSaver.requireSession();
  if (!session) return; // sudah di-redirect ke login.html

  const supabase = await window.FileSaver.getClient();
  const userEmailEl = document.getElementById('user-email');
  if (userEmailEl) userEmailEl.textContent = session.user.email;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const expirySelect = document.getElementById('expiry-select');
  const customDaysWrap = document.getElementById('custom-days-wrap');
  const customDaysInput = document.getElementById('custom-days-input');
  const listEl = document.getElementById('file-list');
  const emptyStateEl = document.getElementById('empty-state');
  const uploadProgressEl = document.getElementById('upload-progress');
  const fileCountEl = document.getElementById('file-count');

  // ── Toggle input hari custom ─────────────────────────────────────
  expirySelect.addEventListener('change', () => {
    const isCustom = expirySelect.value === 'custom';
    customDaysWrap.classList.toggle('is-hidden', !isCustom);
    if (isCustom) customDaysInput.focus();
  });

  function computeExpiresAt() {
    const val = expirySelect.value;
    if (val === 'none') return null;

    let days;
    if (val === 'custom') {
      days = parseInt(customDaysInput.value, 10);
      if (!days || days < 1) {
        throw new Error('Masukkan jumlah hari yang valid untuk kadaluarsa custom.');
      }
    } else {
      days = parseInt(val, 10);
    }
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  // ── Upload ────────────────────────────────────────────────────────
  async function handleFiles(fileList) {
    const files = Array.from(fileList);
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast(`"${file.name}" melebihi batas 50 MB.`, 'error');
        continue;
      }

      let expiresAt;
      try {
        expiresAt = computeExpiresAt();
      } catch (err) {
        toast(err.message, 'error');
        return;
      }

      const path = `${session.user.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

      uploadProgressEl.classList.remove('is-hidden');
      uploadProgressEl.textContent = `Mengupload "${file.name}"…`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(path, file, { contentType: file.type || 'application/octet-stream' });
        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase.from('files').insert({
          user_id: session.user.id,
          file_name: file.name,
          storage_path: path,
          file_size: file.size,
          mime_type: file.type || null,
          expires_at: expiresAt,
        });
        if (insertError) throw insertError;

        toast(`"${file.name}" berhasil diupload.`, 'success');
      } catch (err) {
        toast(`Gagal upload "${file.name}": ${err.message}`, 'error');
      }
    }

    uploadProgressEl.classList.add('is-hidden');
    fileInput.value = '';
    loadFiles();
  }

  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });
  dropzone.addEventListener('click', () => fileInput.click());

  // ── Daftar file ───────────────────────────────────────────────────
  async function loadFiles() {
    listEl.innerHTML = '<p class="fs-muted">Memuat daftar file…</p>';

    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      listEl.innerHTML = '';
      toast('Gagal memuat daftar file.', 'error');
      return;
    }

    if (!data || data.length === 0) {
      listEl.innerHTML = '';
      emptyStateEl.classList.remove('is-hidden');
      fileCountEl.textContent = '';
      return;
    }
    emptyStateEl.classList.add('is-hidden');
    fileCountEl.textContent = `${data.length} file`;

    listEl.innerHTML = '';
    data.forEach((file) => listEl.appendChild(renderFileRow(file)));
  }

  function renderFileRow(file) {
    const status = expiryStatus(file.expires_at);
    const row = document.createElement('div');
    row.className = 'fs-file-row';
    row.innerHTML = `
      <div class="fs-file-row__main">
        <span class="fs-file-row__name" title="${escapeHtml(file.file_name)}">${escapeHtml(file.file_name)}</span>
        <span class="fs-file-row__meta">${formatBytes(file.file_size)} &middot; diupload ${formatDate(file.uploaded_at)}</span>
      </div>
      <span class="fs-badge fs-badge--${status.tone}">${status.label}</span>
      <div class="fs-file-row__actions">
        <button type="button" class="fs-btn fs-btn--ghost" data-action="download" ${status.tone === 'expired' ? 'disabled' : ''}>Unduh</button>
        <button type="button" class="fs-btn fs-btn--danger-ghost" data-action="delete">Hapus</button>
      </div>
    `;

    row.querySelector('[data-action="download"]').addEventListener('click', () => downloadFile(file));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteFile(file));

    return row;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function downloadFile(file) {
    try {
      const { data, error } = await supabase.storage.from('files').download(file.storage_path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(`Gagal mengunduh "${file.file_name}": ${err.message}`, 'error');
    }
  }

  async function deleteFile(file) {
    if (!confirm(`Hapus "${file.file_name}"? Tindakan ini tidak bisa dibatalkan.`)) return;

    try {
      const { error: storageError } = await supabase.storage.from('files').remove([file.storage_path]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from('files').delete().eq('id', file.id);
      if (dbError) throw dbError;

      toast(`"${file.file_name}" dihapus.`, 'success');
      loadFiles();
    } catch (err) {
      toast(`Gagal menghapus "${file.file_name}": ${err.message}`, 'error');
    }
  }

  loadFiles();
});
