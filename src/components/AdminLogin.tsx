import React, { useState, useEffect } from 'react';
import {
  Swords,
  Tv,
  Coins,
  ShieldCheck,
  Zap,
  Info,
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import type { UserProfile } from '../types/queue';
import { useTheme } from '../context/ThemeContext';
import {
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  sendPasswordResetEmail,
  updateUserPassword,
  isValidEmail,
} from '../lib/supabase';

interface AdminLoginProps {
  onLoginSuccess: (user: UserProfile, sessionToken: string) => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Check if page opened via Supabase Password Reset link (/reset-password or recovery hash)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const pathname = window.location.pathname;
      if (
        pathname.includes('/reset-password') ||
        hash.includes('type=recovery') ||
        hash.includes('access_token')
      ) {
        setAuthMode('reset');
        setInfoMessage('Silakan masukkan password baru untuk akun Anda.');
      }
    }
  }, []);

  // Helper to sync authenticated Supabase session with local backend DB or direct state
  const syncUserSession = async (
    authUserId: string,
    userEmail: string,
    userName?: string,
    avatarUrl?: string,
    existingProfile?: UserProfile,
    accessToken?: string
  ) => {
    const userToSave: UserProfile = existingProfile || {
      id: 'usr_' + authUserId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12),
      auth_user_id: authUserId,
      email: userEmail,
      name: userName || userEmail.split('@')[0],
      avatar_url: avatarUrl,
      role: 'streamer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let sessionToken = accessToken || localStorage.getItem('streamer_session_token') || 'tok_' + authUserId;

    // Optional background sync with backend /api/auth/session if available
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          auth_user_id: authUserId,
          email: userEmail,
          name: userName || userEmail.split('@')[0],
          avatar_url: avatarUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.user) {
          onLoginSuccess(data.user, data.sessionToken || sessionToken);
          return;
        }
      }
    } catch {
      // Non-blocking: In pure Vercel serverless / static frontend, proceed with Supabase profile
    }

    onLoginSuccess(userToSave, sessionToken);
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    setLoading(true);

    try {
      if (authMode === 'login') {
        // --- 1. LOGIN MODE ---
        if (!isValidEmail(email)) {
          throw new Error('Format alamat email tidak valid.');
        }
        if (!password) {
          throw new Error('Password wajib diisi.');
        }

        const res = await signInWithEmail(email, password);
        if (res.error) {
          throw new Error(res.error);
        }
        if (!res.user || !res.session) {
          throw new Error('Sesi login tidak ditemukan. Harap periksa email dan password Anda.');
        }

        await syncUserSession(
          res.user.auth_user_id || res.session.user.id,
          res.user.email || email,
          res.user.name,
          res.user.avatar_url,
          res.user,
          res.sessionToken || res.session.access_token
        );
      } else if (authMode === 'register') {
        // --- 2. REGISTER MODE ---
        if (!fullName.trim()) {
          throw new Error('Nama lengkap/streamer wajib diisi.');
        }
        if (!isValidEmail(email)) {
          throw new Error('Format alamat email tidak valid.');
        }
        if (password.length < 6) {
          throw new Error('Password minimal harus 6 karakter.');
        }
        if (password !== confirmPassword) {
          throw new Error('Konfirmasi password tidak cocok.');
        }

        const res = await signUpWithEmail(email, password, fullName);
        if (res.error) {
          throw new Error(res.error);
        }

        if (res.needEmailVerification) {
          setInfoMessage(
            `Pendaftaran akun streamer berhasil! Email konfirmasi telah dikirim ke ${email}. Silakan periksa folder Inbox atau Spam email Anda untuk mengonfirmasi akun sebelum login.`
          );
          setAuthMode('login');
          setPassword('');
          setConfirmPassword('');
          return;
        }

        if (res.user && res.session) {
          await syncUserSession(
            res.user.auth_user_id || res.session.user.id,
            res.user.email || email,
            res.user.name || fullName.trim(),
            res.user.avatar_url,
            res.user,
            res.sessionToken || res.session.access_token
          );
        } else {
          throw new Error('Pendaftaran tidak mengembalikan data pengguna dari Supabase.');
        }
      } else if (authMode === 'forgot') {
        // --- 3. FORGOT PASSWORD MODE ---
        if (!isValidEmail(email)) {
          throw new Error('Format alamat email tidak valid.');
        }

        const res = await sendPasswordResetEmail(email);
        if (!res.success) throw new Error(res.error || 'Gagal mengirim email reset password.');

        setInfoMessage(res.message || 'Link reset password telah dikirim ke email Anda!');
        setAuthMode('login');
      } else if (authMode === 'reset') {
        // --- 4. RESET PASSWORD MODE ---
        if (password.length < 6) {
          throw new Error('Password baru minimal harus 6 karakter.');
        }
        if (password !== confirmPassword) {
          throw new Error('Konfirmasi password baru tidak cocok.');
        }

        const res = await updateUserPassword(password);
        if (!res.success) throw new Error(res.error || 'Gagal memperbarui password.');

        setInfoMessage('Password Anda berhasil diperbarui! Silakan login dengan password baru.');
        setAuthMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Terjadi kesalahan autentikasi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-61px)] w-full flex flex-col justify-between p-6 sm:p-10 z-10">
      {/* Ambient background glow */}
      {isLight ? (
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[radial-gradient(circle_at_center,rgba(200,59,43,0.06),transparent_70%)] blur-3xl" />
      ) : (
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[radial-gradient(circle_at_center,rgba(41,151,255,0.07),transparent_70%)] blur-3xl" />
      )}

      {/* Main Content Area */}
      <main className="relative z-10 max-w-5xl w-full mx-auto my-auto py-8">
        <div className="grid md:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left Column: SaaS Value Proposition */}
          <div className="md:col-span-7 space-y-6">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium tracking-tight border backdrop-blur-md ${
                isLight
                  ? 'bg-black/[0.04] text-zinc-700 border-black/[0.08]'
                  : 'bg-white/[0.06] text-zinc-300 border-white/[0.1]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#2997ff]" />
              <span>Multi-Streamer SaaS Platform</span>
            </div>

            <div className="space-y-3">
              <h1
                className={`text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.04em] leading-[1.05] ${
                  isLight ? 'text-zinc-950' : 'text-white'
                }`}
              >
                ANTRIAN 1V1
              </h1>
              <p
                className={`text-base sm:text-lg font-normal leading-relaxed max-w-xl ${
                  isLight ? 'text-zinc-600' : 'text-zinc-400'
                }`}
              >
                Overlay live interaktif profesional untuk streamer. Terintegrasi penuh dengan Sociabuzz webhook, penataan prioritas VIP otomatis, dan OBS Browser Source transparan real-time.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="apple-card p-4 rounded-2xl flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[#2997ff] border ${
                    isLight ? 'bg-blue-50/80 border-blue-200' : 'bg-white/[0.06] border-white/[0.08]'
                  }`}
                >
                  <Tv className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-sm font-medium tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                    OBS Browser Source
                  </div>
                  <div className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Auto-height dinamis & transparan
                  </div>
                </div>
              </div>

              <div className="apple-card p-4 rounded-2xl flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[#d97706] border ${
                    isLight ? 'bg-amber-50/80 border-amber-200' : 'bg-white/[0.06] border-white/[0.08]'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-sm font-medium tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                    Sociabuzz Webhook
                  </div>
                  <div className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Prioritas VVIP & deduplikasi otomatis
                  </div>
                </div>
              </div>

              <div className="apple-card p-4 rounded-2xl flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[#16a34a] border ${
                    isLight ? 'bg-emerald-50/80 border-emerald-200' : 'bg-white/[0.06] border-white/[0.08]'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-sm font-medium tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                    Real-Time Sync
                  </div>
                  <div className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Live SSE tanpa reload browser
                  </div>
                </div>
              </div>

              <div className="apple-card p-4 rounded-2xl flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[#9333ea] border ${
                    isLight ? 'bg-purple-50/80 border-purple-200' : 'bg-white/[0.06] border-white/[0.08]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-sm font-medium tracking-tight ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                    Isolasi Multi-Tenant
                  </div>
                  <div className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Data terisolasi per akun Supabase
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Email/Password Auth Box */}
          <div className="md:col-span-5">
            <div className="apple-glass rounded-3xl p-7 sm:p-8 relative shadow-2xl">
              {/* Header Icon & Mode Title */}
              <div className="text-center mb-6">
                <div
                  className={`w-12 h-12 mx-auto rounded-2xl border flex items-center justify-center mb-3 shadow-inner ${
                    isLight
                      ? 'bg-zinc-100 border-black/10 text-zinc-800'
                      : 'bg-white/[0.08] border-white/[0.12] text-white'
                  }`}
                >
                  {authMode === 'reset' ? (
                    <KeyRound className="w-5 h-5 text-[#2997ff]" />
                  ) : authMode === 'forgot' ? (
                    <Mail className="w-5 h-5 text-[#ffd60a]" />
                  ) : authMode === 'register' ? (
                    <User className="w-5 h-5 text-[#30d158]" />
                  ) : (
                    <Swords className="w-5 h-5" />
                  )}
                </div>

                <h2 className={`text-xl font-semibold tracking-[-0.02em] ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                  {authMode === 'register'
                    ? 'Daftar Akun Streamer'
                    : authMode === 'forgot'
                    ? 'Lupa Password'
                    : authMode === 'reset'
                    ? 'Reset Password'
                    : 'Masuk Dashboard'}
                </h2>

                <p className={`text-xs mt-1 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {authMode === 'register'
                    ? 'Buat akun baru untuk mengelola antrian 1v1 & OBS overlay'
                    : authMode === 'forgot'
                    ? 'Masukkan email terdaftar untuk menerima link reset password'
                    : authMode === 'reset'
                    ? 'Masukkan password baru minimal 6 karakter'
                    : 'Gunakan email dan password terdaftar Anda'}
                </p>
              </div>



              {/* Status & Feedback Messages */}
              {error && (
                <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <span>{error}</span>
                  </div>
                  {(error.toLowerCase().includes('api') || error.toLowerCase().includes('kunci')) && (
                    <div className="pt-2 border-t border-red-500/20 text-[11px] text-zinc-300 space-y-1 font-normal leading-relaxed">
                      <p className="font-semibold text-amber-400">💡 Cara Mengatasi Invalid API Key Supabase:</p>
                      <ol className="list-decimal list-inside space-y-1 text-zinc-300">
                        <li>Buka <strong>Supabase Dashboard</strong> (&rarr; Project Settings &rarr; API).</li>
                        <li>Salin <strong>Project URL</strong> dan <strong>Publishable / Anon key</strong> Anda (format <code>sb_publishable_...</code> atau <code>eyJ...</code>).</li>
                        <li>Masukkan ke file <code>.env</code> sebagai <code>VITE_SUPABASE_ANON_KEY</code> atau <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {infoMessage && (
                <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-start gap-2 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {/* MAIN AUTH FORM */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name field (Register mode only) */}
                {authMode === 'register' && (
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                      Nama Streamer / Channel <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Contoh: Budi Gaming"
                        className="apple-input text-xs w-full pl-10 pr-3.5 py-2.5 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Email field (Login, Register, Forgot mode) */}
                {authMode !== 'reset' && (
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                      Alamat Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="streamer@email.com"
                        className="apple-input text-xs w-full pl-10 pr-3.5 py-2.5 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Password field (Login, Register, Reset mode) */}
                {authMode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-xs font-medium ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                        {authMode === 'reset' ? 'Password Baru' : 'Password'} <span className="text-red-500">*</span>
                      </label>
                      {authMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('forgot');
                            setError('');
                            setInfoMessage('');
                          }}
                          className="text-[11px] text-[#2997ff] hover:underline cursor-pointer"
                        >
                          Lupa password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="apple-input text-xs w-full pl-10 pr-3.5 py-2.5 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Confirm Password field (Register, Reset mode) */}
                {(authMode === 'register' || authMode === 'reset') && (
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>
                      Konfirmasi Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi password"
                        className="apple-input text-xs w-full pl-10 pr-3.5 py-2.5 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3.5 px-5 rounded-full font-medium text-xs tracking-tight flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.98] disabled:opacity-50 ${
                      isLight
                        ? 'bg-zinc-900 hover:bg-black text-white shadow-zinc-900/10'
                        : 'bg-white hover:bg-zinc-100 text-black shadow-white/5'
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {authMode === 'register'
                            ? 'Buat Akun Streamer'
                            : authMode === 'forgot'
                            ? 'Kirim Link Reset Password'
                            : authMode === 'reset'
                            ? 'Simpan Password Baru'
                            : 'Masuk Sesi'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Mode Switchers */}
              <div className="mt-5 pt-4 border-t border-white/[0.08] text-center text-xs space-y-2">
                {authMode === 'login' && (
                  <p className={isLight ? 'text-zinc-600' : 'text-zinc-400'}>
                    Belum punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setError('');
                        setInfoMessage('');
                      }}
                      className="font-semibold text-[#2997ff] hover:underline cursor-pointer"
                    >
                      Daftar akun baru
                    </button>
                  </p>
                )}

                {(authMode === 'register' || authMode === 'forgot' || authMode === 'reset') && (
                  <p className={isLight ? 'text-zinc-600' : 'text-zinc-400'}>
                    Sudah punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setError('');
                        setInfoMessage('');
                      }}
                      className="font-semibold text-[#2997ff] hover:underline cursor-pointer"
                    >
                      Masuk sekarang
                    </button>
                  </p>
                )}

              </div>

              {/* Terms of Service & Privacy Policy disclaimer */}
              <div
                className={`mt-4 pt-3 text-center text-[11px] leading-relaxed border-t ${
                  isLight ? 'border-black/[0.08] text-zinc-500' : 'border-white/[0.08] text-zinc-400'
                }`}
              >
                Dengan masuk atau mendaftar, Anda menyetujui <span className="underline cursor-pointer">Terms of Service</span> dan <span className="underline cursor-pointer">Privacy Policy</span> platform.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`relative z-10 max-w-5xl w-full mx-auto text-center py-4 text-[11px] tracking-tight font-normal ${
          isLight ? 'text-zinc-500' : 'text-zinc-500'
        }`}
      >
        ANTRIAN 1V1 • Studio-Grade Multi-Streamer Platform &amp; Realtime OBS Browser Source
      </footer>
    </div>
  );
};

