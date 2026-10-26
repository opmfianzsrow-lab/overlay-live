import React from 'react';
import {
  Sun,
  Moon,
  Sparkles,
  Mountain,
  Wind,
  Bird,
  RotateCcw,
  X,
  Palette,
  Check,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeCustomizerModal: React.FC = () => {
  const {
    theme,
    setTheme,
    seed,
    setSeed,
    paintAnotherRange,
    layers,
    setLayers,
    drift,
    setDrift,
    sun,
    setSun,
    birds,
    setBirds,
    showCustomizer,
    setShowCustomizer,
  } = useTheme();

  if (!showCustomizer) return null;

  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl transition-all duration-300 ${
          isLight
            ? 'bg-white/90 border-black/[0.08] text-zinc-900 shadow-2xl shadow-black/10'
            : 'bg-[#121216]/90 border-white/[0.12] text-white shadow-2xl shadow-black/60'
        } backdrop-blur-2xl`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.08] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                isLight ? 'bg-zinc-100 text-zinc-800' : 'bg-white/[0.08] text-zinc-200'
              }`}
            >
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm tracking-tight">Kustomisasi Background UI</h3>
              <p
                className={`text-[11px] ${
                  isLight ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                Atur tema gelap/cerah & lukisan pegunungan Sumi-e
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCustomizer(false)}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isLight
                ? 'hover:bg-black/[0.06] text-zinc-600'
                : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 py-4 max-h-[75vh] overflow-y-auto no-scrollbar">
          {/* 1. Theme Switcher: Dark vs Light */}
          <div>
            <label
              className={`block text-xs font-medium mb-2 ${
                isLight ? 'text-zinc-700' : 'text-zinc-300'
              }`}
            >
              Pilihan Tema Utama
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-indigo-500/80 bg-indigo-500/15 shadow-sm'
                    : isLight
                    ? 'border-black/[0.08] bg-black/[0.02] hover:bg-black/[0.05]'
                    : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-indigo-400">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold">Tema Gelap (Malam)</span>
                    <span className="block text-[10px] text-zinc-400">Bulan pucat, kabut malam</span>
                  </div>
                </div>
                {theme === 'dark' && <Check className="w-4 h-4 text-indigo-400" />}
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-red-500/80 bg-red-500/15 shadow-sm'
                    : isLight
                    ? 'border-black/[0.08] bg-black/[0.02] hover:bg-black/[0.05]'
                    : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-red-600">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold">Tema Cerah (Fajar)</span>
                    <span className="block text-[10px] text-zinc-500">Matahari merah, kertas putih</span>
                  </div>
                </div>
                {theme === 'light' && <Check className="w-4 h-4 text-red-600" />}
              </button>
            </div>
          </div>

          {/* 2. Paint Another Range (Seed Generator) */}
          <div
            className={`p-4 rounded-2xl border ${
              isLight
                ? 'bg-black/[0.02] border-black/[0.06]'
                : 'bg-white/[0.03] border-white/[0.06]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium block">Lukis Ulang Rentang Gunung</span>
                <span
                  className={`text-[11px] block mt-0.5 ${
                    isLight ? 'text-zinc-500' : 'text-zinc-400'
                  }`}
                >
                  Seed saat ini: <span className="font-mono font-semibold">#{seed}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={paintAnotherRange}
                className="apple-button-primary text-xs py-2 px-3.5 flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Lukis Baru</span>
              </button>
            </div>
          </div>

          {/* 3. Mountain Layers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className={`text-xs font-medium flex items-center gap-1.5 ${
                  isLight ? 'text-zinc-700' : 'text-zinc-300'
                }`}
              >
                <Mountain className="w-3.5 h-3.5 text-zinc-400" />
                <span>Jumlah Lapis Pegunungan ({layers} Lapis)</span>
              </label>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLayers(lvl)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                    layers === lvl
                      ? isLight
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-900 border-white'
                      : isLight
                      ? 'border-black/[0.08] hover:bg-black/[0.04] text-zinc-700'
                      : 'border-white/[0.08] hover:bg-white/[0.06] text-zinc-300'
                  }`}
                >
                  {lvl} Lapis
                </button>
              ))}
            </div>
          </div>

          {/* 4. Mist Drift Speed & Birds */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className={`text-xs font-medium flex items-center gap-1.5 mb-2 ${
                  isLight ? 'text-zinc-700' : 'text-zinc-300'
                }`}
              >
                <Wind className="w-3.5 h-3.5 text-zinc-400" />
                <span>Kecepatan Kabut</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Diam', val: 0 },
                  { label: 'Halus', val: 0.035 },
                  { label: 'Aktif', val: 0.06 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setDrift(item.val)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-medium border text-center transition-all cursor-pointer ${
                      Math.abs(drift - item.val) < 0.015
                        ? isLight
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-900 border-white'
                        : isLight
                        ? 'border-black/[0.08] hover:bg-black/[0.04] text-zinc-600'
                        : 'border-white/[0.08] hover:bg-white/[0.06] text-zinc-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                className={`text-xs font-medium flex items-center gap-1.5 mb-2 ${
                  isLight ? 'text-zinc-700' : 'text-zinc-300'
                }`}
              >
                <Bird className="w-3.5 h-3.5 text-zinc-400" />
                <span>Kawanan Burung</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Tanpa', val: 0 },
                  { label: '3 Ekor', val: 3 },
                  { label: '5 Ekor', val: 5 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setBirds(item.val)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-medium border text-center transition-all cursor-pointer ${
                      birds === item.val
                        ? isLight
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-900 border-white'
                        : isLight
                        ? 'border-black/[0.08] hover:bg-black/[0.04] text-zinc-600'
                        : 'border-white/[0.08] hover:bg-white/[0.06] text-zinc-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Celestial Disc Toggle */}
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between ${
              isLight
                ? 'bg-black/[0.02] border-black/[0.06]'
                : 'bg-white/[0.03] border-white/[0.06]'
            }`}
          >
            <div>
              <span className="text-xs font-medium block">
                {isLight ? 'Matahari Senja / Fajar' : 'Bulan Malam'}
              </span>
              <span
                className={`text-[11px] block mt-0.5 ${
                  isLight ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                {isLight
                  ? 'Menampilkan lingkaran pigmen merah vermilion'
                  : 'Menampilkan bulan perak di atas puncak'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSun(!sun)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                sun
                  ? isLight
                    ? 'bg-red-500'
                    : 'bg-indigo-500'
                  : isLight
                  ? 'bg-zinc-300'
                  : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  sun ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
          <div className="text-[11px] text-zinc-400">
            Tersimpan otomatis di peramban
          </div>
          <button
            type="button"
            onClick={() => setShowCustomizer(false)}
            className="apple-button-primary text-xs py-2 px-5 cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
