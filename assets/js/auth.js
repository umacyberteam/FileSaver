// assets/js/auth.js — login, daftar, lupa password, reset password, logout

window.FileSaver = window.FileSaver || {};

/** Redirect ke login.html kalau belum login. Panggil di halaman yang butuh login. */
window.FileSaver.requireSession = async function requireSession() {
  const supabase = await window.FileSaver.getClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
};

/** Redirect ke dashboard.html kalau sudah login. Panggil di halaman login/register. */
window.FileSaver.redirectIfAuthed = async function redirectIfAuthed() {
  const supabase = await window.FileSaver.getClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = 'dashboard.html';
  }
};

function setButtonLoading(button, loading, loadingText) {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText || 'Memproses…';
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const { toast } = window.FileSaver;

  // ── Form Login ──────────────────────────────────────────────────
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    window.FileSaver.redirectIfAuthed();

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;

      setButtonLoading(submitBtn, true, 'Masuk…');
      try {
        const supabase = await window.FileSaver.getClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = 'dashboard.html';
      } catch (err) {
        toast(err.message === 'Invalid login credentials'
          ? 'Email atau password salah.'
          : (err.message || 'Gagal masuk.'), 'error');
        setButtonLoading(submitBtn, false);
      }
    });
  }

  // ── Form Register ───────────────────────────────────────────────
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    window.FileSaver.redirectIfAuthed();

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const email = registerForm.email.value.trim();
      const password = registerForm.password.value;
      const confirmPassword = registerForm.confirmPassword.value;

      if (password !== confirmPassword) {
        toast('Konfirmasi password tidak cocok.', 'error');
        return;
      }
      if (password.length < 6) {
        toast('Password minimal 6 karakter.', 'error');
        return;
      }

      setButtonLoading(submitBtn, true, 'Mendaftar…');
      try {
        const supabase = await window.FileSaver.getClient();
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.session) {
          window.location.href = 'dashboard.html';
        } else {
          registerForm.reset();
          toast('Pendaftaran berhasil. Silakan masuk.', 'success');
          setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        }
      } catch (err) {
        toast(err.message || 'Gagal mendaftar.', 'error');
        setButtonLoading(submitBtn, false);
      }
    });
  }

  // ── Form Lupa Password ──────────────────────────────────────────
  const forgotForm = document.getElementById('forgot-password-form');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = forgotForm.querySelector('button[type="submit"]');
      const email = forgotForm.email.value.trim();

      setButtonLoading(submitBtn, true, 'Mengirim…');
      try {
        const supabase = await window.FileSaver.getClient();
        const redirectTo = `${window.location.origin}/reset-password.html`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;

        forgotForm.reset();
        toast('Link reset password sudah dikirim ke email tersebut.', 'success');
      } catch (err) {
        toast(err.message || 'Gagal mengirim email reset.', 'error');
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  // ── Form Reset Password (dibuka dari link di email) ─────────────
  const resetForm = document.getElementById('reset-password-form');
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = resetForm.querySelector('button[type="submit"]');
      const password = resetForm.password.value;
      const confirmPassword = resetForm.confirmPassword.value;

      if (password !== confirmPassword) {
        toast('Konfirmasi password tidak cocok.', 'error');
        return;
      }
      if (password.length < 6) {
        toast('Password minimal 6 karakter.', 'error');
        return;
      }

      setButtonLoading(submitBtn, true, 'Menyimpan…');
      try {
        const supabase = await window.FileSaver.getClient();
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;

        toast('Password berhasil diganti. Silakan masuk kembali.', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
      } catch (err) {
        toast(err.message || 'Gagal menyimpan password baru.', 'error');
        setButtonLoading(submitBtn, false);
      }
    });
  }

  // ── Tombol Logout (ada di dashboard) ────────────────────────────
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const supabase = await window.FileSaver.getClient();
      await supabase.auth.signOut();
      window.location.href = 'login.html';
    });
  }
});
