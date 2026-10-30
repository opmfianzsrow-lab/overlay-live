import React, { useState } from 'react';
import {
  Palette,
  RotateCcw,
  Save,
  CheckCircle2,
  Sparkles,
  Sliders,
  Check,
  Eye,
} from 'lucide-react';
import type { OverlayCustomColors, ColorPreset } from '../types/queue';
import { DEFAULT_OVERLAY_COLORS, OVERLAY_COLOR_PRESETS } from '../types/queue';

interface OverlayColorCustomizerProps {
  colors: OverlayCustomColors;
  onChange: (colors: OverlayCustomColors) => void;
  onReset: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  saveSuccess?: string;
  isLight?: boolean;
}

interface ColorFieldMeta {
  key: keyof OverlayCustomColors;
  label: string;
  description: string;
  category: 'background' | 'text' | 'accent' | 'badge';
}

const COLOR_FIELDS: ColorFieldMeta[] = [
  {
    key: 'bg_primary',
    label: 'Background Utama Overlay',
    description: 'Warna latar belakang keseluruhan panel overlay',
    category: 'background',
  },
  {
    key: 'header_bg',
    label: 'Background Header',
    description: 'Warna bilah judul atas dan sub-header',
    category: 'background',
  },
  {
    key: 'card_bg',
    label: 'Background Kartu Pemain',
    description: 'Latar belakang kotak setiap pemain antrian',
    category: 'background',
  },
  {
    key: 'card_border',
    label: 'Warna Border Kartu',
    description: 'Garis tepi bingkai panel dan kartu pemain',
    category: 'background',
  },
  {
    key: 'text_primary',
    label: 'Warna Teks Utama',
    description: 'Warna nama pemain dan judul utama',
    category: 'text',
  },
  {
    key: 'text_secondary',
    label: 'Warna Teks Sekunder',
    description: 'Warna ID Game pemain dan label status',
    category: 'text',
  },
  {
    key: 'accent_color',
    label: 'Warna Aksen / Highlight',
    description: 'Warna ikon pedang duel, garis tepi aktif & tag donasi',
    category: 'accent',
  },
  {
    key: 'queue_number_color',
    label: 'Warna Nomor Antrian',
    description: 'Warna angka urutan posisi (1, 2, 3...) pemain',
    category: 'accent',
  },
  {
    key: 'vip_badge_color',
    label: 'Warna Badge VIP',
    description: 'Warna lencana pemain status VIP',
    category: 'badge',
  },
  {
    key: 'vvip_badge_color',
    label: 'Warna Badge VVIP',
    description: 'Warna lencana pemain status VVIP (prioritas tinggi)',
    category: 'badge',
  },
  {
    key: 'live_indicator_color',
    label: 'Warna Indikator LIVE',
    description: 'Warna titik status koneksi & penanda live stream',
    category: 'badge',
  },
];

