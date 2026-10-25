import React, { useState } from 'react';
import {
  Swords,
  Tv,
  Coins,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { UserProfile } from '../types/queue';
import InkRidges from './ui/ink-ridges';

interface AdminLoginProps {
  onLoginSuccess: (user: UserProfile, sessionToken: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCustomGoogleModal, setShowCustomGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  const handleGoogleLogin = async (email: string, name?: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name ? name.trim() : email.split('@')[0],
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email.trim())}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal login dengan akun Google');
      }

      localStorage.setItem('streamer_session_token', data.sessionToken);
      localStorage.setItem('streamer_user_data', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.sessionToken);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Terjadi kendala saat login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <InkRidges
      layers={4}
      seed={18}
      horizon={0.65}
      mist={0.58}
      drift={0.04}
      parallax={0.035}
      paintIn={2400}
      sun={true}
      sunPosition={[0.82, 0.74]}
      sunSize={0.075}
      sunColor="#ff453a"
      moon="auto"
      glow={0.5}
      clouds={0.32}
      birds={5}
      birdsEvery={12}
      grain={0.22}
      className="relative min-h-[calc(100vh-61px)] w-full bg-[#000000] text-white selection:bg-white/20 selection:text-white antialiased overflow-hidden"
    >
      <div className="relative min-h-[calc(100vh-61px)] flex flex-col justify-between p-6 sm:p-10 z-10">
        {/* Subtle radial ambient glows and soft gradient vignette overlay for optimal card legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[radial-gradient(circle_at_center,rgba(41,151,255,0.07),transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-10 w-[400px] h-[300px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_70%)] blur-2xl" />

      {/* Main Landing & Hero Section */}
      <main className="relative z-10 max-w-5xl w-full mx-auto my-auto py-10">
        <div className="grid md:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Brief & Description */}
          <div className="md:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium tracking-tight bg-white/[0.06] text-zinc-300 border border-white/[0.1] backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2997ff]" />
              <span>Multi-Streamer OBS Architecture</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.04em] leading-[1.05] text-white">
                ANTRIAN 1V1
              </h1>
              <p className="text-base sm:text-lg text-zinc-400 font-normal leading-relaxed max-w-xl">
                Platform antrian live match profesional untuk streamer. Terintegrasi penuh dengan webhook donasi Sociabuzz, penataan prioritas VIP otomatis, dan OBS Browser Source transparan real-time.
              </p>
            </div>

            {/* Feature Cards in Apple Minimal Grid */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="apple-card p-4 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#2997ff]">
                  <Tv className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white tracking-tight">OBS Browser Source</div>
                  <div className="text-xs text-zinc-500 mt-0.5 leading-snug">Auto-height dinamis & transparan</div>
                </div>
              </div>

              <div className="apple-card p-4 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#ffd60a]">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white tracking-tight">Sociabuzz Webhook</div>
                  <div className="text-xs text-zinc-500 mt-0.5 leading-snug">Prioritas VVIP & deduplikasi otomatis</div>
                </div>
              </div>

              <div className="apple-card p-4 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#30d158]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white tracking-tight">Real-Time Sync</div>
                  <div className="text-xs text-zinc-500 mt-0.5 leading-snug">Live SSE tanpa perlu reload browser</div>
                </div>
              </div>

              <div className="apple-card p-4 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#bf5af2]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white tracking-tight">Isolasi Multi-User</div>
                  <div className="text-xs text-zinc-500 mt-0.5 leading-snug">Token overlay unik tiap streamer</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Google Login Box */}
          <div className="md:col-span-5">
            <div className="apple-glass rounded-3xl p-7 sm:p-8 relative">
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center mb-3 text-white shadow-inner">
                  <Swords className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">
                  Dashboard Streamer
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Kelola antrian 1v1 dan overlay OBS kamu dalam satu tempat.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium text-center">
                  {error}
                </div>
              )}

              {/* Primary: Login dengan Google */}
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleGoogleLogin('hfiz22379@gmail.com', 'Streamer Pro')}
                  className="w-full py-3.5 px-5 rounded-full font-medium text-sm tracking-tight flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-black shadow-lg shadow-white/5 active:scale-[0.98] transition-all cursor-pointer"
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
                  <span>Login dengan Google</span>
                </button>

                {/* Direct quick action for another email */}
                <button
                  type="button"
                  onClick={() => setShowCustomGoogleModal(true)}
                  className="w-full py-2.5 px-4 rounded-full font-normal text-xs text-zinc-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Gunakan Akun Google Lain</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>

              {/* Demo Mode Quick Access */}
              <div className="mt-6 pt-5 text-center text-xs border-t border-white/[0.08]">
                <p className="text-zinc-500 mb-2 font-normal">Coba instan dengan akun pratinjau:</p>
                <button
                  type="button"
                  onClick={() => handleGoogleLogin('demo@streamer.app', 'Demo Streamer')}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer"
                >
                  <Tv className="w-3 h-3 text-[#2997ff]" />
                  <span>Masuk Akun Demo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Custom Google Email Login */}
      {showCustomGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl p-6 relative apple-glass shadow-2xl border border-white/[0.12]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
              <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                <span>Google OAuth Simulator</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomGoogleModal(false)}
                className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 flex items-center justify-center border border-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Masukkan alamat email Google kamu untuk membuat sesi antrian streamer dan token overlay OBS tersendiri:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (googleEmail) {
                  handleGoogleLogin(googleEmail, googleName);
                  setShowCustomGoogleModal(false);
                }
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                  Email Akun Google <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="streamer@gmail.com"
                  className="apple-input text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                  Nama Tampilan Streamer
                </label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Contoh: Bang Gaming"
                  className="apple-input text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-full bg-white hover:bg-zinc-100 text-black font-medium text-xs tracking-tight transition-all cursor-pointer active:scale-[0.98]"
                >
                  {loading ? 'Menghubungkan...' : 'Lanjutkan Login Google'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 max-w-5xl w-full mx-auto text-center py-4 text-[11px] text-zinc-500 tracking-tight font-normal">
        ANTRIAN 1V1 • Studio-Grade Multi-Streamer Platform & Realtime OBS Browser Source
      </footer>
      </div>
    </InkRidges>
  );
};

