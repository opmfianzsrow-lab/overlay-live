import React, { useState, useEffect } from 'react';
import { Lock, Swords, ArrowRight, KeyRound, Palette, Moon } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (pin: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uiTheme, setUiTheme] = useState<'neobrutalism' | 'dark'>(() => {
    return (localStorage.getItem('dashboard_ui_theme') as 'neobrutalism' | 'dark') || 'neobrutalism';
  });

  const toggleTheme = () => {
    const next = uiTheme === 'neobrutalism' ? 'dark' : 'neobrutalism';
    setUiTheme(next);
    localStorage.setItem('dashboard_ui_theme', next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'PIN salah!');
      }

      localStorage.setItem('streamer_admin_pin', pin.trim());
      onLoginSuccess(pin.trim());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Gagal login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUseDefault = () => {
    setPin('streamer123');
  };

  const isNeo = uiTheme === 'neobrutalism';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
      isNeo ? 'bg-[#F5F2EB] text-black selection:bg-[#FFE600] selection:text-black' : 'bg-[#09090b] text-white selection:bg-red-500 selection:text-white'
    }`}>
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={toggleTheme}
          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
            isNeo
              ? 'bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] text-black hover:bg-[#FFE600]'
              : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 shadow-md'
          }`}
        >
          {isNeo ? (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ganti ke Dark Mode 🌙</span>
            </>
          ) : (
            <>
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Ganti ke Neobrutalism 🎨</span>
            </>
          )}
        </button>
      </div>

      <div className={`max-w-md w-full rounded-2xl p-8 relative transition-all ${
        isNeo
          ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
          : 'bg-[#121215] border border-zinc-800 shadow-2xl shadow-black/80'
      }`}>
        {/* Playful Tag */}
        {isNeo ? (
          <div className="absolute -top-4 -right-2 bg-[#FFE600] text-black font-black text-xs px-3 py-1 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] uppercase tracking-wider rotate-3">
            Admin Area ★
          </div>
        ) : (
          <div className="absolute -top-3.5 right-4 bg-red-600/20 text-red-400 border border-red-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest backdrop-blur-sm">
            Admin Area
          </div>
        )}

        <div className="text-center mb-6">
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3 transition-all ${
            isNeo
              ? 'bg-[#FF4D4D] border-[2.5px] border-black text-white shadow-[4px_4px_0px_0px_#000]'
              : 'bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-lg shadow-red-900/30 border border-red-500/30'
          }`}>
            <Swords className="w-8 h-8" />
          </div>
          <h1 className={`text-3xl font-black tracking-tight uppercase ${isNeo ? 'text-black' : 'text-white'}`}>
            Admin Streamer
          </h1>
          <p className={`text-xs font-bold mt-1 ${isNeo ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Control Panel Antrian 1v1 & OBS Overlay
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`p-3 rounded-xl text-xs text-center font-black ${
              isNeo
                ? 'bg-[#FF4D4D] border-2 border-black text-white shadow-[3px_3px_0px_0px_#000]'
                : 'bg-red-500/20 border border-red-500/40 text-red-300'
            }`}>
              {error}
            </div>
          )}

          <div>
            <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
              isNeo ? 'text-black' : 'text-zinc-300'
            }`}>
              PIN / Sandi Admin
            </label>
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                isNeo ? 'text-black' : 'text-zinc-500'
              }`}>
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN Admin..."
                className={`w-full pl-10 pr-4 py-3 rounded-xl font-mono tracking-widest text-sm transition-all focus:outline-none ${
                  isNeo
                    ? 'bg-white border-[2.5px] border-black text-black placeholder-zinc-400 shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFFDE8] focus:shadow-[4px_4px_0px_0px_#000]'
                    : 'bg-zinc-900/90 border border-zinc-700 text-white placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              isNeo
                ? 'bg-[#FFE600] hover:bg-[#FFD700] text-black border-[2.5px] border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000]'
                : 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-lg shadow-red-900/40 active:scale-[0.99]'
            }`}
          >
            {loading ? (
              <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${isNeo ? 'border-black' : 'border-white'}`} />
            ) : (
              <>
                <span>Masuk Dashboard</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </form>

        <div className={`mt-6 pt-5 text-center ${isNeo ? 'border-t-[2.5px] border-black' : 'border-t border-zinc-800'}`}>
          <p className={`text-xs font-bold mb-2 ${isNeo ? 'text-zinc-700' : 'text-zinc-400'}`}>
            Default PIN: <code className={`px-2 py-0.5 rounded font-mono font-black ${
              isNeo ? 'text-black bg-[#FFE600] border border-black' : 'text-amber-400 bg-zinc-800 border border-zinc-700'
            }`}>streamer123</code>
          </p>
          <button
            onClick={handleUseDefault}
            type="button"
            className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              isNeo
                ? 'text-black bg-zinc-100 hover:bg-zinc-200 border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                : 'text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 hover:text-white border border-zinc-700 shadow'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Isi Otomatis PIN Default</span>
          </button>
        </div>
      </div>
    </div>
  );
};