export const OverlayColorCustomizer: React.FC<OverlayColorCustomizerProps> = ({
  colors,
  onChange,
  onReset,
  onSave,
  isSaving,
  saveSuccess,
  isLight = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const mergedColors: Required<OverlayCustomColors> = {
    ...DEFAULT_OVERLAY_COLORS,
    ...colors,
  };

  const handleColorChange = (key: keyof OverlayCustomColors, value: string) => {
    setActivePreset(null);
    onChange({
      ...mergedColors,
      [key]: value,
    });
  };

  const handleApplyPreset = (preset: ColorPreset) => {
    setActivePreset(preset.id);
    onChange({ ...preset.colors });
  };

  const filteredFields =
    activeCategory === 'all'
      ? COLOR_FIELDS
      : COLOR_FIELDS.filter((f) => f.category === activeCategory);

  return (
    <div className="apple-card p-6 sm:p-7 rounded-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isLight
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white/[0.08] border-white/[0.12] text-[#2997ff]'
            }`}
          >
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3
              className={`text-lg sm:text-xl font-semibold tracking-tight ${
                isLight ? 'text-zinc-900' : 'text-white'
              }`}
            >
              Customisasi Warna Overlay
            </h3>
            <p
              className={`text-xs mt-0.5 font-normal ${
                isLight ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            >
              Atur warna manual dengan Color Picker & kode HEX, atau pilih preset instan. Perubahan langsung terlihat di preview.
            </p>
          </div>
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="apple-button-secondary py-2 px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            title="Kembalikan semua warna ke default Obsidian"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Warna</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="apple-button-primary py-2 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Warna'}</span>
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 bg-[#30d158]/15 border border-[#30d158]/25 text-[#30d158]">
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Preset Section */}
      <div className="space-y-2.5 pt-1 border-t border-white/[0.08]">
        <div className="flex items-center justify-between">
          <label
            className={`text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5 ${
              isLight ? 'text-zinc-700' : 'text-zinc-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#ffd60a]" />
            <span>Preset Warna Pilihan</span>
          </label>
          <span className={`text-[11px] ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Klik preset untuk langsung menerapkan
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {OVERLAY_COLOR_PRESETS.map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`py-1.5 px-3 rounded-full text-xs font-medium transition-all flex items-center gap-2 cursor-pointer border ${
                  isSelected
                    ? isLight
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                      : 'bg-white text-zinc-950 border-white shadow-md font-bold'
                    : isLight
                    ? 'bg-black/[0.04] text-zinc-700 border-black/[0.08] hover:bg-black/[0.08]'
                    : 'bg-white/[0.06] text-zinc-300 border-white/[0.1] hover:bg-white/[0.12]'
                }`}
              >
                {/* 3 mini color dots representing preset */}
                <span className="flex items-center -space-x-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20"
                    style={{ backgroundColor: preset.colors.bg_primary }}
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20"
                    style={{ backgroundColor: preset.colors.accent_color }}
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20"
                    style={{ backgroundColor: preset.colors.queue_number_color }}
                  />
                </span>
                <span>{preset.name}</span>
                {isSelected && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.08]">
        {[
          { id: 'all', label: 'Semua 11 Warna' },
          { id: 'background', label: 'Background & Border' },
          { id: 'text', label: 'Teks & Huruf' },
          { id: 'accent', label: 'Aksen & Nomor' },
          { id: 'badge', label: 'Badge & Indikator' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              activeCategory === cat.id
                ? isLight
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-[#2997ff] text-white font-semibold shadow-[0_0_10px_rgba(41,151,255,0.4)]'
                : isLight
                ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 11 Color Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
        {filteredFields.map((field) => {
          const currentColor = mergedColors[field.key] || '#000000';
          // Ensure color input accepts standard 6-digit hex
          const hexInputVal = currentColor.startsWith('#')
            ? currentColor.slice(0, 7)
            : currentColor;

          return (
            <div
              key={field.key}
              className={`p-3.5 rounded-2xl border transition-all ${
                isLight
                  ? 'bg-white/80 border-black/[0.08] hover:border-black/[0.16]'
                  : 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.18]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <label
                    htmlFor={`color-${field.key}`}
                    className={`block text-xs font-semibold leading-tight cursor-pointer ${
                      isLight ? 'text-zinc-900' : 'text-white'
                    }`}
                  >
                    {field.label}
                  </label>
                  <p
                    className={`text-[10px] mt-0.5 line-clamp-1 ${
                      isLight ? 'text-zinc-500' : 'text-zinc-400'
                    }`}
                    title={field.description}
                  >
                    {field.description}
                  </p>
                </div>
              </div>

              {/* Color Picker & Hex Input Pair */}
              <div className="flex items-center gap-2 mt-2">
                {/* HTML5 Native Color Picker Swatch */}
                <div className="relative shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-white/20 shadow-inner cursor-pointer group">
                  <input
                    type="color"
                    id={`color-${field.key}`}
                    value={hexInputVal}
                    onChange={(e) => handleColorChange(field.key, e.target.value)}
                    className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer opacity-0"
                    title={`Pilih warna untuk ${field.label}`}
                  />
                  <div
                    className="w-full h-full rounded-xl transition-transform group-hover:scale-105"
                    style={{ backgroundColor: currentColor }}
                  />
                </div>

                {/* Manual Hex Input */}
                <div className="relative flex-1">
                  <span
                    className={`absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs select-none ${
                      isLight ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    #
                  </span>
                  <input
                    type="text"
                    value={currentColor.replace('#', '')}
                    onChange={(e) => {
                      const clean = e.target.value.trim().replace(/[^0-9a-fA-F]/g, '');
                      if (clean.length <= 8) {
                        handleColorChange(field.key, '#' + clean);
                      }
                    }}
                    placeholder="RRGGBB"
                    maxLength={8}
                    className={`w-full py-1.5 pl-6 pr-2.5 rounded-xl font-mono text-xs uppercase tracking-wider outline-none transition-all ${
                      isLight
                        ? 'bg-zinc-100 border border-zinc-200 text-zinc-900 focus:border-zinc-400'
                        : 'bg-white/[0.06] border border-white/[0.1] text-white focus:border-[#2997ff]'
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Info & Unified Save Button */}
      <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div
          className={`flex items-center gap-1.5 ${
            isLight ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#30d158]" />
          <span>Realtime Sync: Browser Source OBS langsung ter-update otomatis tanpa refresh link.</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="apple-button-secondary py-2.5 px-4 rounded-full text-xs font-medium cursor-pointer"
          >
            Reset Warna
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="apple-button-primary py-2.5 px-6 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Kustomisasi Warna'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
