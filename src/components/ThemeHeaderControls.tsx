import React from 'react';
import { Sun, Moon, Palette, RotateCcw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeHeaderControls: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { theme, toggleTheme, paintAnotherRange, setShowCustomizer } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="flex items-center gap-1.5">
      {/* 1. Direct Dark / Light Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        title={isLight ? 'Ganti ke Tema Gelap (Malam)' : 'Ganti ke Tema Cerah (Fajar)'}
        className={`px-2.5 py-1.5 rounded-full transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer backdrop-blur-xl border ${
          isLight
            ? 'bg-black/[0.05] border-black/[0.08] text-zinc-800 hover:bg-black/[0.1]'
            : 'bg-white/[0.06] border-white/[0.1] text-zinc-200 hover:bg-white/[0.12] hover:text-white'
        }`}
      >
        {isLight ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-600" />
            {!compact && <span>Cerah</span>}
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            {!compact && <span>Gelap</span>}
          </>
        )}
      </button>

      {/* 2. Repaint Mountain Seed */}
      <button
        type="button"
        onClick={paintAnotherRange}
        title="Lukis Ulang Pegunungan (Ganti Gunung Baru)"
        className={`p-1.5 rounded-full transition-all text-xs flex items-center justify-center cursor-pointer backdrop-blur-xl border ${
          isLight
            ? 'bg-black/[0.05] border-black/[0.08] text-zinc-700 hover:bg-black/[0.1]'
            : 'bg-white/[0.06] border-white/[0.1] text-zinc-300 hover:bg-white/[0.12] hover:text-white'
        }`}
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* 3. Open Detailed Customizer Modal */}
      <button
        type="button"
        onClick={() => setShowCustomizer(true)}
        title="Kustomisasi Background UI & Tema"
        className={`p-1.5 rounded-full transition-all text-xs flex items-center justify-center cursor-pointer backdrop-blur-xl border ${
          isLight
            ? 'bg-black/[0.05] border-black/[0.08] text-zinc-700 hover:bg-black/[0.1]'
            : 'bg-white/[0.06] border-white/[0.1] text-zinc-300 hover:bg-white/[0.12] hover:text-white'
        }`}
      >
        <Palette className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
