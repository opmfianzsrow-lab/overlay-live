import React, { useState } from 'react';
import {
  Swords,
  Tv,
  Coins,
  ShieldCheck,
  Zap,
  Info,
  X,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import type { UserProfile } from '../types/queue';
import { useTheme } from '../context/ThemeContext';
import { isSupabaseConfigured, signInWithGoogle } from '../lib/supabase';

interface AdminLoginProps {
  onLoginSuccess: (user: UserProfile, sessionToken: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);

  const supabaseConfigured = isSupabaseConfigured();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    if (!supabaseConfigured) {
      setLoading(false);
      setShowSetupModal(true);
      return;
    }

    try {
      const res = await signInWithGoogle();
      if (res.error) {
        throw new Error(res.error);
      }
      // Redirect to Google OAuth is handled by Supabase
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Gagal menghubungkan ke layanan Google OAuth.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-61px)] w-full flex flex-col justify-between p-6 sm:p-10 z-10">
      {/* Subtle atmospheric ambient glow */}
      {isLight ? (
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[radial-gradient(circle_at_center,rgba(200,59,43,0.06),transparent_70%)] blur-3xl" />
      ) : (
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[radial-gradient(circle_at_center,rgba(41,151,255,0.07),transparent_70%)] blur-3xl" />
      )}

      {/* Main Landing & Hero Section */}
      <main className="relative z-10 max-w-5xl w-full mx-auto my-auto py-8">
        <div className="grid md:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left Column: Brief & Description */}
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

            {/* Feature Cards in Apple Minimal Grid */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="apple-card p-4 rounded-2xl flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[#2997ff] border ${
                    isLight
                      ? 'bg-blue-50/80 border-blue-200'
                      : 'bg-white/[0.06] border-white/[0.08]'
                  }`}
                >
                  <Tv className="w-4 h-4" />
                </div>
                <div>
                  <div
                    className={`text-sm font-medium tracking-tight ${
                      isLight ? 'text-zinc-900' : 'text-white'
                    }`}
                  >
                    OBS Browser Source
                  </div>
                  <div
                    className={`text-xs mt-0.5 leading-snug ${
                      isLight ? 'text-zinc-500' : 'text-zinc-400'
                    }`}
                  >
                    Auto-height dinamis & transparan
                  </div>
                </div>
              </div>

              <div className="apple-card p-4 rounded-2xl flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[#d97706] border ${
                    isLight
                      ? 'bg-amber-50/80 border-amber-200'
                      : 'bg-white/[0.06] border-white/[0.08]'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <div
                    className={`text-sm font-medium tracking-tight ${
                      isLight ? 'text-zinc-900' : 'text-white'
                    }`}
                  >
                    Sociabuzz Webhook
                  </div>
                  <div
                    className={`text-xs mt-0.5 leading-snug ${
                      isLight ? 'text-zinc-500' : 'text-zinc-400'
                    }`}
                  >
                    Prioritas VVIP & deduplikasi otomatis
                  </div>
                </div>
              </div>

              <div className="apple-card p-4 rounded-2xl flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[#16a34a] border ${
                    isLight
                      ? 'bg-emerald-50/80 border-emerald-200'
                      : 'bg-white/[0.06] border-white/[0.08]'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div
                    className={`text-sm font-medium tracking-tight ${
                      isLight ? 'text-zinc-900' : 'text-white'
                    }`}
                  >
                    Real-Time Sync
                  </div>
                  <div
                    className={`text-xs mt-0.5 leading-snug ${
                      isLight ? 'text-zinc-500' : 'text-zinc-400'
                    }`}
                  >
                    Live SSE tanpa reload browser
                  </div>
                </div>
              </div>

              <div className="apple-card p-4 rounded-2xl flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[#9333ea] border ${
                    isLight
                      ? 'bg-purple-50/80 border-purple-200'
                      : 'bg-white/[0.06] border-white/[0.08]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div
                    className={`text-sm font-medium tracking-tight ${
                      isLight ? 'text-zinc-900' : 'text-white'
                    }`}
                  >
                    Isolasi Multi-Tenant
                  </div>
                  <div
                    className={`text-xs mt-0.5 leading-snug ${
                      isLight ? 'text-zinc-500' : 'text-zinc-400'
                    }`}
                  >
                    Data terisolasi per akun Google
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Google Login Box */}
          <div className="md:col-span-5">
            <div className="apple-glass rounded-3xl p-7 sm:p-8 relative">
              <div className="text-center mb-6">
                <div
                  className={`w-12 h-12 mx-auto rounded-2xl border flex items-center justify-center mb-3 shadow-inner ${
                    isLight
                      ? 'bg-zinc-100 border-black/10 text-zinc-800'
                      : 'bg-white/[0.08] border-white/[0.12] text-white'
                  }`}
                >
                  <Swords className="w-5 h-5" />
                </div>
                <h2
                  className={`text-xl font-semibold tracking-[-0.02em] ${
                    isLight ? 'text-zinc-900' : 'text-white'
                  }`}
                >
                  Masuk Dashboard
                </h2>
                <p
                  className={`text-xs mt-1 ${
                    isLight ? 'text-zinc-500' : 'text-zinc-400'
                  }`}
                >
                  Satu akun Google untuk antrian live dan overlay OBS kamu.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium text-center">
                  {error}
                </div>
              )}

              {/* Primary: Continue with Google Button */}
              <div className="space-y-4">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className={`w-full py-3.5 px-5 rounded-full font-medium text-sm tracking-tight flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg active:scale-[0.98] ${
                    isLight
                      ? 'bg-zinc-900 hover:bg-black text-white shadow-zinc-900/10'
                      : 'bg-white hover:bg-zinc-100 text-black shadow-white/5'
                  }`}
                >
                  {/* Official Google G Logo SVG */}
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{loading ? 'Menghubungkan...' : 'Continue with Google'}</span>
                </button>

                {!supabaseConfigured && (
                  <button
                    type="button"
                    onClick={() => setShowSetupModal(true)}
                    className="w-full text-center text-xs text-[#2997ff] hover:underline flex items-center justify-center gap-1 cursor-pointer pt-1"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Petunjuk Konfigurasi Google OAuth & Supabase</span>
                  </button>
                )}
              </div>

              {/* Terms of Service & Privacy Policy disclaimer */}
              <div
                className={`mt-6 pt-5 text-center text-[11px] leading-relaxed border-t ${
                  isLight ? 'border-black/[0.08] text-zinc-500' : 'border-white/[0.08] text-zinc-400'
                }`}
              >
                Dengan masuk, kamu menyetujui <span className="underline cursor-pointer">Terms of Service</span> dan <span className="underline cursor-pointer">Privacy Policy</span> platform kami.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Supabase Configuration Setup Guide */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`max-w-lg w-full rounded-3xl p-6 relative apple-glass shadow-2xl border ${
              isLight ? 'border-black/[0.1]' : 'border-white/[0.12]'
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 mb-4 border-b ${
                isLight ? 'border-black/[0.08]' : 'border-white/[0.08]'
              }`}
            >
              <h3
                className={`font-semibold text-sm tracking-tight flex items-center gap-2 ${
                  isLight ? 'text-zinc-900' : 'text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-[#2997ff]" />
                <span>Konfigurasi Supabase & Google OAuth</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-black/[0.05] hover:bg-black/[0.1] text-zinc-700 border-black/[0.08]'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 border-white/[0.08]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p
              className={`text-xs mb-4 leading-relaxed ${
                isLight ? 'text-zinc-600' : 'text-zinc-400'
              }`}
            >
              Untuk mengaktifkan autentikasi akun Google asli dan database multi-tenant secara live di project Anda:
            </p>

            <div className="space-y-3 text-xs mb-5">
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-start gap-2.5">
                <span className="font-mono font-bold text-[#2997ff]">01</span>
                <div>
                  <span className="font-semibold block text-white">Masukkan Environment Variables (.env)</span>
                  <span className="text-zinc-400 block mt-0.5">
                    Isi <code className="text-[#ffd60a]">VITE_SUPABASE_URL</code> dan <code className="text-[#ffd60a]">VITE_SUPABASE_ANON_KEY</code> dari Project Settings &gt; API di Supabase.
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-start gap-2.5">
                <span className="font-mono font-bold text-[#30d158]">02</span>
                <div>
                  <span className="font-semibold block text-white">Aktifkan Google Provider</span>
                  <span className="text-zinc-400 block mt-0.5">
                    Buka Supabase Dashboard &gt; Authentication &gt; Providers &gt; Google, lalu masukkan Client ID &amp; Secret dari Google Cloud Console.
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-start gap-2.5">
                <span className="font-mono font-bold text-[#ffd60a]">03</span>
                <div>
                  <span className="font-semibold block text-white">Jalankan Migrasi SQL</span>
                  <span className="text-zinc-400 block mt-0.5">
                    Buka SQL Editor di Supabase lalu jalankan file <code className="text-zinc-200">supabase-schema.sql</code> yang telah disediakan di root project.
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className={`py-2 px-5 rounded-full font-medium text-xs tracking-tight transition-all cursor-pointer ${
                  isLight
                    ? 'bg-zinc-900 hover:bg-black text-white'
                    : 'bg-white hover:bg-zinc-100 text-black'
                }`}
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}

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
