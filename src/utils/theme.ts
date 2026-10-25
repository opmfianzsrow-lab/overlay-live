import type { OverlaySettings } from '../types/queue';

export interface ThemeConfig {
  name: string;
  frameRgba: string; // Base frame RGBA without alpha
  frameBg: string;
  headerBg: string;
  tileBg: string;
  tileLiveBg: string;
  wellBg: string;
  titleColor: string;
  textColor: string;
  subtextColor: string;
}

export const THEMES: Record<OverlaySettings['theme'], ThemeConfig> = {
  obsidian: {
    name: 'React Bits Dark (Default)',
    frameRgba: '38, 35, 46',
    frameBg: 'rgba(38, 35, 46, 0.78)',
    headerBg: 'rgba(30, 27, 36, 0.95)',
    tileBg: 'linear-gradient(180deg, #3a3644 0%, #27242f 100%)',
    tileLiveBg: 'linear-gradient(180deg, #482a35 0%, #2c1a23 100%)',
    wellBg: 'rgba(255, 255, 255, 0.09)',
    titleColor: 'text-[#f4f4f5]',
    textColor: 'text-[#f4f4f5]',
    subtextColor: 'text-[rgba(244,244,245,0.6)]',
  },
  cyber: {
    name: 'Cyberpunk React Bits',
    frameRgba: '20, 27, 42',
    frameBg: 'rgba(20, 27, 42, 0.82)',
    headerBg: 'rgba(15, 20, 32, 0.95)',
    tileBg: 'linear-gradient(180deg, #243452 0%, #152238 100%)',
    tileLiveBg: 'linear-gradient(180deg, #1f4254 0%, #122c3b 100%)',
    wellBg: 'rgba(34, 211, 238, 0.12)',
    titleColor: 'text-cyan-300',
    textColor: 'text-cyan-50',
    subtextColor: 'text-cyan-200/60',
  },
  crimson: {
    name: 'Crimson Duel',
    frameRgba: '44, 24, 28',
    frameBg: 'rgba(44, 24, 28, 0.82)',
    headerBg: 'rgba(32, 16, 20, 0.95)',
    tileBg: 'linear-gradient(180deg, #45242b 0%, #2d161c 100%)',
    tileLiveBg: 'linear-gradient(180deg, #58242c 0%, #3a151b 100%)',
    wellBg: 'rgba(244, 63, 94, 0.12)',
    titleColor: 'text-rose-300',
    textColor: 'text-rose-50',
    subtextColor: 'text-rose-200/60',
  },
  imperial: {
    name: 'Imperial Gold',
    frameRgba: '38, 32, 24',
    frameBg: 'rgba(38, 32, 24, 0.82)',
    headerBg: 'rgba(28, 23, 16, 0.95)',
    tileBg: 'linear-gradient(180deg, #443828 0%, #2b2317 100%)',
    tileLiveBg: 'linear-gradient(180deg, #523f22 0%, #342713 100%)',
    wellBg: 'rgba(251, 191, 36, 0.12)',
    titleColor: 'text-amber-300',
    textColor: 'text-amber-50',
    subtextColor: 'text-amber-200/60',
  },
  purple: {
    name: 'Royal Amethyst',
    frameRgba: '36, 24, 48',
    frameBg: 'rgba(36, 24, 48, 0.82)',
    headerBg: 'rgba(26, 16, 36, 0.95)',
    tileBg: 'linear-gradient(180deg, #40285a 0%, #28183c 100%)',
    tileLiveBg: 'linear-gradient(180deg, #4f2552 0%, #311535 100%)',
    wellBg: 'rgba(192, 132, 252, 0.12)',
    titleColor: 'text-purple-300',
    textColor: 'text-purple-50',
    subtextColor: 'text-purple-200/60',
  },
  minimal: {
    name: 'Charcoal Minimal',
    frameRgba: '26, 26, 30',
    frameBg: 'rgba(26, 26, 30, 0.85)',
    headerBg: 'rgba(18, 18, 22, 0.95)',
    tileBg: 'linear-gradient(180deg, #2f2f37 0%, #1f1f25 100%)',
    tileLiveBg: 'linear-gradient(180deg, #3d252a 0%, #25161a 100%)',
    wellBg: 'rgba(255, 255, 255, 0.08)',
    titleColor: 'text-zinc-100',
    textColor: 'text-zinc-100',
    subtextColor: 'text-zinc-400',
  },
};
