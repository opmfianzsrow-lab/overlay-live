import React from 'react';
import InkRidges from './ui/ink-ridges';
import { useTheme } from '../context/ThemeContext';

export const AppBackground: React.FC = () => {
  const { theme, seed, layers, drift, sun, birds } = useTheme();

  const isLight = theme === 'light';

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none transition-colors duration-500"
      style={{
        backgroundColor: isLight ? '#f6f6f9' : '#08080c',
      }}
    >
      {/* Dynamic Japanese Sumi-e Mountains Canvas (InkRidges) - parallax disabled (0) & prominent billowing mist */}
      <InkRidges
        themeMode={theme}
        paperColor={isLight ? '#f6f6f9' : '#08080c'}
        inkColor={isLight ? '#1a1a24' : '#f0f0f5'}
        sunColor="#D4AF37"
        moon={!isLight}
        sun={sun}
        seed={seed}
        layers={layers}
        drift={Math.max(0.035, drift)}
        birds={birds}
        horizon={0.62}
        mist={0.75}
        parallax={0}
        paintIn={1800}
        clouds={0.30}
        glow={0.35}
        grain={0.15}
        scrollDepth={0.15}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Atmospheric lighting wash matching theme - soft imperial gold & valley mist accents */}
      {isLight ? (
        <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/[0.04] via-transparent to-zinc-900/[0.02] pointer-events-none" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/[0.03] via-transparent to-black/40 pointer-events-none" />
      )}

      {/* Subtle vignette edge fade for depth without obstructing readability */}
      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.18)] pointer-events-none" />
    </div>
  );
};
