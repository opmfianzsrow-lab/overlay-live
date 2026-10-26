import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Sparkles, Swords } from 'lucide-react';
import type { QueueItem, OverlaySettings, PlatformPromotion } from '../types/queue';
import { THEMES } from '../utils/theme';
import { playNextMatchChime, playJoinChime } from '../utils/audio';

interface OverlayViewProps {
  token?: string;
  previewSettings?: OverlaySettings;
  previewQueue?: QueueItem[];
  isPreviewMode?: boolean;
}

export const OverlayView: React.FC<OverlayViewProps> = ({
  token,
  previewSettings,
  previewQueue,
  isPreviewMode = false,
}) => {
  const [settings, setSettings] = useState<OverlaySettings | null>(previewSettings || null);
  const [queue, setQueue] = useState<QueueItem[]>(previewQueue || []);
  const [promotion, setPromotion] = useState<PlatformPromotion | null>(null);
  const [connected, setConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const prevFirstPlayerId = useRef<string | null>(null);
  const prevQueueLength = useRef<number>(0);

  // Sync preview props
  useEffect(() => {
    if (previewSettings) setSettings(previewSettings);
    if (previewQueue) setQueue(previewQueue);
  }, [previewSettings, previewQueue]);

  // Connect to realtime SSE stream
  useEffect(() => {
    if (isPreviewMode && previewQueue) return;

    const streamToken =
      token || (typeof window !== 'undefined' ? window.location.pathname.split('/overlay/')[1] : '');
    if (!streamToken) return;

    fetch(`/api/public/overlay/${streamToken}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Overlay tidak ditemukan atau link sudah tidak aktif.');
          }
          throw new Error('Gagal memuat data overlay.');
        }
        return res.json();
      })
      .then((data) => {
        setErrorMsg(null);
        setSettings(data.settings);
        setQueue(data.queue);
        if (data.promotion) {
          setPromotion(data.promotion);
        }
        if (data.queue.length > 0) {
          prevFirstPlayerId.current = data.queue[0]?.player_id || null;
          prevQueueLength.current = data.queue.length;
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Overlay tidak ditemukan atau link sudah tidak aktif.');
        console.error('Overlay fetch error:', err);
      });

    const eventSource = new EventSource(`/api/realtime?token=${streamToken}`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.addEventListener('init', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.settings) setSettings((prev) => ({ ...prev, ...payload.settings }));
        if (payload.queue) setQueue(payload.queue);
      } catch (err) {
        console.error('Error handling init event', err);
      }
    });

    eventSource.addEventListener('queue_update', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.settings) {
          setSettings((prev) => ({ ...prev, ...payload.settings }));
        }
        if (payload.queue) {
          const newQueue: QueueItem[] = payload.queue;

          const currentFirst = newQueue[0]?.player_id;
          if (prevFirstPlayerId.current && currentFirst && currentFirst !== prevFirstPlayerId.current) {
            if (payload.settings?.sound_alert !== false) {
              playNextMatchChime();
            }
          } else if (newQueue.length > prevQueueLength.current) {
            if (payload.settings?.sound_alert !== false) {
              playJoinChime();
            }
          }

          prevFirstPlayerId.current = currentFirst || null;
          prevQueueLength.current = newQueue.length;
          setQueue(newQueue);
        }
      } catch (err) {
        console.error('SSE queue_update parse error:', err);
      }
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [token, isPreviewMode, previewQueue]);

  if (errorMsg && !isPreviewMode) {
    return (
      <div className="p-4 bg-transparent select-none">
        <div className="max-w-[420px] rounded-2xl p-4 bg-black/85 border-2 border-red-500/80 text-white shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-red-400 font-black text-xs uppercase mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>Link Overlay Tidak Valid</span>
          </div>
          <p className="text-xs text-zinc-300 font-bold">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (!settings && !previewSettings) {
    return (
      <div className="p-4 bg-transparent text-zinc-400 font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>Menghubungkan OBS Overlay...</span>
        </div>
      </div>
    );
  }

  const currentTheme = settings?.theme ? THEMES[settings.theme] || THEMES.obsidian : THEMES.obsidian;
  const maxVisible = settings?.max_visible_players || 5;
  const isHidePlaying = settings?.hide_playing_in_overlay === true; // Default false to show LIVE indicator at #1
  
  // Filter queue: if isHidePlaying is true, omit status === 'PLAYING' so only upcoming waiting players are shown!
  const filteredQueue = isHidePlaying
    ? queue.filter((item) => item.status === 'QUEUED')
    : queue.filter((item) => item.status === 'QUEUED' || item.status === 'PLAYING');

  const visibleQueue = filteredQueue.slice(0, maxVisible);
  const userOpacity = settings?.opacity ?? 96;
  const opacityVal = Math.max(0.6, Math.min(1, userOpacity / 100));
  const titleText = settings?.title || 'ANTRIAN BY1';
  const enableAnimation = settings?.enable_animation !== false;

  // Sizing styles
  const cardSizeClasses = {
    compact: 'py-2 px-3',
    normal: 'py-2.5 px-3.5',
    spacious: 'py-3.5 px-4',
  }[settings?.card_size || 'normal'];

  const fontSizeClasses = {
    small: {
      name: 'text-xs sm:text-sm',
      sub: 'text-[11px]',
      num: 'text-xs font-black',
      badge: 'text-[9px]',
      headerTitle: 'text-sm',
      swordIcon: 'w-4 h-4',
    },
    medium: {
      name: 'text-sm sm:text-base',
      sub: 'text-xs',
      num: 'text-sm sm:text-base font-black',
      badge: 'text-[10px]',
      headerTitle: 'text-base sm:text-lg',
      swordIcon: 'w-5 h-5',
    },
    large: {
      name: 'text-base sm:text-lg',
      sub: 'text-xs sm:text-sm',
      num: 'text-base sm:text-lg font-black',
      badge: 'text-[11px]',
      headerTitle: 'text-lg sm:text-xl',
      swordIcon: 'w-5.5 h-5.5',
    },
  }[settings?.font_size || 'medium'];

  const panelWidth = settings?.panel_width || 440;
  const showId = settings?.show_id !== false;
  const showVipBadge = settings?.show_vip_badge !== false;
  const showLiveBadge = settings?.show_live_badge !== false;

  return (
    <div
      className={`${
        isPreviewMode ? 'w-full flex items-center justify-center p-2' : 'p-2 sm:p-3 inline-block'
      } bg-transparent select-none overflow-visible`}
    >
      {/* 
        REACT BITS ANIMATED-LIST FRAMED CONTAINER:
        - Sleek rounded-2xl with dual inset beveled edge highlight
        - Deep gradient backdrop with blur(20px) saturate(1.6)
        - Stops immediately after last player card + padding (h-auto / dynamic height)
        - max-h-[85vh] with hidden scrollbars if queue is long
      */}
      <div
        className="rb-frame max-w-[96vw] h-auto max-h-[85vh] flex flex-col overflow-hidden transition-all duration-300"
        style={{
          width: isPreviewMode ? '100%' : `${panelWidth}px`,
          maxWidth: `${panelWidth}px`,
          height: 'auto',
          borderRadius: `${settings?.border_radius ?? 22}px`,
          backgroundColor: `rgba(${currentTheme.frameRgba}, ${opacityVal})`,
        }}
      >
        {/* React Bits Frame Inset Rim (Beveled edge highlight) */}
        <span className="rb-frame-rim" aria-hidden="true" />

        {/* HEADER: Centered at top, swords icon scales proportionally with text */}
        <div className="h-[56px] px-4 shrink-0 flex items-center justify-center border-b border-white/[0.08] bg-black/25 relative z-10">
          {/* Centered Title with proportional swords icon */}
          <div className="flex items-center justify-center gap-2 text-center max-w-[75%]">
            {!titleText.includes('⚔') && (
              <Swords
                className={`${fontSizeClasses.swordIcon} text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)] shrink-0`}
              />
            )}
            <h1
              className={`${fontSizeClasses.headerTitle} font-black tracking-widest uppercase text-[#f4f4f5] drop-shadow-sm truncate`}
            >
              {titleText}
            </h1>
          </div>

          {/* Top-right subtle connection status (only tiny dot if live) */}
          {!isPreviewMode && (
            <div className="absolute right-3.5 flex items-center">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400'
                }`}
                title={connected ? 'Online (Realtime)' : 'Menghubungkan...'}
              />
            </div>
          )}
        </div>

        {/* 
          QUEUE ITEMS LIST:
          - Automatically fits items (h-fit)
          - Scrollable with hidden scrollbar if exceeds 82vh
        */}
        <div
          className="p-3.5 flex flex-col overflow-y-auto no-scrollbar relative z-10"
          style={{ gap: `${settings?.spacing ?? 8}px` }}
        >
          {visibleQueue.length === 0 ? (
            <div className="py-6 px-4 text-center text-zinc-400 text-xs">
              Belum ada antrian berikutnya saat ini.
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {visibleQueue.map((item, index) => {
                const isPlaying = !isHidePlaying && (item.status === 'PLAYING' || index === 0);
                // When playing player is hidden from list, the next waiting player is #1, then #2, #3...
                const position = isHidePlaying ? index + 1 : item.position;

                // Color badge configuration for numbers:
                // #1 = solid white
                // #2 = yellow (#2)
                // #3 dst = purple/dark slate
                let numberBadgeClass = 'bg-white/10 text-zinc-300 border-white/[0.08]';
                if (position === 1) {
                  numberBadgeClass = 'bg-white text-zinc-950 font-black border-white shadow-sm';
                } else if (position === 2) {
                  numberBadgeClass = 'bg-amber-400 text-amber-950 font-black border-amber-300 shadow-sm';
                } else if (position === 3) {
                  numberBadgeClass = 'bg-purple-600 text-white font-extrabold border-purple-400/40 shadow-sm';
                } else {
                  numberBadgeClass = 'bg-white/10 text-zinc-300 font-bold border-white/[0.08]';
                }

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.92, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.88, x: 20 }}
                    transition={
                      enableAnimation
                        ? {
                            type: 'spring',
                            stiffness:
                              settings?.animation_speed === 'fast'
                                ? 550
                                : settings?.animation_speed === 'slow'
                                ? 250
                                : 420,
                            damping:
                              settings?.animation_speed === 'fast'
                                ? 25
                                : settings?.animation_speed === 'slow'
                                ? 35
                                : 30,
                          }
                        : { duration: 0 }
                    }
                    style={{
                      background: isPlaying ? currentTheme.tileLiveBg : currentTheme.tileBg,
                    }}
                    className={`relative rounded-[14px] flex items-center justify-between transition-all hover:brightness-[1.12] ${cardSizeClasses} ${
                      isPlaying
                        ? 'shadow-[0_4px_16px_-3px_rgba(239,68,68,0.35)]'
                        : 'shadow-[0_4px_10px_-4px_rgba(0,0,0,0.7)]'
                    }`}
                  >
                    {/* React Bits Dual-Bevel Inset Rim */}
                    <span
                      className={isPlaying ? 'rb-tile-live-rim' : 'rb-tile-rim'}
                      aria-hidden="true"
                    />

                    {/* Active Match Red Indicator on Left */}
                    {isPlaying && (
                      <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-red-500 rounded-r shadow-[0_0_8px_rgba(239,68,68,0.6)] z-10" />
                    )}

                    {/* Left: Number Box (Well) + Details */}
                    <div className="flex items-center gap-3 min-w-0 z-10">
                      {/* Number box with React Bits well container */}
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-[10px] flex items-center justify-center border shadow-inner ${fontSizeClasses.num} ${numberBadgeClass}`}
                      >
                        {position}
                      </div>

                      {/* Player info */}
                      <div className="flex flex-col min-w-0">
                        {/* Player Name */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black tracking-wide truncate ${fontSizeClasses.name} ${
                              isPlaying ? 'text-white' : 'text-[#f4f4f5]'
                            }`}
                          >
                            {item.player.name}
                          </span>
                        </div>

                        {/* ID Game + Badges row */}
                        {(showId || showVipBadge) && (
                          <div className="flex items-center gap-2 mt-0.5">
                            {showId && (
                              <span
                                className={`font-mono text-[rgba(244,244,245,0.6)] tracking-wider ${fontSizeClasses.sub}`}
                              >
                                {item.player.game_id}
                              </span>
                            )}

                            {/* VIP / VVIP badge */}
                            {showVipBadge && item.player.membership === 'VVIP' && (
                              <span
                                className={`inline-flex items-center gap-1 font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-black uppercase tracking-wider shadow-sm ${fontSizeClasses.badge}`}
                              >
                                <Crown className="w-2.5 h-2.5 fill-black stroke-black" />
                                VVIP
                              </span>
                            )}

                            {showVipBadge && item.player.membership === 'VIP' && (
                              <span
                                className={`inline-flex items-center gap-1 font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 text-white uppercase tracking-wider shadow-sm ${fontSizeClasses.badge}`}
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                VIP
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: LIVE badge if active */}
                    {isPlaying && showLiveBadge && (
                      <div className="shrink-0 pl-2 z-10">
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] tracking-wider uppercase border border-red-400/80 shadow-[0_0_10px_rgba(239,68,68,0.45)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>{settings?.live_badge_text || 'LIVE'}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {/* Indicator if more players exist beyond max_visible */}
          {filteredQueue.length > maxVisible && (
            <div className="pt-0.5 text-center">
              <span className="text-[10px] font-semibold text-zinc-300 bg-white/[0.08] px-3 py-1 rounded-full border border-white/[0.08] shadow-sm">
                +{filteredQueue.length - maxVisible} player lagi dalam antrian
              </span>
            </div>
          )}

          {/* Platform Promotion Banner (Rendered only if streamer enabled allow_promotion) */}
          {promotion && settings?.allow_promotion && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 pt-2 border-t border-white/10"
            >
              <div className="p-2 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center justify-between gap-2 text-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ffd60a] text-black uppercase tracking-wider">
                      PROMO
                    </span>
                    <span className="text-[11px] font-bold truncate">{promotion.title}</span>
                  </div>
                  <p className="text-[10px] text-zinc-300 truncate mt-0.5">{promotion.description}</p>
                </div>
                <span className="text-[9px] font-mono text-zinc-400 shrink-0">
                  1v1 Platform
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
