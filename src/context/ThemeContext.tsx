import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface BackgroundSettings {
  theme: ThemeMode;
  seed: number;
  layers: number;
  drift: number;
  sun: boolean;
  birds: number;
}

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  seed: number;
  setSeed: (seed: number) => void;
  paintAnotherRange: () => void;
  layers: number;
  setLayers: (layers: number) => void;
  drift: number;
  setDrift: (drift: number) => void;
  sun: boolean;
  setSun: (sun: boolean) => void;
  birds: number;
  setBirds: (birds: number) => void;
  showCustomizer: boolean;
  setShowCustomizer: (show: boolean) => void;
}

const defaultSettings: BackgroundSettings = {
  theme: 'dark',
  seed: 18,
  layers: 4,
  drift: 0.035,
  sun: true,
  birds: 3,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('streamer_bg_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    return defaultSettings.theme;
  });

  const [seed, setSeedState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('streamer_bg_seed');
      if (saved && !isNaN(Number(saved))) return Number(saved);
    }
    return defaultSettings.seed;
  });

  const [layers, setLayersState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('streamer_bg_layers');
      if (saved && !isNaN(Number(saved))) return Math.min(5, Math.max(2, Number(saved)));
    }
    return defaultSettings.layers;
  });

  const [drift, setDriftState] = useState<number>(defaultSettings.drift);
  const [sun, setSunState] = useState<boolean>(defaultSettings.sun);
  const [birds, setBirdsState] = useState<number>(defaultSettings.birds);
  const [showCustomizer, setShowCustomizer] = useState<boolean>(false);

  // Sync theme to document body and html for seamless styling
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'light') {
        root.classList.add('light', 'theme-light');
        root.classList.remove('dark', 'theme-dark');
        document.body.style.backgroundColor = '#f5f5f8';
        document.body.style.color = '#18181b';
      } else {
        root.classList.add('dark', 'theme-dark');
        root.classList.remove('light', 'theme-light');
        document.body.style.backgroundColor = '#07070a';
        document.body.style.color = '#f4f4f5';
      }
      localStorage.setItem('streamer_bg_theme', theme);
    }
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setSeed = (newSeed: number) => {
    setSeedState(newSeed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('streamer_bg_seed', String(newSeed));
    }
  };

  const paintAnotherRange = () => {
    const nextSeed = Math.floor(Math.random() * 9999) + 1;
    setSeed(nextSeed);
  };

  const setLayers = (n: number) => {
    const val = Math.min(5, Math.max(2, n));
    setLayersState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('streamer_bg_layers', String(val));
    }
  };

  const setDrift = (d: number) => {
    setDriftState(d);
  };

  const setSun = (s: boolean) => {
    setSunState(s);
  };

  const setBirds = (b: number) => {
    setBirdsState(b);
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
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
    }),
    [theme, seed, layers, drift, sun, birds, showCustomizer]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
