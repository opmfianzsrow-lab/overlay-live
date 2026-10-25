import React, { useState, useEffect } from 'react';
import {
  Swords,
  Tv,
  Coins,
  ShieldCheck,
  Zap,
  ArrowRight,
  Palette,
  Moon,
  Sparkles,
  Users,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import type { UserProfile } from '../types/queue';

interface AdminLoginProps {
  onLoginSuccess: (user: UserProfile, sessionToken: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCustomGoogleModal, setShowCustomGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  const [uiTheme, setUiTheme] = useState<'neobrutalism' | 'dark'>(() => {
    return (localStorage.getItem('dashboard_ui_theme') as 'neobrutalism' | 'dark') || 'neobrutalism';
  });

  const isNeo = uiTheme === 'neobrutalism';

  const toggleTheme = () => {
    const next = uiTheme === 'neobrutalism' ? 'dark' : 'neobrutalism';
    setUiTheme(next);
    localStorage.setItem('dashboard_ui_theme', next);
  };

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
    <div
      className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200 ${
        isNeo
          ? 'bg-[#F5F2EB] text-black selection:bg-[#FFE600] selection:text-black'
          : 'bg-[#09090b] text-white selection:bg-red-500 selection:text-white'
      }`}
    >
      {/* Top Bar with Brand & Theme Switcher */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl flex items-center justify-center ${
              isNeo
                ? 'bg-[#FFE600] border-2 border-black text-black shadow-[2.5px_2.5px_0px_0px_#000]'
                : 'bg-red-600 text-white shadow-md'
            }`}
          >
            <Swords className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-black text-base uppercase tracking-wider block">
              ANTRIAN 1V1
            </span>
            <span className="text-[10px] text-zinc-500 font-bold block uppercase -mt-0.5">
              OBS Overlay Platform
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              isNeo
                ? 'bg-white border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] text-black hover:bg-[#FFE600]'
                : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white shadow'
            }`}
          >
            {isNeo ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            ) : (
              <>
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Neobrutalism</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Landing & Hero Section */}
      <main className="max-w-4xl w-full mx-auto my-auto py-8">
        <div className="grid md:grid-cols-12 gap-8 items-center">
          {/* Left Column: Brief & Description */}
          <div className="md:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Streamer Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.08] uppercase">
              ANTRIAN 1V1
            </h1>

            <p
              className={`text-base sm:text-lg font-bold leading-relaxed ${
                isNeo ? 'text-zinc-700' : 'text-zinc-300'
              }`}
            >
              Sistem antrian 1v1 untuk streamer. Terima donasi, kelola antrian, dan tampilkan queue
              langsung di OBS secara real-time.
            </p>

            {/* Feature Pills */}
            <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
              <div
                className={`p-3 rounded-xl border-2 border-black font-bold flex items-center gap-2.5 ${
                  isNeo ? 'bg-white shadow-[3px_3px_0px_0px_#000]' : 'bg-zinc-900/90 text-zinc-200'
                }`}
              >
                <Tv className="w-5 h-5 text-red-500 shrink-0 stroke-[2.5]" />
                <div>
                  <div className="font-black uppercase">OBS Browser Source</div>
                  <div className="text-[11px] text-zinc-500">Auto height transparan</div>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border-2 border-black font-bold flex items-center gap-2.5 ${
                  isNeo ? 'bg-white shadow-[3px_3px_0px_0px_#000]' : 'bg-zinc-900/90 text-zinc-200'
                }`}
              >
                <Coins className="w-5 h-5 text-amber-500 shrink-0 stroke-[2.5]" />
                <div>
                  <div className="font-black uppercase">Sociabuzz Webhook</div>
                  <div className="text-[11px] text-zinc-500">Auto-antri & prioritas VIP</div>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border-2 border-black font-bold flex items-center gap-2.5 ${
                  isNeo ? 'bg-white shadow-[3px_3px_0px_0px_#000]' : 'bg-zinc-900/90 text-zinc-200'
                }`}
              >
                <Zap className="w-5 h-5 text-cyan-500 shrink-0 stroke-[2.5]" />
                <div>
                  <div className="font-black uppercase">Realtime Sync</div>
                  <div className="text-[11px] text-zinc-500">Live SSE tanpa reload</div>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border-2 border-black font-bold flex items-center gap-2.5 ${
                  isNeo ? 'bg-white shadow-[3px_3px_0px_0px_#000]' : 'bg-zinc-900/90 text-zinc-200'
                }`}
              >
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 stroke-[2.5]" />
                <div>
                  <div className="font-black uppercase">Data Terisolasi</div>
                  <div className="text-[11px] text-zinc-500">Overlay unik per streamer</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Google Login Box */}
          <div className="md:col-span-5">
            <div
              className={`rounded-2xl p-6 sm:p-7 relative transition-all ${
                isNeo
                  ? 'bg-white border-[3px] border-black shadow-[7px_7px_0px_0px_#000]'
                  : 'bg-[#121215] border border-zinc-800 shadow-2xl shadow-black/80'
              }`}
            >
              <div className="text-center mb-6">
                <div
                  className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 ${
                    isNeo
                      ? 'bg-[#FFE600] border-2 border-black text-black shadow-[3px_3px_0px_0px_#000]'
                      : 'bg-red-600/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  <Users className="w-7 h-7 stroke-[2.5]" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">
                  Dashboard Streamer
                </h2>
                <p className="text-xs text-zinc-500 font-bold mt-1">
                  Kelola antrian 1v1 dan overlay OBS kamu.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-[#FF4D4D] border-2 border-black text-white text-xs font-black text-center shadow-[2px_2px_0px_0px_#000]">
                  {error}
                </div>
              )}

              {/* Primary: Login dengan Google */}
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleGoogleLogin('hfiz22379@gmail.com', 'Streamer Pro')}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all cursor-pointer ${
                    isNeo
                      ? 'bg-white hover:bg-zinc-50 text-black border-[2.5px] border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                      : 'bg-white text-zinc-900 hover:bg-zinc-100 shadow-lg'
                  }`}
                >
                  {/* Official Google G Logo SVG */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isNeo
                      ? 'bg-[#FFE600] hover:bg-[#ffd700] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  <span>Gunakan Email Google Lain</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Demo Mode & Quick Access */}
              <div
                className={`mt-6 pt-5 text-center text-xs ${
                  isNeo ? 'border-t-2 border-black' : 'border-t border-zinc-800'
                }`}
              >
                <p className="text-zinc-500 font-bold mb-2">Ingin coba langsung tanpa akun?</p>
                <button
                  type="button"
                  onClick={() => handleGoogleLogin('demo@streamer.app', 'Demo Streamer')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs uppercase cursor-pointer ${
                    isNeo
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Masuk Mode Demo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Custom Google Email Login */}
      {showCustomGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full rounded-2xl p-6 relative ${
              isNeo
                ? 'bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000]'
                : 'bg-[#16161a] border border-zinc-700 text-white'
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-black">
              <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <span>Google OAuth Simulator</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomGoogleModal(false)}
                className="w-7 h-7 rounded-lg bg-red-500 text-white font-black flex items-center justify-center border-2 border-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-bold text-zinc-600 mb-4">
              Masukkan alamat email Google kamu untuk membuat instance antrian & token overlay baru:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (googleEmail) {
                  handleGoogleLogin(googleEmail, googleName);
                  setShowCustomGoogleModal(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-black uppercase mb-1">
                  Email Akun Google <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="contoh: streamer@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black text-black font-bold text-xs bg-white focus:outline-none focus:bg-[#FFFDE8] shadow-[2.5px_2.5px_0px_0px_#000]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase mb-1">
                  Nama Streamer (Opsional)
                </label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="contoh: Bang Gaming"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black text-black font-bold text-xs bg-white focus:outline-none focus:bg-[#FFFDE8] shadow-[2.5px_2.5px_0px_0px_#000]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#FFE600] hover:bg-[#ffd700] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_0px_#000] cursor-pointer"
                >
                  {loading ? 'Memproses...' : 'Lanjutkan Login Google'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">
        ANTRIAN 1V1 • Multi-Streamer Platform & Realtime OBS Browser Source
      </footer>
    </div>
  );
};
