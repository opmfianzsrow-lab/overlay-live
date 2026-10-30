import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Sparkles, Swords, Layers, AlertCircle } from 'lucide-react';
import type { QueueItem, OverlaySettings, PlatformPromotion, OverlayCustomColors } from '../types/queue';
import { DEFAULT_OVERLAY_COLORS } from '../types/queue';
import { THEMES } from '../utils/theme';
import { playNextMatchChime, playJoinChime } from '../utils/audio';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface OverlayViewProps {
  token?: string;
  previewSettings?: OverlaySettings;
  previewQueue?: QueueItem[];
  isPreviewMode?: boolean;
}

function hexToRgba(color: string, opacity: number): string {
  if (!color) return `rgba(12, 12, 14, ${opacity})`;
  if (opacity <= 0) return 'transparent';
  if (color.startsWith('rgba') || color.startsWith('rgb')) return color;
  let clean = color.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return color;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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

  // Sync preview props when in preview mode
  useEffect(() => {
    if (previewSettings) setSettings(previewSettings);
    if (previewQueue) setQueue(previewQueue);
  }, [previewSettings, previewQueue]);

  // Ensure OBS Browser Source transparency and disable all page scrollbars
  useEffect(() => {
    if (!isPreviewMode && typeof document !== 'undefined') {
      document.body.classList.add('obs-overlay-mode');
      document.documentElement.style.backgroundColor = 'transparent';
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.classList.remove('obs-overlay-mode');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      };
    }
  }, [isPreviewMode]);

  // Direct Supabase Fallback Query (for static Vercel deployments)
  const fetchFromSupabase = useCallback(async (targetToken: string) => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase belum terkonfigurasi. Tidak dapat mengambil data antrian.');
    }

    // 1. Verify token & get user_id
    const { data: tokData, error: tokErr } = await supabase
      .from('overlay_tokens')
      .select('user_id, token, revoked_at')
      .eq('token', targetToken)
      .maybeSingle();

    if (tokErr || !tokData || tokData.revoked_at) {
      throw new Error('Overlay tidak ditemukan atau link sudah dicabut/kadaluarsa.');
    }

    const targetUserId = tokData.user_id;

    // 2. Fetch overlay settings for this streamer
    const { data: setData } = await supabase
      .from('overlay_settings')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    // 3. Fetch streamer profile name
    const { data: profData } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', targetUserId)
      .maybeSingle();

    // 4. Fetch waiting players only (QUEUED / WAITING)
    const { data: qPlayers } = await supabase
      .from('queue_players')
      .select('*')
      .eq('user_id', targetUserId)
      .in('status', ['QUEUED', 'WAITING'])
      .order('position', { ascending: true });

    const mappedQueue: QueueItem[] = (qPlayers || []).map((qp: any) => ({
      id: qp.id,
      player_id: qp.id,
      position: qp.position,
      status: qp.status,
      joined_at: qp.joined_at,
      player: {
        id: qp.id,
        name: qp.name,
        game_id: qp.game_id || '-',
        membership: qp.membership || 'REGULAR',
        status: qp.status,
        created_at: qp.joined_at,
        updated_at: qp.updated_at || qp.joined_at,
      },
    }));

    return {
      settings: {
        ...(setData || {}),
        streamer_name: profData?.name,
        user_id: targetUserId,
      },
      queue: mappedQueue,
      targetUserId,
    };
  }, []);

  // Connect to realtime SSE stream with Supabase fallback
  useEffect(() => {
    if (isPreviewMode && previewQueue) return;

    // Clean token string from URL or props
    const rawPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const pathToken = rawPath.startsWith('/overlay')
      ? rawPath.replace(/^\/overlay\/?/, '').split('?')[0].split('/')[0].trim()
      : '';
    const streamToken = (token || pathToken || '').trim();

    if (!streamToken) {
      setErrorMsg('Token overlay tidak disertakan pada URL. Format: /overlay/TOKEN_USER');
      return;
    }

    let activeEventSource: EventSource | null = null;
    let supaChannel: any = null;
    let isMounted = true;

    async function loadData() {
      // Step A: Try fetching from backend API
      try {
        const res = await fetch(`/api/public/overlay/${streamToken}`);
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          setErrorMsg(null);
          setSettings(data.settings);
          setQueue(data.queue || []);
          if (data.promotion) setPromotion(data.promotion);
          if (data.queue && data.queue.length > 0) {
            prevFirstPlayerId.current = data.queue[0]?.player_id || null;
            prevQueueLength.current = data.queue.length;
          }

          // Setup SSE Realtime
          activeEventSource = new EventSource(`/api/realtime?token=${streamToken}`);
          activeEventSource.onopen = () => {
            if (isMounted) setConnected(true);
          };

          activeEventSource.addEventListener('init', (e) => {
            try {
              const payload = JSON.parse(e.data);
              if (payload.settings && isMounted) setSettings((prev) => ({ ...prev, ...payload.settings }));
              if (payload.queue && isMounted) setQueue(payload.queue);
            } catch (err) {
              console.error('Error handling init event', err);
            }
          });

          activeEventSource.addEventListener('queue_update', (e) => {
            try {
              const payload = JSON.parse(e.data);
              if (payload.settings && isMounted) {
                setSettings((prev) => ({ ...prev, ...payload.settings }));
              }
              if (payload.queue && isMounted) {
                const newQueue: QueueItem[] = payload.queue;
                const currentFirst = newQueue[0]?.player_id;
                if (prevFirstPlayerId.current && currentFirst && currentFirst !== prevFirstPlayerId.current) {
                  if (payload.settings?.sound_alert !== false) playNextMatchChime();
                } else if (newQueue.length > prevQueueLength.current) {
                  if (payload.settings?.sound_alert !== false) playJoinChime();
                }
                prevFirstPlayerId.current = currentFirst || null;
                prevQueueLength.current = newQueue.length;
                setQueue(newQueue);
              }
            } catch (err) {
              console.error('SSE queue_update parse error:', err);
            }
          });

          activeEventSource.onerror = () => {
            if (isMounted) setConnected(false);
          };
          return;
        }

        // If 404 from backend API, token is invalid
        if (res.status === 404) {
          throw new Error('Overlay tidak ditemukan atau link sudah dicabut/kadaluarsa.');
        }
      } catch (apiErr: any) {
        // Step B: Backend API unavailable or failed -> Fallback to direct Supabase query
        if (apiErr.message?.includes('tidak ditemukan')) {
          if (isMounted) setErrorMsg(apiErr.message);
          return;
        }

        try {
          const fallbackData = await fetchFromSupabase(streamToken);
          if (!isMounted) return;
          setErrorMsg(null);
          setSettings(fallbackData.settings as OverlaySettings);
          setQueue(fallbackData.queue);
          setConnected(true);

          // Setup Supabase Realtime channel for Vercel static deployments
          if (supabase && fallbackData.targetUserId) {
            supaChannel = supabase.channel(`obs-overlay-${streamToken}`)
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'queue_players',
                  filter: `user_id=eq.${fallbackData.targetUserId}`,
                },
                async () => {
                  try {
                    const fresh = await fetchFromSupabase(streamToken);
                    if (isMounted) setQueue(fresh.queue);
                  } catch {}
                }
              )
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'overlay_settings',
                  filter: `user_id=eq.${fallbackData.targetUserId}`,
                },
                (payload: any) => {
                  if (payload.new && isMounted) {
                    setSettings((prev) => ({ ...prev, ...(payload.new as OverlaySettings) }));
                  }
                }
              )
              .subscribe();
          }
        } catch (supaErr: any) {
          if (isMounted) {
            setErrorMsg(supaErr.message || 'Overlay tidak ditemukan atau link sudah dicabut/kadaluarsa.');
          }
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
      if (activeEventSource) activeEventSource.close();
      if (supaChannel && supabase) supabase.removeChannel(supaChannel);
    };
  }, [token, isPreviewMode, previewQueue, fetchFromSupabase]);

  if (errorMsg && !isPreviewMode) {
    return (
      <div className="p-6 bg-transparent select-none font-sans min-h-screen flex items-start justify-start">
        <div className="max-w-[420px] w-full rounded-2xl p-5 bg-black/90 border border-red-500/60 text-white shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-red-400 font-bold text-xs uppercase mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>Overlay Tidak Tersedia</span>
          </div>
          <p className="text-xs text-zinc-300 font-normal leading-relaxed">{errorMsg}</p>
          <div className="mt-3 pt-3 border-t border-white/[0.08] text-[11px] text-zinc-500">
            Pastikan URL Browser Source di OBS Studio sama persis dengan link yang ada pada dashboard streamer.
          </div>
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

  // 1. Resolve Custom Colors with fallbacks
  const customColors: Required<OverlayCustomColors> = {
    ...DEFAULT_OVERLAY_COLORS,
    ...(settings?.custom_colors || {}),
  };

  const maxVisible = settings?.max_visible_players || 5;
  const userOpacity = settings?.opacity ?? 96;
  const opacityVal = Math.max(0, Math.min(1, userOpacity / 100));
  const enableAnimation = settings?.enable_animation !== false;
  const panelWidth = settings?.panel_width || 440;
  const showId = settings?.show_id !== false;
  const showVipBadge = settings?.show_vip_badge !== false;

  // Title: Prioritize user title or "ANTRIAN SELANJUTNYA"
  const titleText = settings?.title && settings.title.trim().length > 0 && settings.title !== 'ANTRIAN BY1'
    ? settings.title
    : 'ANTRIAN SELANJUTNYA';

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

  // =========================================================================
  // REQUIREMENT 1 & 3: SISTEM TAMPILAN DAFTAR ANTRIAN KHUSUS OVERLAY OBS
  // - Overlay hanya menampilkan pemain dengan status MENUNGGU atau WAITING.
  // - Pemain dengan status SEDANG BERMAIN / PLAYING jangan ditampilkan di daftar overlay.
  // - Akun pemilik/streamer juga jangan ditampilkan sebagai pemain antrian.
  // - Pastikan pemain yang sudah selesai bermain (DONE) atau dibatalkan (CANCELLED/SKIPPED) tidak muncul.
  // - Urutkan pemain berdasarkan posisi antrian.
  // - Nomor urut harus otomatis menyesuaikan (1, 2, 3...) ketika pemain ditambah, dihapus, atau statusnya berubah.
  // - Jika belum ada pemain yang menunggu, tampilkan teks "Belum ada antrian".
  // =========================================================================
  const streamerName = (settings?.streamer_name || '').trim().toLowerCase();
  const streamerUserId = settings?.user_id;

  const waitingQueue = queue.filter((item) => {
    const raw = (item.status as string) || '';
    const st = raw.toUpperCase();

    // 1. Pemain dengan status SEDANG BERMAIN / PLAYING jangan ditampilkan
    if (st === 'PLAYING') return false;

    // 2. Pastikan pemain selesai atau dibatalkan tidak muncul
    if (st === 'DONE' || st === 'SKIPPED' || st === 'CANCELLED') return false;

    // 3. Hanya pemain dengan status MENUNGGU atau WAITING (di sistem db berstatus QUEUED)
    const isWaiting = st === 'QUEUED' || st === 'WAITING' || st === 'MENUNGGU';
    if (!isWaiting) return false;

    // 4. Akun pemilik/streamer jangan ditampilkan sebagai pemain antrian
    const playerName = (item.player?.name || '').trim().toLowerCase();
    const playerGameId = (item.player?.game_id || '').trim().toLowerCase();
    const playerId = item.player?.id;

    if (streamerName && (playerName === streamerName || playerGameId === streamerName)) {
      return false;
    }
    if (streamerUserId && (playerId === streamerUserId || item.player_id === streamerUserId)) {
      return false;
    }

    return true;
  });

  // Urutkan pemain berdasarkan posisi antrian
  const sortedWaitingQueue = [...waitingQueue].sort((a, b) => (a.position || 0) - (b.position || 0));
  const visibleQueue = sortedWaitingQueue.slice(0, maxVisible);

  return (
    <div
      className={`${
        isPreviewMode ? 'w-full flex items-center justify-center p-2' : 'p-2 sm:p-3 inline-block overflow-hidden'
      } bg-transparent select-none`}
    >
      {/* 
        OVERLAY OBS FRAMED CONTAINER WITH CUSTOM COLORS:
        - Dynamic background color & opacity
        - Dynamic border color
        - Stops immediately after last player card (auto height)
      */}
      <div
        className="rb-frame max-w-[96vw] h-auto max-h-[85vh] flex flex-col overflow-hidden transition-all duration-300"
        style={{
          width: isPreviewMode ? '100%' : `${panelWidth}px`,
          maxWidth: `${panelWidth}px`,
          height: 'auto',
          borderRadius: `${settings?.border_radius ?? 22}px`,
          backgroundColor: hexToRgba(customColors.bg_primary, opacityVal),
          borderColor: customColors.card_border,
          borderWidth: '1px',
          borderStyle: 'solid',
        }}
      >
        {/* Frame Highlight Rim */}
        <span
          className="rb-frame-rim"
          aria-hidden="true"
          style={{ borderColor: `${customColors.card_border}66` }}
        />

        {/* HEADER: Centered at top with Custom Header BG & Accent Color */}
        <div
          className="h-[56px] px-4 shrink-0 flex items-center justify-between border-b relative z-10 transition-colors"
          style={{
            backgroundColor: customColors.header_bg,
            borderBottomColor: customColors.card_border,
          }}
        >
          {/* Centered Title with Swords Icon */}
          <div className="flex-1 flex items-center justify-center gap-2 text-center max-w-[85%] mx-auto">
            {!titleText.includes('⚔') && (
              <Swords
                className={`${fontSizeClasses.swordIcon} shrink-0 drop-shadow-sm`}
                style={{ color: customColors.accent_color }}
              />
            )}
            <h1
              className={`${fontSizeClasses.headerTitle} font-black tracking-widest uppercase drop-shadow-sm truncate`}
              style={{ color: customColors.text_primary }}
            >
              {titleText}
            </h1>
          </div>

          {/* Connection / Status dot */}
          {!isPreviewMode && (
            <div className="flex items-center ml-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: connected ? '#10b981' : customColors.live_indicator_color,
                  boxShadow: connected ? '0 0 6px #10b981' : `0 0 6px ${customColors.live_indicator_color}`,
                }}
                title={connected ? 'Online (Realtime)' : 'Menghubungkan...'}
              />
            </div>
          )}
        </div>

        {/* Sub-Header Section Badge: ANTRIAN SELANJUTNYA */}
        <div
          className="px-4 py-1.5 flex items-center justify-between text-[11px] font-bold tracking-wider uppercase border-b transition-colors"
          style={{
            backgroundColor: hexToRgba(customColors.header_bg, 0.7),
            borderBottomColor: `${customColors.card_border}88`,
            color: customColors.text_secondary,
          }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: customColors.accent_color }}
            />
            ANTRIAN SELANJUTNYA
          </span>
          <span
            className="font-mono text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{
              backgroundColor: `${customColors.accent_color}22`,
              color: customColors.accent_color,
              border: `1px solid ${customColors.accent_color}44`,
            }}
          >
            {sortedWaitingQueue.length} Menunggu
          </span>
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
            <div
              className="py-10 px-4 text-center font-bold text-xs tracking-wider uppercase transition-colors"
              style={{ color: customColors.text_secondary }}
            >
              Belum ada antrian
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {visibleQueue.map((item, index) => {
                // Auto-adjusting sequential position number (1, 2, 3...)
                const position = index + 1;

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
                      backgroundColor: customColors.card_bg,
                      borderColor: customColors.card_border,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                    className={`relative rounded-[14px] flex items-center justify-between transition-all hover:brightness-[1.12] ${cardSizeClasses} shadow-[0_4px_12px_-4px_rgba(0,0,0,0.5)]`}
                  >
                    {/* Left Accent Indicator Stripe */}
                    <div
                      className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-1 h-5 rounded-r"
                      style={{ backgroundColor: customColors.accent_color }}
                    />

                    {/* Left: Number Box + Player Details */}
                    <div className="flex items-center gap-3 min-w-0 z-10">
                      {/* Number box styled with custom queue_number_color */}
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-[10px] flex items-center justify-center border font-black shadow-inner ${fontSizeClasses.num} transition-colors`}
                        style={{
                          backgroundColor: `${customColors.queue_number_color}18`,
                          color: customColors.queue_number_color,
                          borderColor: `${customColors.queue_number_color}44`,
                        }}
                      >
                        {position}
                      </div>

                      {/* Player info */}
                      <div className="flex flex-col min-w-0">
                        {/* Player Name with custom text_primary */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black tracking-wide truncate ${fontSizeClasses.name}`}
                            style={{ color: customColors.text_primary }}
                          >
                            {item.player.name}
                          </span>
                        </div>

                        {/* ID Game + Badges row with custom text_secondary */}
                        {(showId || showVipBadge) && (
                          <div className="flex items-center gap-2 mt-0.5">
                            {showId && (
                              <span
                                className={`font-mono tracking-wider ${fontSizeClasses.sub}`}
                                style={{ color: customColors.text_secondary }}
                              >
                                {item.player.game_id}
                              </span>
                            )}

                            {/* VVIP badge with custom vvip_badge_color */}
                            {showVipBadge && item.player.membership === 'VVIP' && (
                              <span
                                className={`inline-flex items-center gap-1 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm ${fontSizeClasses.badge}`}
                                style={{
                                  backgroundColor: `${customColors.vvip_badge_color}26`,
                                  color: customColors.vvip_badge_color,
                                  border: `1px solid ${customColors.vvip_badge_color}55`,
                                }}
                              >
                                <Crown className="w-2.5 h-2.5 fill-current" />
                                VVIP
                              </span>
                            )}

                            {/* VIP badge with custom vip_badge_color */}
                            {showVipBadge && item.player.membership === 'VIP' && (
                              <span
                                className={`inline-flex items-center gap-1 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm ${fontSizeClasses.badge}`}
                                style={{
                                  backgroundColor: `${customColors.vip_badge_color}26`,
                                  color: customColors.vip_badge_color,
                                  border: `1px solid ${customColors.vip_badge_color}55`,
                                }}
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                VIP
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Subtle Donation indicator or Tag */}
                    {item.donation && (
                      <div className="shrink-0 pl-2 z-10">
                        <span
                          className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${customColors.accent_color}1a`,
                            color: customColors.accent_color,
                            border: `1px solid ${customColors.accent_color}33`,
                          }}
                        >
                          DONASI
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {/* Indicator if more players exist beyond max_visible */}
          {sortedWaitingQueue.length > maxVisible && (
            <div className="pt-0.5 text-center">
              <span
                className="text-[10px] font-semibold px-3 py-1 rounded-full border shadow-sm"
                style={{
                  backgroundColor: `${customColors.card_bg}cc`,
                  color: customColors.text_secondary,
                  borderColor: customColors.card_border,
                }}
              >
                +{sortedWaitingQueue.length - maxVisible} player lagi dalam antrian
              </span>
            </div>
          )}

          {/* Platform Promotion Banner (Rendered only if streamer enabled allow_promotion) */}
          {promotion && settings?.allow_promotion && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 pt-2 border-t"
              style={{ borderTopColor: customColors.card_border }}
            >
              <div
                className="p-2 rounded-xl backdrop-blur-md flex items-center justify-between gap-2"
                style={{
                  backgroundColor: hexToRgba(customColors.card_bg, 0.8),
                  border: `1px solid ${customColors.card_border}`,
                  color: customColors.text_primary,
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                      style={{
                        backgroundColor: customColors.accent_color,
                        color: '#000000',
                      }}
                    >
                      PROMO
                    </span>
                    <span
                      className="text-[11px] font-bold truncate"
                      style={{ color: customColors.text_primary }}
                    >
                      {promotion.title}
                    </span>
                  </div>
                  <p
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: customColors.text_secondary }}
                  >
                    {promotion.description}
                  </p>
                </div>
                <span
                  className="text-[9px] font-mono shrink-0"
                  style={{ color: customColors.text_secondary }}
                >
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

