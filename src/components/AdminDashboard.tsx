import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Coins,
  Tv,
  Settings as SettingsIcon,
  Copy,
  Check,
  ExternalLink,
  Play,
  CheckCircle2,
  SkipForward,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  UserPlus,
  RefreshCw,
  Zap,
  Volume2,
  Lock,
  Swords,
  Crown,
  Sparkles,
  Radio,
  Clock,
  Palette,
  Moon,
  Sun,
  AlertCircle,
  Eye,
  EyeOff,
  Code,
  ShieldCheck,
} from 'lucide-react';
import type {
  QueueItem,
  Donation,
  OverlaySettings,
  ActivityLog,
  QueueStats,
  Player,
  MembershipType,
  UserProfile,
  WebhookEvent,
  PlatformAnalytics,
  PlatformPromotion,
  OverlayCustomColors,
} from '../types/queue';
import { DEFAULT_OVERLAY_COLORS } from '../types/queue';
import { EditPlayerModal } from './modals/EditPlayerModal';
import { AddPlayerModal } from './modals/AddPlayerModal';
import { SociabuzzSimulatorModal } from './modals/SociabuzzSimulatorModal';
import { OverlayView } from './OverlayView';
import { OverlayColorCustomizer } from './OverlayColorCustomizer';
import { useTheme } from '../context/ThemeContext';
import { ThemeHeaderControls } from './ThemeHeaderControls';
import { supabase, isSupabaseConfigured, getOverlaySettingsFromSupabase, regenerateOverlayTokenInSupabase } from '../lib/supabase';

interface AdminDashboardProps {
  user?: UserProfile;
  sessionToken?: string;
  adminPin?: string;
  onLogout: () => void;
}

type TabType = 'dashboard' | 'queue' | 'donations' | 'overlay' | 'sociabuzz' | 'settings' | 'admin';
type UiThemeType = 'neobrutalism' | 'dark';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  sessionToken,
  adminPin = 'streamer123',
  onLogout,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [settings, setSettings] = useState<OverlaySettings | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [selectedWebhookLog, setSelectedWebhookLog] = useState<WebhookEvent | null>(null);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedWebhookSecret, setCopiedWebhookSecret] = useState(false);
  const [loading, setLoading] = useState(true);

  // UI Theme state (Apple Minimal Obsidian vs Neobrutalism)
  const [uiTheme, setUiTheme] = useState<UiThemeType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_ui_theme');
      if (saved === 'dark' || saved === 'neobrutalism') return saved;
    }
    return 'dark';
  });

  // Copy feedback state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDonation, setCopiedDonation] = useState(false);
  const [copiedJoin, setCopiedJoin] = useState(false);

  // Modals state
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<Partial<OverlaySettings>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // PIN change state
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // Platform Admin state
  const [platformAnalytics, setPlatformAnalytics] = useState<PlatformAnalytics | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<Array<{ id: string; email: string; name: string; role: string; created_at: string }>>([]);
  const [promotionForm, setPromotionForm] = useState<PlatformPromotion>({
    id: 'promo_global',
    enabled: false,
    title: '🔥 PRODUK TERBARU',
    description: 'Cek produk dan promo eksklusif sekarang!',
    image_url: '',
    link_url: 'https://antrian1v1.com',
    position: 'overlay_bottom',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const [savingPromotion, setSavingPromotion] = useState(false);

  // Toast notification state (replaces window.alert and window.confirm for iframe compatibility)
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setToast({ message, type });
      setTimeout(() => {
        setToast((prev) => (prev?.message === message ? null : prev));
      }, 3500);
    },
    []
  );

  // Helper API caller
  const callAdminApi = useCallback(
    async (url: string, body?: unknown) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      if (adminPin) headers['x-admin-pin'] = adminPin;

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Operasi gagal.');
      }
      return res.json();
    },
    [sessionToken, adminPin]
  );

  // Toggle UI Theme
  const handleToggleUiTheme = (targetTheme?: UiThemeType) => {
    const nextTheme: UiThemeType = targetTheme || (uiTheme === 'neobrutalism' ? 'dark' : 'neobrutalism');
    setUiTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_ui_theme', nextTheme);
    }
    // Also sync to server settings
    callAdminApi('/api/admin/settings', { dashboard_ui_theme: nextTheme }).catch(() => null);
  };

  // Token error state
  const [tokenError, setTokenError] = useState<string | null>(null);
  const isFetchingRef = React.useRef(false);

  // Fetch full dashboard
  const fetchDashboard = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    let dashboardSettings: OverlaySettings | null = null;
    let dashboardQueue: QueueItem[] = [];
    let dashboardDonations: Donation[] = [];
    let dashboardStats: QueueStats | null = null;
    let dashboardLogs: ActivityLog[] = [];
    let dashboardWebhooks: WebhookEvent[] = [];

    try {
      const headers: Record<string, string> = {};
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      if (adminPin) headers['x-admin-pin'] = adminPin;

      const res = await fetch('/api/admin/dashboard', { headers });
      if (res.ok) {
        const data = await res.json();
        dashboardSettings = data.settings;
        dashboardQueue = data.queue || [];
        dashboardDonations = data.donations || [];
        dashboardStats = data.stats || null;
        dashboardLogs = data.logs || [];
        dashboardWebhooks = data.webhook_events || [];
      } else if (res.status === 401 && !user) {
        isFetchingRef.current = false;
        onLogout();
        return;
      }
    } catch (e) {
      console.warn('API /api/admin/dashboard unreachable, using Supabase fallback:', e);
    }

    // Direct Supabase Fallback if settings or streamer_token is missing
    if (
      (!dashboardSettings ||
        !dashboardSettings.streamer_token ||
        dashboardSettings.streamer_token === 'TOKEN') &&
      user
    ) {
      try {
        const targetId = user.id || user.auth_user_id;
        if (targetId) {
          const directRes = await getOverlaySettingsFromSupabase(targetId);
          if (directRes.settings) {
            dashboardSettings = directRes.settings;
          }
          if (directRes.error && (!dashboardSettings || !dashboardSettings.streamer_token)) {
            setTokenError(directRes.error);
          } else {
            setTokenError(null);
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Gagal mengambil data token dari Supabase.';
        console.warn('Direct Supabase settings fetch exception:', errMsg);
        setTokenError(errMsg);
      }
    }

    if (dashboardSettings) {
      setSettings(dashboardSettings);
      setSettingsForm(dashboardSettings);
      if (dashboardSettings.streamer_token && dashboardSettings.streamer_token !== 'TOKEN') {
        setTokenError(null);
      }
    }
    setQueue(dashboardQueue);
    setDonations(dashboardDonations);
    setStats(dashboardStats);
    setLogs(dashboardLogs);
    if (dashboardWebhooks.length > 0) setWebhookEvents(dashboardWebhooks);

    if (dashboardSettings?.dashboard_ui_theme && !localStorage.getItem('dashboard_ui_theme')) {
      setUiTheme(dashboardSettings.dashboard_ui_theme);
    }
    setLoading(false);
    isFetchingRef.current = false;
  }, [sessionToken, adminPin, onLogout, user]);

  // Fetch admin platform data
  const fetchAdminData = useCallback(async () => {
    if (user?.role !== 'admin') return;
    try {
      const headers: Record<string, string> = {};
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

      const resAnalytics = await fetch('/api/admin/platform/analytics', { headers });
      if (resAnalytics.ok) {
        const data = await resAnalytics.json();
        setPlatformAnalytics(data.analytics);
        if (data.users) setRegisteredUsers(data.users);
      }

      const resPromo = await fetch('/api/admin/platform/promotion', { headers });
      if (resPromo.ok) {
        const data = await resPromo.json();
        if (data.promotion) setPromotionForm(data.promotion);
      }
    } catch (err) {
      console.error('Failed to fetch admin platform data:', err);
    }
  }, [user?.role, sessionToken]);

  const handleSavePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPromotion(true);
    try {
      await callAdminApi('/api/admin/platform/promotion', promotionForm);
      showNotification('Promosi Platform berhasil diperbarui!', 'success');
      fetchAdminData();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Gagal menyimpan promosi', 'error');
    } finally {
      setSavingPromotion(false);
    }
  };

  // Initial load + Realtime SSE listener
  useEffect(() => {
    fetchDashboard();
    if (user?.role === 'admin') {
      fetchAdminData();
    }

    const streamUrl = `/api/realtime?session_token=${encodeURIComponent(sessionToken || '')}&pin=${encodeURIComponent(adminPin || '')}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.addEventListener('init', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.settings) {
          setSettings(payload.settings);
          setSettingsForm(payload.settings);
        }
        if (payload.queue) setQueue(payload.queue);
        if (payload.stats) setStats(payload.stats);
      } catch (err) {
        console.error('Error parsing admin init SSE:', err);
      }
    });

    eventSource.addEventListener('queue_update', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.settings) {
          setSettings(payload.settings);
          setSettingsForm(payload.settings);
        }
        if (payload.queue) setQueue(payload.queue);
        if (payload.stats) setStats(payload.stats);
        if (payload.logs) setLogs(payload.logs);
        // Refresh dashboard on webhook or donation events
        if (payload.reason?.includes('sociabuzz') || payload.reason?.includes('donation')) {
          fetchDashboard();
        }
      } catch (err) {
        console.error('Error parsing admin queue_update SSE:', err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [sessionToken, adminPin, fetchDashboard]);

  // Actions (Non-blocking with instant feedback & optimistic updates)
  const handleNextMatch = async () => {
    try {
      await callAdminApi('/api/admin/queue/next');
      showNotification('Next match dimulai!', 'success');
      fetchDashboard();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Gagal next match', 'error');
    }
  };

  const handleSetPlaying = async (queueId: string) => {
    try {
      await callAdminApi('/api/admin/queue/play', { queue_id: queueId });
      showNotification('Player diset ke status PLAYING', 'success');
      fetchDashboard();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Gagal set playing', 'error');
    }
  };

  const handleSetDone = async (queueId: string) => {
    try {
      await callAdminApi('/api/admin/queue/done', { queue_id: queueId });
      showNotification('Player ditandai selesai (DONE)', 'success');
      fetchDashboard();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Gagal set done', 'error');
    }
  };

  const handleSkip = async (queueId: string) => {
    try {
      await callAdminApi('/api/admin/queue/skip', { queue_id: queueId });
      showNotification('Player berhasil dilewati (skip)', 'info');
      fetchDashboard();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Gagal skip player', 'error');
    }
  };

  const handleRemove = async (queueId: string) => {
    // 1. Optimistic removal: row vanishes immediately without waiting or freezing
    setQueue((prev) => prev.filter((item) => item.id !== queueId && item.player_id !== queueId));
    try {
      await callAdminApi('/api/admin/queue/remove', { queue_id: queueId });
      showNotification('Player berhasil dihapus dari antrian', 'success');
      fetchDashboard();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Gagal hapus player', 'error');
      fetchDashboard();
    }
  };

  const handleMove = async (queueId: string, direction: 'up' | 'down') => {
    try {
      await callAdminApi('/api/admin/queue/move', { queue_id: queueId, direction });
      showNotification(
        `Posisi antrian digeser ke ${direction === 'up' ? 'atas' : 'bawah'}`,
        'info'
      );
      fetchDashboard();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Gagal menggeser antrian', 'error');
    }
  };

  const handleSavePlayerEdit = async (updates: {
    name: string;
    game_id: string;
    membership: MembershipType;
  }) => {
    if (!editingPlayer) return;
    await callAdminApi('/api/admin/queue/edit', {
      player_id: editingPlayer.id,
      ...updates,
    });
    fetchDashboard();
  };

  const handleAddPlayer = async (data: {
    name: string;
    game_id: string;
    membership: MembershipType;
  }) => {
    await callAdminApi('/api/admin/queue/manual-add', data);
    fetchDashboard();
  };

  const handleSimulateDonation = async (data: {
    donor_name: string;
    amount: number;
    message: string;
  }) => {
    await callAdminApi('/api/admin/simulate-donation', data);
    fetchDashboard();
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess('');
    try {
      const res = await callAdminApi('/api/admin/settings', settingsForm);
      setSettings(res.settings);
      setSettingsForm(res.settings);
      setSettingsSuccess('Pengaturan berhasil disimpan!');
      showNotification('Pengaturan berhasil disimpan!', 'success');
      setTimeout(() => setSettingsSuccess(''), 3000);

      // Sync to Supabase if configured and user is signed in
      if (isSupabaseConfigured() && supabase && user?.id) {
        try {
          await supabase
            .from('overlay_settings')
            .upsert(
              {
                user_id: user.id,
                streamer_token: res.settings.streamer_token,
                custom_colors: res.settings.custom_colors,
                title: res.settings.title,
                theme: res.settings.theme,
                font_size: res.settings.font_size,
                max_visible_players: res.settings.max_visible_players,
                animation: res.settings.animation,
                opacity: res.settings.opacity,
                card_size: res.settings.card_size,
                spacing: res.settings.spacing,
                sound_alert: res.settings.sound_alert,
                live_badge_text: res.settings.live_badge_text,
                hide_playing_in_overlay: res.settings.hide_playing_in_overlay,
                panel_width: res.settings.panel_width,
                show_id: res.settings.show_id,
                show_vip_badge: res.settings.show_vip_badge,
                show_live_badge: res.settings.show_live_badge,
                border_radius: res.settings.border_radius,
                enable_animation: res.settings.enable_animation,
                allow_promotion: res.settings.allow_promotion,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
        } catch (supaErr) {
          console.warn('[Supabase Sync] overlay_settings upsert notice:', supaErr);
        }
      }
    } catch (err: unknown) {
      showNotification(
        err instanceof Error ? err.message : 'Gagal menyimpan pengaturan',
        'error'
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleColorsChange = (newColors: OverlayCustomColors) => {
    setSettingsForm((prev) => ({
      ...prev,
      custom_colors: newColors,
    }));
  };

  const handleResetColors = () => {
    setSettingsForm((prev) => ({
      ...prev,
      custom_colors: { ...DEFAULT_OVERLAY_COLORS },
    }));
    showNotification('Warna overlay dikembalikan ke default Obsidian.', 'info');
  };

  const handleConfirmRegenerateToken = async () => {
    setIsRegeneratingToken(true);
    try {
      let newToken = '';

      // 1. Try server API
      try {
        const res = await callAdminApi('/api/admin/settings/regenerate-token');
        if (res && res.token) {
          newToken = res.token;
        }
      } catch (e) {
        console.warn('[Regenerate Token] API call notice, falling back to direct Supabase:', e);
      }

      // 2. Direct Supabase sync if server API missed or client-side Vercel serverless
      const targetUserId = user?.id || user?.auth_user_id;
      if (targetUserId) {
        const supaRes = await regenerateOverlayTokenInSupabase(targetUserId);
        if (supaRes && supaRes.streamer_token) {
          newToken = supaRes.streamer_token;
        }
      }

      if (newToken) {
        setSettings((prev) => (prev ? { ...prev, streamer_token: newToken } : null));
        setSettingsForm((prev) => ({ ...prev, streamer_token: newToken }));
        showNotification(
          'Token OBS Overlay berhasil diperbarui! Mohon perbarui URL Browser Source pada OBS Studio Anda.',
          'success'
        );
      } else {
        showNotification('Gagal memperbarui token OBS. Silakan coba lagi.', 'error');
      }
    } catch (err: unknown) {
      showNotification(
        err instanceof Error ? err.message : 'Gagal regenerate token OBS',
        'error'
      );
    } finally {
      setIsRegeneratingToken(false);
      setShowRegenerateModal(false);
      fetchDashboard();
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin || newPin.length < 4) {
      showNotification('PIN minimal 4 karakter', 'error');
      return;
    }
    try {
      await callAdminApi('/api/admin/settings/pin', { new_pin: newPin });
      setPinSuccess('PIN Admin berhasil diperbarui!');
      showNotification('PIN Admin berhasil diperbarui!', 'success');
      setNewPin('');
      setTimeout(() => setPinSuccess(''), 3000);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Gagal update PIN', 'error');
    }
  };

  // URL Helpers
  const domain = typeof window !== 'undefined' ? window.location.origin : 'https://overlay-by-fianzsrow.vercel.app';
  const hasToken = Boolean(settings?.streamer_token && settings.streamer_token.trim() !== '' && settings.streamer_token !== 'TOKEN');
  const overlayUrl = hasToken ? `${domain}/overlay/${settings!.streamer_token}` : '';
  const joinUrl = hasToken ? `${domain}/join?streamer=${settings!.streamer_token}` : `${domain}/join`;
  const sociabuzzUrl = settings?.sociabuzz_url || 'https://sociabuzz.com/prostreamer';
  const webhookKey = settings?.webhook_key || settings?.streamer_token || 'KEY';
  const webhookUrl = `${domain}/api/webhooks/sociabuzz/${webhookKey}`;
  const webhookSecret = settings?.webhook_secret || 'sb_sec_default';
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const copyToClipboard = (
    text: string,
    type: 'overlay' | 'sociabuzz' | 'join' | 'webhook-url' | 'webhook-secret'
  ) => {
    navigator.clipboard.writeText(text);
    if (type === 'overlay') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === 'sociabuzz') {
      setCopiedDonation(true);
      setTimeout(() => setCopiedDonation(false), 2000);
    } else if (type === 'join') {
      setCopiedJoin(true);
      setTimeout(() => setCopiedJoin(false), 2000);
    } else if (type === 'webhook-url') {
      setCopiedWebhookUrl(true);
      setTimeout(() => setCopiedWebhookUrl(false), 2000);
    } else if (type === 'webhook-secret') {
      setCopiedWebhookSecret(true);
      setTimeout(() => setCopiedWebhookSecret(false), 2000);
    }
  };

  const isNeo = false;

  if (loading && !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="apple-card p-6 rounded-3xl flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
          <span className={`text-xs font-medium tracking-tight ${isLight ? 'text-zinc-600' : 'text-zinc-300'}`}>
            Memuat Dashboard Streamer...
          </span>
        </div>
      </div>
    );
  }

  const playingItem = queue.find((q) => q.status === 'PLAYING');
  const queuedItems = queue.filter((q) => q.status === 'QUEUED');
  const nextItem = queuedItems[0] || null;

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row font-sans relative bg-transparent antialiased transition-colors duration-300 ${
        isLight ? 'text-zinc-900' : 'text-zinc-100'
      }`}
    >
      {/* Global In-App Notification Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] max-w-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`apple-glass border shadow-2xl backdrop-blur-2xl px-4 py-3 rounded-2xl flex items-center gap-3 ${
              toast.type === 'success'
                ? 'text-emerald-500 dark:text-emerald-300'
                : toast.type === 'error'
                ? 'text-red-500 dark:text-red-300'
                : 'text-zinc-700 dark:text-zinc-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16a34a] dark:text-[#30d158]" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-[#dc2626] dark:text-[#ff453a]" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0 text-[#2997ff]" />
            )}
            <p className="text-xs font-medium tracking-tight leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-auto text-xs opacity-60 hover:opacity-100 cursor-pointer px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* SIDEBAR NAVIGATION - APPLE MINIMAL FROSTED */}
      <aside
        className={`w-full md:w-68 flex flex-col justify-between shrink-0 z-20 transition-colors duration-200 border-r backdrop-blur-2xl ${
          isLight
            ? 'bg-white/70 border-black/[0.08]'
            : 'bg-black/60 border-white/[0.08]'
        }`}
      >
        <div>
          {/* Logo / Brand Header */}
          <div
            className={`p-5 flex items-center gap-3 border-b ${
              isLight ? 'border-black/[0.08] bg-black/[0.02]' : 'border-white/[0.08] bg-white/[0.02]'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner ${
                isLight
                  ? 'bg-zinc-100 border-black/10 text-zinc-900'
                  : 'bg-white/[0.08] border-white/[0.12] text-white'
              }`}
            >
              <Swords className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h2
                className={`font-semibold text-base tracking-[-0.02em] leading-tight ${
                  isLight ? 'text-zinc-950' : 'text-white'
                }`}
              >
                ANTRIAN 1V1
              </h2>
              <span
                className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-tight border ${
                  isLight
                    ? 'text-zinc-500 bg-black/[0.04] border-black/[0.06]'
                    : 'text-zinc-400 bg-white/[0.04] border-white/[0.06]'
                }`}
              >
                Studio Control Hub
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3.5 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs tracking-tight transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? isLight
                    ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                    : 'bg-white text-black font-semibold shadow-sm'
                  : isLight
                  ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.05] font-normal'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] font-normal'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs tracking-tight transition-all cursor-pointer ${
                activeTab === 'queue'
                  ? isLight
                    ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                    : 'bg-white text-black font-semibold shadow-sm'
                  : isLight
                  ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.05] font-normal'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] font-normal'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Antrian 1v1</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  activeTab === 'queue'
                    ? isLight
                      ? 'bg-white/20 text-white'
                      : 'bg-black/10 text-black'
                    : isLight
                    ? 'bg-black/[0.08] text-zinc-700'
                    : 'bg-white/[0.08] text-zinc-300'
                }`}
              >
                {queue.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('donations')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs tracking-tight transition-all cursor-pointer ${
                activeTab === 'donations'
                  ? isLight
                    ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                    : 'bg-white text-black font-semibold shadow-sm'
                  : isLight
                  ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.05] font-normal'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] font-normal'
              }`}
            >
              <div className="flex items-center gap-3">
                <Coins className="w-4 h-4 text-[#d97706] dark:text-[#ffd60a]" />
                <span>Donasi Sociabuzz</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  activeTab === 'donations'
                    ? isLight
                      ? 'bg-white/20 text-white'
                      : 'bg-black/10 text-black'
                    : isLight
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-white/[0.08] text-amber-300'
                }`}
              >
                {donations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('overlay')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs tracking-tight transition-all cursor-pointer ${
                activeTab === 'overlay'
                  ? isLight
                    ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                    : 'bg-white text-black font-semibold shadow-sm'
                  : isLight
                  ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.05] font-normal'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] font-normal'
              }`}
            >
              <Tv className="w-4 h-4 text-[#2997ff]" />
              <span>OBS Overlay</span>
            </button>

            <button
              onClick={() => setActiveTab('sociabuzz')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs tracking-tight transition-all cursor-pointer ${
                activeTab === 'sociabuzz'
                  ? isLight
                    ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                    : 'bg-white text-black font-semibold shadow-sm'
                  : isLight
                  ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.05] font-normal'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] font-normal'
              }`}
            >
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-[#16a34a] dark:text-[#30d158]" />
                <span>Sociabuzz Webhook</span>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${
                  webhookEvents.length > 0 ? 'bg-[#16a34a] dark:bg-[#30d158]' : 'bg-[#d97706] dark:bg-[#ffd60a]'
                }`}
                title={webhookEvents.length > 0 ? 'Webhook Aktif' : 'Menunggu Notifikasi'}
              />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs tracking-tight transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? isLight
                    ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                    : 'bg-white text-black font-semibold shadow-sm'
                  : isLight
                  ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.05] font-normal'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] font-normal'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Pengaturan</span>
            </button>

            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  setActiveTab('admin');
                  fetchAdminData();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs tracking-tight transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? isLight
                      ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                      : 'bg-white text-black font-semibold shadow-sm'
                    : isLight
                    ? 'text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.05] font-normal'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] font-normal'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#2997ff]" />
                  <span>Admin Platform</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2997ff]/20 text-[#2997ff]">
                  PRO
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div
          className={`p-4 space-y-2.5 border-t ${
            isLight
              ? 'border-black/[0.08] bg-black/[0.01]'
              : 'border-white/[0.08] bg-white/[0.01]'
          }`}
        >
          {/* Quick Viewer Join Link Box */}
          <div className="apple-card p-3 rounded-2xl text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-medium text-zinc-500">Link Viewer</span>
              <button
                onClick={() => copyToClipboard(joinUrl, 'join')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  isLight
                    ? 'bg-black/[0.06] hover:bg-black/[0.1] text-zinc-700'
                    : 'bg-white/[0.08] hover:bg-white/[0.14] text-zinc-300'
                }`}
              >
                {copiedJoin ? <Check className="w-3 h-3 text-[#16a34a]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedJoin ? 'Tersalin' : 'Copy'}</span>
              </button>
            </div>
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-mono text-[11px] truncate block transition-colors ${
                isLight ? 'text-zinc-600 hover:text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              /join
            </a>
          </div>

          <button
            onClick={onLogout}
            className={`w-full py-2.5 px-3 rounded-full text-xs font-medium tracking-tight flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              isLight
                ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black border-black/[0.08]'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border-white/[0.06]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto max-h-screen bg-transparent">
        {/* Top Header Bar - Frosted Apple Minimal */}
        <header
          className={`px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 border-b backdrop-blur-2xl transition-colors ${
            isLight
              ? 'bg-white/60 border-black/[0.08]'
              : 'bg-black/50 border-white/[0.08]'
          }`}
        >
          {/* Sociabuzz Quick Copy Box */}
          <div className="apple-card px-3.5 py-1.5 rounded-full flex items-center gap-2.5">
            <span className="px-2 py-0.5 text-[10px] rounded-full font-medium tracking-tight bg-[#ffd60a]/20 text-[#b45309] dark:text-[#ffd60a] border border-[#ffd60a]/30">
              Sociabuzz
            </span>
            <span
              className={`text-xs font-mono truncate max-w-[180px] sm:max-w-xs ${
                isLight ? 'text-zinc-600' : 'text-zinc-400'
              }`}
            >
              {sociabuzzUrl}
            </span>
            <button
              onClick={() => copyToClipboard(sociabuzzUrl, 'sociabuzz')}
              className={`ml-1 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-tight flex items-center gap-1 transition-all cursor-pointer ${
                isLight
                  ? 'bg-black/[0.06] hover:bg-black/[0.1] text-zinc-700'
                  : 'bg-white/[0.08] hover:bg-white/[0.14] text-zinc-300'
              }`}
            >
              {copiedDonation ? <Check className="w-3 h-3 text-[#16a34a]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedDonation ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Quick Header Actions + Background Theme Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <ThemeHeaderControls compact={false} />

            <button
              onClick={() => setShowSimModal(true)}
              className="apple-button-secondary py-1.5 px-3.5 text-xs rounded-full flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#d97706] dark:text-[#ffd60a]" />
              <span>Simulasi Webhook</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="apple-button-primary py-1.5 px-4 text-xs rounded-full flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Player</span>
            </button>
          </div>
        </header>

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="p-6 space-y-6">
            {/* Warning Banner: If Sociabuzz not connected (Section 23) */}
            {webhookEvents.length === 0 && (
              <div className="p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-2xl shrink-0 bg-amber-500/20 border border-amber-500/30">
                    <AlertCircle className="w-5 h-5 text-[#ffd60a]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs tracking-tight text-white">
                      Sociabuzz Belum Terhubung
                    </h4>
                    <p className="text-xs text-zinc-400 font-normal mt-0.5">
                      Hubungkan Sociabuzz untuk mengaktifkan automatic queue saat penonton mengirim donasi mabar.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('sociabuzz')}
                    className="apple-button-primary px-3.5 py-2 rounded-full text-xs font-medium cursor-pointer"
                  >
                    Hubungkan Sociabuzz
                  </button>
                  <button
                    onClick={() => setShowSimModal(true)}
                    className="apple-button-secondary px-3.5 py-2 rounded-full text-xs font-medium cursor-pointer"
                  >
                    Test Notifikasi
                  </button>
                </div>
              </div>
            )}

            {/* Streamer Setup Onboarding Progress */}
            <div className="apple-card p-5 rounded-3xl space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-xs tracking-tight text-white flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#ffd60a]" />
                    <span>Setup Streamer Onboarding</span>
                  </span>
                  <p className="text-[11px] text-zinc-400 font-normal mt-0.5">
                    Langkah mudah memulai live stream dengan antrian otomatis dan OBS overlay.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                  Progress:{' '}
                  {[
                    Boolean(user || sessionToken),
                    queue.length > 0,
                    webhookEvents.length > 0,
                    Boolean(settings),
                    copiedLink,
                  ].filter(Boolean).length}
                  /5 Selesai
                </div>
              </div>

              {/* Steps Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs font-medium">
                {/* Step 1 */}
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#30d158] shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-[11px] truncate text-white">1. Akun Google</div>
                    <div className="text-[10px] text-zinc-400 truncate">{user?.name || 'Terhubung'}</div>
                  </div>
                </div>

                {/* Step 2 */}
                <div
                  onClick={() => setActiveTab('queue')}
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    queue.length > 0
                      ? 'bg-white/[0.03] border-white/[0.06]'
                      : 'bg-white/[0.01] border-dashed border-white/[0.1] hover:bg-white/[0.04]'
                  }`}
                >
                  {queue.length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-[#30d158] shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-zinc-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-[11px] truncate text-white">2. Buat Queue</div>
                    <div className="text-[10px] text-zinc-400 truncate">{queue.length} Player aktif</div>
                  </div>
                </div>

                {/* Step 3 */}
                <div
                  onClick={() => setActiveTab('sociabuzz')}
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    webhookEvents.length > 0
                      ? 'bg-white/[0.03] border-white/[0.06]'
                      : 'bg-white/[0.01] border-dashed border-white/[0.1] hover:bg-white/[0.04]'
                  }`}
                >
                  {webhookEvents.length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-[#30d158] shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-zinc-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-[11px] truncate text-white">3. Sociabuzz</div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {webhookEvents.length > 0 ? `${webhookEvents.length} Event` : 'Hubungkan URL'}
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div
                  onClick={() => setActiveTab('settings')}
                  className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5 cursor-pointer hover:bg-white/[0.06] transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#30d158] shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-[11px] truncate text-white">4. Atur Overlay</div>
                    <div className="text-[10px] text-zinc-400 truncate">{settings?.theme || 'Default'}</div>
                  </div>
                </div>

                {/* Step 5 */}
                <div
                  onClick={() => {
                    copyToClipboard(overlayUrl, 'overlay');
                    showNotification('Link OBS Browser Source berhasil disalin!', 'success');
                  }}
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    copiedLink
                      ? 'bg-[#2997ff]/10 border-[#2997ff]/30 text-[#2997ff]'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  {copiedLink ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2997ff] shrink-0" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-[11px] truncate text-white">5. Pasang OBS</div>
                    <div className="text-[10px] text-zinc-400 truncate">Salin link overlay</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Metric Cards - Apple Minimal Precision */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Antrian */}
              <div className="apple-card p-5 rounded-3xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-2">
                  <span>Total Antrian</span>
                  <div className="w-7 h-7 rounded-full bg-[#2997ff]/10 border border-[#2997ff]/20 flex items-center justify-center text-[#2997ff]">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-3xl font-semibold tracking-tight text-white">{stats?.total_queued ?? queue.length}</div>
                <div className="text-[11px] text-zinc-500 mt-1 font-normal">
                  Menunggu giliran main
                </div>
              </div>

              {/* Sedang Bermain */}
              <div className="apple-card p-5 rounded-3xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-2">
                  <span>Sedang Bermain</span>
                  <div className="w-7 h-7 rounded-full bg-[#ff453a]/10 border border-[#ff453a]/20 flex items-center justify-center text-[#ff453a]">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight text-white truncate">
                  {playingItem ? playingItem.player.name : 'Kosong'}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1 font-normal truncate">
                  {playingItem ? `ID: ${playingItem.player.game_id}` : 'Belum ada player aktif'}
                </div>
              </div>

              {/* Selesai Hari Ini */}
              <div className="apple-card p-5 rounded-3xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-2">
                  <span>Selesai Hari Ini</span>
                  <div className="w-7 h-7 rounded-full bg-[#30d158]/10 border border-[#30d158]/20 flex items-center justify-center text-[#30d158]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-3xl font-semibold tracking-tight text-white">{stats?.done_today ?? 0}</div>
                <div className="text-[11px] text-zinc-500 mt-1 font-normal">
                  Pertandingan selesai
                </div>
              </div>

              {/* Total Donasi */}
              <div className="apple-card p-5 rounded-3xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-2">
                  <span>Donasi Hari Ini</span>
                  <div className="w-7 h-7 rounded-full bg-[#ffd60a]/10 border border-[#ffd60a]/20 flex items-center justify-center text-[#ffd60a]">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-white font-mono">
                  Rp {(stats?.total_donations_today ?? 0).toLocaleString('id-ID')}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1 font-normal">
                  Dari Sociabuzz
                </div>
              </div>
            </div>

            {/* Match Spotlight Cards - Apple Minimal Frosted Glass */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Player Card */}
              <div
                className={`rounded-3xl overflow-hidden ${
                  isNeo
                    ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
                    : 'apple-glass rounded-3xl border border-white/[0.1] shadow-2xl'
                }`}
              >
                <div
                  className={`px-6 py-4 flex items-center justify-between ${
                    isNeo
                      ? 'bg-[#FF4D4D] border-b-[2.5px] border-black text-white'
                      : 'border-b border-white/[0.08] bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="font-semibold text-xs tracking-tight text-white">
                      Sedang Bertanding (LIVE)
                    </span>
                  </div>
                  {playingItem && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                      #{playingItem.position}
                    </span>
                  )}
                </div>

                <div className="p-6">
                  {playingItem ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-3xl font-semibold tracking-[-0.03em] text-white">
                          {playingItem.player.name}
                        </div>
                        <div className="font-mono text-sm mt-1 text-zinc-400">
                          ID: {playingItem.player.game_id}
                        </div>
                        <div className="flex items-center gap-2 mt-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-tight ${
                              playingItem.player.membership === 'VVIP'
                                ? 'bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/30'
                                : playingItem.player.membership === 'VIP'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-white/[0.08] text-zinc-300 border border-white/[0.1]'
                            }`}
                          >
                            {playingItem.player.membership}
                          </span>
                          {playingItem.donation && (
                            <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-white/[0.06] text-amber-300 border border-white/[0.08]">
                              Rp {playingItem.donation.amount.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-2.5">
                        <button
                          onClick={() => handleSetDone(playingItem.id)}
                          className="apple-button-secondary py-2.5 px-4 rounded-full text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158]" />
                          <span>Selesai (Done)</span>
                        </button>
                        <button
                          onClick={handleNextMatch}
                          className="apple-button-primary flex-1 py-2.5 px-4 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                          <span>Next Match</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-zinc-500 font-normal text-xs">
                      Tidak ada player yang sedang bermain.
                      {nextItem && (
                        <div className="mt-3">
                          <button
                            onClick={handleNextMatch}
                            className="apple-button-primary px-4 py-2 text-xs rounded-full cursor-pointer"
                          >
                            Mulai Match Sekarang
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Next Player Spotlight Card */}
              <div
                className={`rounded-3xl overflow-hidden ${
                  isNeo
                    ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
                    : 'apple-glass rounded-3xl border border-white/[0.08] shadow-2xl'
                }`}
              >
                <div
                  className={`px-6 py-4 flex items-center justify-between ${
                    isNeo
                      ? 'bg-[#FFE600] border-b-[2.5px] border-black text-black'
                      : 'border-b border-white/[0.08] bg-white/[0.02]'
                  }`}
                >
                  <span className="font-semibold text-xs tracking-tight text-white">
                    Next Player (Berikutnya)
                  </span>
                  {nextItem && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/[0.08] text-zinc-300 border border-white/[0.1]">
                      #{nextItem.position}
                    </span>
                  )}
                </div>

                <div className="p-6">
                  {nextItem ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-3xl font-semibold tracking-[-0.03em] text-white">
                          {nextItem.player.name}
                        </div>
                        <div className="font-mono text-sm mt-1 text-zinc-400">
                          ID: {nextItem.player.game_id}
                        </div>
                        <div className="flex items-center gap-2 mt-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-tight ${
                              nextItem.player.membership === 'VVIP'
                                ? 'bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/30'
                                : nextItem.player.membership === 'VIP'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-white/[0.08] text-zinc-300 border border-white/[0.1]'
                            }`}
                          >
                            {nextItem.player.membership}
                          </span>
                          {nextItem.donation && (
                            <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-white/[0.06] text-amber-300 border border-white/[0.08]">
                              Rp {nextItem.donation.amount.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-2.5">
                        <button
                          onClick={() => handleSkip(nextItem.id)}
                          className="apple-button-secondary py-2.5 px-4 rounded-full text-xs font-medium cursor-pointer"
                        >
                          Skip Player
                        </button>
                        <button
                          onClick={handleNextMatch}
                          className="apple-button-primary flex-1 py-2.5 px-4 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Main Sekarang</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-zinc-500 font-normal text-xs">
                      Antrian berikutnya masih kosong.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity Log Feed */}
            <div className="apple-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="font-semibold text-sm tracking-tight text-white">Aktivitas Terbaru</h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
                  REALTIME LOG
                </span>
              </div>

              <div className="space-y-2">
                {logs.length === 0 ? (
                  <div className="py-6 text-center text-zinc-500 font-normal text-xs">
                    Belum ada aktivitas tercatat.
                  </div>
                ) : (
                  logs.slice(0, 8).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl flex items-center justify-between text-xs bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.type === 'play'
                              ? 'bg-[#ff453a]'
                              : log.type === 'donation'
                              ? 'bg-[#ffd60a]'
                              : log.type === 'join'
                              ? 'bg-[#2997ff]'
                              : log.type === 'done'
                              ? 'bg-[#30d158]'
                              : 'bg-zinc-400'
                          }`}
                        />
                        <span className="font-medium text-zinc-200">{log.text}</span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 font-normal">
                        {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANTRIAN 1V1 (TABLE & ACTIONS) */}
        {activeTab === 'queue' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">Daftar Antrian 1v1</h2>
                <p className="text-xs text-zinc-400 font-normal mt-0.5">
                  Kelola posisi, status, aksi next, skip, remove, dan edit player secara realtime.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNextMatch}
                  className="apple-button-primary px-4 py-2 text-xs rounded-full flex items-center gap-1.5 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Next Match</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="apple-button-secondary px-4 py-2 text-xs rounded-full flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tambah Manual</span>
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="apple-glass rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="uppercase tracking-wider font-medium text-[11px] bg-white/[0.02] text-zinc-400 border-b border-white/[0.08]">
                    <tr>
                      <th className="py-3.5 px-4 w-16 text-center">Posisi</th>
                      <th className="py-3.5 px-4">Nama</th>
                      <th className="py-3.5 px-4">ID Game</th>
                      <th className="py-3.5 px-4">Membership</th>
                      <th className="py-3.5 px-4">Donasi</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                    {queue.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-zinc-500 font-normal">
                          Antrian saat ini kosong. Viewer dapat mendaftar di halaman{' '}
                          <code className="px-2 py-0.5 rounded-full text-xs font-mono bg-white/[0.08] text-white">
                            /join
                          </code>
                          .
                        </td>
                      </tr>
                    ) : (
                      queue.map((item, idx) => {
                        const isPlaying = item.status === 'PLAYING';
                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              isPlaying
                                ? 'bg-red-950/20 hover:bg-red-950/30'
                                : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            {/* Posisi */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  isPlaying
                                    ? 'bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/30'
                                    : item.position === 2
                                    ? 'bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/30'
                                    : item.position === 3
                                    ? 'bg-[#bf5af2]/20 text-[#bf5af2] border border-[#bf5af2]/30'
                                    : 'bg-white/[0.08] text-zinc-300 border border-white/[0.1]'
                                }`}
                              >
                                #{item.position}
                              </span>
                            </td>

                            {/* Nama */}
                            <td className="py-3.5 px-4 font-semibold text-sm text-white">
                              {item.player.name}
                            </td>

                            {/* ID Game */}
                            <td className="py-3.5 px-4 font-mono text-zinc-300">{item.player.game_id}</td>

                            {/* Membership */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 font-medium px-2.5 py-0.5 rounded-full text-[11px] ${
                                  item.player.membership === 'VVIP'
                                    ? 'bg-[#ffd60a]/15 text-[#ffd60a] border border-[#ffd60a]/25'
                                    : item.player.membership === 'VIP'
                                    ? 'bg-[#bf5af2]/15 text-purple-300 border border-purple-500/25'
                                    : 'bg-white/[0.06] text-zinc-400 border border-white/[0.08]'
                                }`}
                              >
                                {item.player.membership === 'VVIP' && (
                                  <Crown className="w-3 h-3 fill-current text-[#ffd60a]" />
                                )}
                                {item.player.membership === 'VIP' && (
                                  <Sparkles className="w-3 h-3 text-[#bf5af2]" />
                                )}
                                {item.player.membership}
                              </span>
                            </td>

                            {/* Donasi */}
                            <td className="py-3.5 px-4 font-mono">
                              {item.donation ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-amber-300 border border-white/[0.08] text-xs font-medium">
                                  Rp {item.donation.amount.toLocaleString('id-ID')}
                                </span>
                              ) : (
                                <span className="text-zinc-600">-</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              {isPlaying ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff453a] animate-ping" />
                                  LIVE MATCH
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
                                  QUEUED
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                {!isPlaying && (
                                  <button
                                    onClick={() => handleSetPlaying(item.id)}
                                    title="Set Sedang Bermain (Play)"
                                    className="p-2 rounded-full cursor-pointer bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/30 transition-all"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                )}

                                {isPlaying && (
                                  <button
                                    onClick={() => handleSetDone(item.id)}
                                    title="Tandai Selesai (Done)"
                                    className="p-2 rounded-full cursor-pointer bg-[#30d158]/20 hover:bg-[#30d158] text-[#30d158] hover:text-black border border-[#30d158]/30 transition-all"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </button>
                                )}

                                {/* Move Up */}
                                <button
                                  disabled={isPlaying || idx <= 1}
                                  onClick={() => handleMove(item.id, 'up')}
                                  title="Geser Posisi Ke Atas"
                                  className="p-2 rounded-full cursor-pointer disabled:opacity-20 bg-white/[0.05] hover:bg-white/[0.12] text-zinc-300 border border-white/[0.08] transition-all"
                                >
                                  <ArrowUp className="w-3.5 h-3.5 stroke-[2]" />
                                </button>

                                {/* Move Down */}
                                <button
                                  disabled={isPlaying || idx === queue.length - 1}
                                  onClick={() => handleMove(item.id, 'down')}
                                  title="Geser Posisi Ke Bawah"
                                  className="p-2 rounded-full cursor-pointer disabled:opacity-20 bg-white/[0.05] hover:bg-white/[0.12] text-zinc-300 border border-white/[0.08] transition-all"
                                >
                                  <ArrowDown className="w-3.5 h-3.5 stroke-[2]" />
                                </button>

                                {/* Edit */}
                                <button
                                  onClick={() => setEditingPlayer(item.player)}
                                  title="Edit Player"
                                  className="p-2 rounded-full cursor-pointer bg-white/[0.05] hover:bg-[#2997ff]/20 text-zinc-300 hover:text-[#2997ff] border border-white/[0.08] transition-all"
                                >
                                  <Edit className="w-3.5 h-3.5 stroke-[2]" />
                                </button>

                                {/* Skip */}
                                <button
                                  onClick={() => handleSkip(item.id)}
                                  title="Skip Player"
                                  className="p-2 rounded-full cursor-pointer bg-white/[0.05] hover:bg-[#ffd60a]/20 text-zinc-300 hover:text-[#ffd60a] border border-white/[0.08] transition-all"
                                >
                                  <SkipForward className="w-3.5 h-3.5 stroke-[2]" />
                                </button>

                                {/* Remove */}
                                <button
                                  onClick={() => handleRemove(item.id)}
                                  title="Hapus Player"
                                  className="p-2 rounded-full cursor-pointer bg-white/[0.05] hover:bg-[#ff453a]/20 text-zinc-300 hover:text-[#ff453a] border border-white/[0.08] transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DONASI SOCIABUZZ */}
        {activeTab === 'donations' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                  Riwayat Donasi Sociabuzz
                </h2>
                <p className="text-xs text-zinc-400 font-normal mt-0.5">
                  Menampilkan data donasi yang masuk melalui webhook atau simulasi Sociabuzz.
                </p>
              </div>

              <button
                onClick={() => setShowSimModal(true)}
                className="apple-button-primary px-4 py-2 rounded-full text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-[#ffd60a]" />
                <span>Simulasi Donasi Sociabuzz</span>
              </button>
            </div>

            {/* Sociabuzz Webhook Info Box */}
            <div className="apple-card p-5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/25">
                  Webhook URL
                </span>
                <h3 className="font-semibold text-xs tracking-tight text-white">
                  Endpoint Integrasi Sociabuzz
                </h3>
              </div>
              <p className="text-xs text-zinc-400 font-normal leading-relaxed">
                Pasang URL ini pada menu Webhook akun Sociabuzz Anda:
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <code className="px-4 py-2.5 rounded-2xl font-mono text-xs text-cyan-400 bg-white/[0.04] border border-white/[0.08] flex-1 truncate select-all">
                  {domain}/api/webhooks/sociabuzz
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${domain}/api/webhooks/sociabuzz`);
                    showNotification('Webhook URL tersalin!', 'success');
                  }}
                  className="apple-button-secondary px-4 py-2.5 rounded-full text-xs font-medium transition-all cursor-pointer"
                >
                  Copy URL
                </button>
              </div>
            </div>

            {/* Donations Table */}
            <div className="apple-glass rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="uppercase tracking-wider font-medium text-[11px] bg-white/[0.02] text-zinc-400 border-b border-white/[0.08]">
                    <tr>
                      <th className="py-3.5 px-4">Donation ID</th>
                      <th className="py-3.5 px-4">Donor Name</th>
                      <th className="py-3.5 px-4">Nominal</th>
                      <th className="py-3.5 px-4">Pesan</th>
                      <th className="py-3.5 px-4">Waktu</th>
                      <th className="py-3.5 px-4">Status Klaim</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                    {donations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-zinc-500 font-normal">
                          Belum ada riwayat donasi.
                        </td>
                      </tr>
                    ) : (
                      donations.map((don) => (
                        <tr
                          key={don.id}
                          className="hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono text-xs text-zinc-300">
                            {don.external_donation_id}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-sm text-white">{don.donor_name}</td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-amber-300 border border-white/[0.08] text-xs font-medium">
                              Rp {don.amount.toLocaleString('id-ID')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate text-zinc-400">
                            {don.message || '-'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                            {new Date(don.created_at).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3.5 px-4">
                            {don.status === 'CLAIMED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/25">
                                <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                                SUDAH MASUK QUEUE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                <Clock className="w-3 h-3" />
                                BELUM DIKLAIM
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: OBS OVERLAY MANAGER & PREVIEW */}
        {activeTab === 'overlay' && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                Pengaturan & Link OBS Overlay
              </h2>
              <p className="text-xs text-zinc-400 font-normal mt-0.5">
                Copy link Browser Source di bawah ini dan tempelkan langsung ke OBS Studio.
              </p>
            </div>

            {/* OBS BROWSER SOURCE CARD - APPLE MINIMAL FROSTED */}
            <div className="apple-glass rounded-3xl border border-white/[0.1] shadow-2xl text-white p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold text-xs tracking-tight uppercase flex items-center gap-2 text-white">
                  <Tv className="w-4 h-4 text-[#2997ff]" />
                  OBS Browser Source URL
                </span>
                <div className="flex items-center gap-2">
                  {hasToken ? (
                    <>
                      <span className="text-xs font-mono font-medium px-3 py-1 rounded-full bg-white/[0.08] text-zinc-300 border border-white/[0.1]">
                        Token: {settings?.streamer_token}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRegenerateModal(true)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white/[0.06] hover:bg-white/[0.12] text-amber-300 hover:text-amber-200 border border-amber-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Buat ulang token jika URL lama ingin dicabut"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Buat Ulang Token</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-mono font-medium px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-300" />
                      Menyiapkan Token...
                    </span>
                  )}
                </div>
              </div>

              {/* URL Input Box */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {hasToken ? (
                  <>
                    <input
                      type="text"
                      readOnly
                      value={overlayUrl}
                      className="apple-input text-xs flex-1 select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(overlayUrl, 'overlay')}
                      className="apple-button-primary py-3 px-6 rounded-full text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedLink ? (
                        <Check className="w-3.5 h-3.5 text-[#30d158]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedLink ? 'Link Tersalin!' : 'Copy Link OBS'}</span>
                    </button>
                    <a
                      href={overlayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apple-button-secondary py-3 px-5 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Preview</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </>
                ) : tokenError ? (
                  <div className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-2">
                    <div className="flex items-center justify-between font-semibold text-red-400">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>Gagal Memuat Token Supabase</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTokenError(null);
                          fetchDashboard();
                        }}
                        className="px-3 py-1 rounded-full text-[11px] font-medium bg-red-500/20 hover:bg-red-500/30 text-white border border-red-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Coba Lagi</span>
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-zinc-300 leading-relaxed bg-black/40 p-2.5 rounded-xl border border-white/5 break-all">
                      {tokenError}
                    </p>
                  </div>
                ) : (
                  <div className="w-full py-3.5 px-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-400 flex items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#2997ff]" />
                    <span>Membuat token overlay unik untuk akun Anda... Mohon tunggu sebentar (Max 10s).</span>
                  </div>
                )}
              </div>

              {/* Quick OBS Setup Guide */}
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t border-white/[0.08] text-zinc-400">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="font-semibold block mb-0.5 text-white">1. Tambah Browser</span>
                  <span className="font-normal text-zinc-400">Di OBS Studio, klik + pada Sources lalu pilih Browser.</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="font-semibold block mb-0.5 text-white">2. Atur Resolusi</span>
                  <span className="font-normal text-zinc-400">Set Width: 450, Height: 650 (Auto-height dinamis).</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="font-semibold block mb-0.5 text-white">3. Transparansi</span>
                  <span className="font-normal text-zinc-400">Background transparan otomatis menyatu dengan stream.</span>
                </div>
              </div>
            </div>

            {/* LIVE OVERLAY PREVIEW */}
            <div className="apple-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base tracking-tight text-white">
                    Interactive Live Overlay Preview
                  </h3>
                  <p className="text-xs text-zinc-400 font-normal mt-0.5">
                    Tampilan persis seperti yang akan tampil di live stream OBS Anda.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="apple-button-secondary px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer"
                >
                  Ubah Tampilan & Judul
                </button>
              </div>

              {/* Preview Window Frame */}
              <div className="w-full bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] bg-zinc-950/80 rounded-2xl p-6 flex justify-center min-h-[460px] overflow-hidden border border-white/[0.08]">
                <div className="w-full max-w-[440px]">
                  <OverlayView
                    previewSettings={{
                      ...settings,
                      ...settingsForm,
                      custom_colors: {
                        ...DEFAULT_OVERLAY_COLORS,
                        ...(settingsForm.custom_colors || settings?.custom_colors || {}),
                      },
                    } as OverlaySettings}
                    previewQueue={queue}
                    isPreviewMode={true}
                  />
                </div>
              </div>
            </div>

            {/* BAGIAN PENGATURAN BARU: CUSTOMISASI WARNA OVERLAY */}
            <OverlayColorCustomizer
              colors={settingsForm.custom_colors || settings?.custom_colors || DEFAULT_OVERLAY_COLORS}
              onChange={handleColorsChange}
              onReset={handleResetColors}
              onSave={() => handleSaveSettings()}
              isSaving={savingSettings}
              saveSuccess={settingsSuccess}
              isLight={isLight}
            />
          </div>
        )}

        {/* TAB 5: SOCIABUZZ WEBHOOK & DIAGNOSTIC LOGS */}
        {activeTab === 'sociabuzz' && (
          <div className="p-6 space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white flex items-center gap-2.5">
                  <Zap className="w-5 h-5 text-[#ffd60a]" />
                  <span>Integrasi Sociabuzz Webhook</span>
                </h2>
                <p className="text-xs text-zinc-400 font-normal mt-0.5">
                  Terima notifikasi donasi mabar dan masukkan pemain ke antrian OBS secara otomatis tanpa reload.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSimModal(true)}
                className="apple-button-primary px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-[#ffd60a]" />
                <span>Test Notifikasi (Simulator)</span>
              </button>
            </div>

            {/* 4 Metric Status Cards (Section 11) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Webhook Status */}
              <div className="apple-card p-5 rounded-3xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-1">
                  <span>Status Webhook</span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      webhookEvents.length > 0
                        ? 'bg-[#30d158] shadow-[0_0_8px_#30d158]'
                        : 'bg-[#ffd60a] animate-pulse'
                    }`}
                  />
                </div>
                <div className="text-xl font-semibold tracking-tight text-white mt-1">
                  {webhookEvents.length > 0 ? '🟢 Connected' : '🟡 Menunggu Event'}
                </div>
                <div className="text-[11px] text-zinc-500 font-normal mt-1">
                  {webhookEvents.length > 0 ? 'Siap menerima donasi' : 'Belum ada notifikasi'}
                </div>
              </div>

              {/* Events Received */}
              <div className="apple-card p-5 rounded-3xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-1">
                  <span>Events Received</span>
                  <Code className="w-4 h-4 text-[#2997ff]" />
                </div>
                <div className="text-3xl font-semibold tracking-tight text-white mt-1">{webhookEvents.length}</div>
                <div className="text-[11px] text-zinc-500 font-normal mt-1">
                  Total payload tercatat
                </div>
              </div>

              {/* Last Event Time */}
              <div className="apple-card p-5 rounded-3xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-1">
                  <span>Event Terakhir</span>
                  <Clock className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-base sm:text-lg font-semibold tracking-tight text-white mt-1 truncate">
                  {webhookEvents.length > 0
                    ? new Date(webhookEvents[0].created_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : 'Belum Ada'}
                </div>
                <div className="text-[11px] text-zinc-500 font-normal mt-1 truncate">
                  {webhookEvents.length > 0
                    ? new Date(webhookEvents[0].created_at).toLocaleDateString('id-ID')
                    : 'Menunggu koneksi'}
                </div>
              </div>

              {/* Queue Auto-Created */}
              <div className="apple-card p-5 rounded-3xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-1">
                  <span>Auto-Queue Masuk</span>
                  <ShieldCheck className="w-4 h-4 text-[#30d158]" />
                </div>
                <div className="text-3xl font-semibold tracking-tight text-white mt-1">
                  {donations.filter((d) => d.claimed_by_player_id).length}
                </div>
                <div className="text-[11px] text-zinc-500 font-normal mt-1">
                  Player langsung antri
                </div>
              </div>
            </div>

            {/* Webhook Credentials & Configuration Box (Section 10) */}
            <div className="apple-card p-6 rounded-3xl space-y-5">
              <div className="flex items-center justify-between border-b pb-3 border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#2997ff]/15 text-[#2997ff] border border-[#2997ff]/25">
                    Integrasi Webhook
                  </span>
                  <h3 className="font-semibold text-xs tracking-tight text-white">
                    Kredensial Webhook Streamer Anda
                  </h3>
                </div>
                <span className="text-xs text-zinc-500 font-mono">
                  ID: {settings?.user_id || 'streamer'}
                </span>
              </div>

              {/* Webhook URL Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Webhook URL (Pasang di Akun Sociabuzz)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="apple-input text-xs font-mono text-cyan-400 flex-1 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookUrl, 'webhook-url')}
                    className="apple-button-primary px-5 py-2.5 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedWebhookUrl ? (
                      <Check className="w-3.5 h-3.5 text-[#30d158]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedWebhookUrl ? 'URL Tersalin!' : 'Copy Webhook URL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 font-normal">
                  URL ini unik untuk akun streamer Anda, sehingga donasi penonton Anda tidak akan pernah bercampur dengan streamer lain.
                </p>
              </div>

              {/* Webhook Token / Secret Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Webhook Token / Signature Secret
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showWebhookSecret ? 'text' : 'password'}
                      readOnly
                      value={webhookSecret}
                      className="apple-input text-xs font-mono text-amber-300 w-full pr-10 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                      title={showWebhookSecret ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showWebhookSecret ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookSecret, 'webhook-secret')}
                    className="apple-button-secondary px-5 py-2.5 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedWebhookSecret ? (
                      <Check className="w-3.5 h-3.5 text-[#30d158]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedWebhookSecret ? 'Token Tersalin!' : 'Copy Webhook Token'}</span>
                  </button>
                </div>
              </div>

              {/* Step by Step Instructions Accordion/Box */}
              <div className="p-4 rounded-2xl text-xs space-y-2 bg-white/[0.02] border border-white/[0.06] text-zinc-300 font-normal">
                <div className="font-semibold text-[11px] text-zinc-400 uppercase tracking-wider">
                  Langkah Setting di Dashboard Sociabuzz:
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-zinc-400">
                  <li>
                    Login ke akun Sociabuzz Anda di <a href="https://sociabuzz.com" target="_blank" rel="noopener noreferrer" className="text-[#2997ff] hover:underline font-medium">sociabuzz.com</a>
                  </li>
                  <li>Buka menu <strong className="text-white">Settings</strong> → <strong className="text-white">Integrations</strong> → <strong className="text-white">Webhook</strong></li>
                  <li>Centang pilihan <strong className="text-white">Aktifkan Integrasi Webhook</strong></li>
                  <li>Tempelkan <strong className="text-white">Webhook URL</strong> di atas ke kolom yang disediakan</li>
                  <li>Tempelkan <strong className="text-white">Webhook Token</strong> di atas ke kolom token</li>
                  <li>Klik <strong className="text-white">Simpan</strong>, lalu klik tombol <strong className="text-white">Test Notifikasi</strong> untuk memverifikasi</li>
                </ol>
              </div>
            </div>

            {/* Diagnostic Webhook Logs Table (Section 11) */}
            <div className="apple-glass rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
              <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.02]">
                <div>
                  <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                    <Code className="w-4 h-4 text-[#2997ff]" />
                    <span>Diagnostic Webhook Logs</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-normal mt-0.5">
                    Data payload mentah yang diterima dari Sociabuzz saat penonton melakukan donasi atau Test Notifikasi.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchDashboard}
                    className="apple-button-secondary px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Logs</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="uppercase tracking-wider font-medium text-[11px] bg-white/[0.02] text-zinc-400 border-b border-white/[0.08]">
                    <tr>
                      <th className="py-3.5 px-4">Event ID</th>
                      <th className="py-3.5 px-4">Waktu</th>
                      <th className="py-3.5 px-4">Donor & Nominal</th>
                      <th className="py-3.5 px-4">ID Game Terdeteksi</th>
                      <th className="py-3.5 px-4">Status Pemrosesan</th>
                      <th className="py-3.5 px-4 text-center">Diagnostic Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                    {webhookEvents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <div className="max-w-md mx-auto space-y-2">
                            <Code className="w-8 h-8 mx-auto text-zinc-500 stroke-[1.5]" />
                            <div className="font-semibold text-sm text-white">Belum Ada Webhook Logs</div>
                            <p className="text-xs text-zinc-500 font-normal">
                              Klik tombol "Test Notifikasi (Simulator)" di atas untuk mencoba mengirim payload simulasi dan melihat diagnostik data di sini.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      webhookEvents.map((ev) => {
                        const rawBody = (ev.payload?.body as Record<string, unknown>) || {};
                        const extracted = (ev.payload?.extracted as Record<string, unknown>) || {};
                        const donor = String(extracted.donor_name || rawBody.donor_name || rawBody.donor || 'Anonim');
                        const amount = Number(extracted.amount || rawBody.amount || rawBody.nominal || 0);
                        const gameId = String(
                          rawBody.queue_input || rawBody.game_id || rawBody.id_game || rawBody.player_id || '-'
                        );

                        return (
                          <tr
                            key={ev.id}
                            className="hover:bg-white/[0.03] transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono text-xs text-zinc-300">{ev.external_event_id}</td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                              {new Date(ev.created_at).toLocaleString('id-ID')}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-white">{donor}</div>
                              {amount > 0 && (
                                <div className="text-[11px] font-mono text-amber-400 font-medium">
                                  Rp {amount.toLocaleString('id-ID')}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {gameId !== '-' ? (
                                <span className="px-2 py-0.5 rounded-full bg-[#2997ff]/10 text-[#2997ff] border border-[#2997ff]/20 text-xs">
                                  {gameId}
                                </span>
                              ) : (
                                <span className="text-zinc-500 italic text-[11px]">Tidak ada ID Game</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {ev.error ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/25">
                                  {ev.error.includes('Duplicate') ? 'DUPLICATE SKIPPED' : 'ERROR'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/25">
                                  <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                                  PROCESSED
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedWebhookLog(ev)}
                                className="apple-button-secondary px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer"
                              >
                                Lihat Raw Payload
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Diagnostic Payload Inspector Modal */}
            {selectedWebhookLog && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
                <div className="apple-glass border border-white/[0.14] text-white shadow-2xl rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden relative backdrop-blur-2xl">
                  <div className="p-4 flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Code className="w-5 h-5 text-[#2997ff]" />
                      <h3 className="font-semibold text-sm tracking-tight text-white">
                        Diagnostic Payload: {selectedWebhookLog.external_event_id}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedWebhookLog(null)}
                      className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                      <span className="text-zinc-500 font-sans font-medium">Event Timestamp:</span>
                      <span className="text-zinc-300">{new Date(selectedWebhookLog.created_at).toISOString()}</span>
                    </div>

                    <div>
                      <div className="font-sans font-medium text-xs text-zinc-400 mb-2">
                        JSON Payload Mentah dari Sociabuzz:
                      </div>
                      <pre className="p-4 rounded-2xl text-[11px] leading-relaxed overflow-x-auto bg-black/70 text-cyan-300 border border-white/[0.08]">
                        {JSON.stringify(selectedWebhookLog.payload, null, 2)}
                      </pre>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(selectedWebhookLog.payload, null, 2));
                          showNotification('Raw JSON tersalin ke clipboard!', 'success');
                        }}
                        className="apple-button-secondary px-4 py-2 rounded-full text-xs font-medium cursor-pointer"
                      >
                        Copy Raw JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedWebhookLog(null)}
                        className="apple-button-primary px-4 py-2 rounded-full text-xs font-medium cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PENGATURAN (SETTINGS) */}
        {activeTab === 'settings' && (
          <div className="p-6 space-y-6 max-w-4xl">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                Pengaturan Sistem & Tampilan
              </h2>
              <p className="text-xs text-zinc-400 font-normal mt-0.5">
                Sesuaikan gaya UI dashboard, link Sociabuzz, batas donasi, judul custom, dan PIN keamanan.
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-4 rounded-2xl text-xs font-medium flex items-center gap-2 bg-[#30d158]/15 border border-[#30d158]/25 text-[#30d158]">
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            {/* Theme Aesthetic Showcase: Apple Minimal Dark */}
            <div className="apple-card p-6 rounded-3xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-white/[0.08] text-white border border-white/[0.1]">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm tracking-tight text-white">
                      Tema UI: Apple Minimal Dark (Aktif)
                    </h3>
                    <p className="text-xs text-zinc-400 font-normal mt-0.5">
                      Obsidian deep canvas, frosted glassmorphism, hairline borders, dan aksen Apple SF Pro.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/25">
                  ✓ Cupertino Glass Active
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                <span className="text-[11px] font-medium">Palette Sistem Apple SF Pro:</span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2997ff]" /><span className="text-[11px] text-zinc-300">Blue</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#30d158]" /><span className="text-[11px] text-zinc-300">Green</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ffd60a]" /><span className="text-[11px] text-zinc-300">Amber</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ff453a]" /><span className="text-[11px] text-zinc-300">Red</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#bf5af2]" /><span className="text-[11px] text-zinc-300">Purple</span></span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Sociabuzz & Donasi Section */}
              <div className="apple-card p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-2xl bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/30">
                    <Coins className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm tracking-tight text-white">
                    Pengaturan Integrasi Sociabuzz
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Link Donasi Sociabuzz Anda
                  </label>
                  <input
                    type="url"
                    required
                    value={settingsForm.sociabuzz_url || ''}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, sociabuzz_url: e.target.value })
                    }
                    placeholder="https://sociabuzz.com/prostreamer"
                    className="apple-input text-xs font-mono w-full"
                  />
                  <span className="text-[11px] text-zinc-500 font-normal mt-1 block">
                    Link ini yang ditampilkan ke viewer dan tombol donasi cepat.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Min Donasi Regular
                    </label>
                    <input
                      type="number"
                      step={1000}
                      value={settingsForm.min_donation ?? 10000}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, min_donation: Number(e.target.value) })
                      }
                      className="apple-input text-xs font-mono w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#bf5af2] mb-1">
                      Min Donasi VIP
                    </label>
                    <input
                      type="number"
                      step={1000}
                      value={settingsForm.vip_min_donation ?? 25000}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          vip_min_donation: Number(e.target.value),
                        })
                      }
                      className="apple-input text-xs font-mono w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#ffd60a] mb-1">
                      Min Donasi VVIP
                    </label>
                    <input
                      type="number"
                      step={1000}
                      value={settingsForm.vvip_min_donation ?? 50000}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          vvip_min_donation: Number(e.target.value),
                        })
                      }
                      className="apple-input text-xs font-mono w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="free_queue"
                    checked={settingsForm.allow_free_queue || false}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, allow_free_queue: e.target.checked })
                    }
                    className="w-4 h-4 rounded cursor-pointer accent-[#2997ff]"
                  />
                  <label
                    htmlFor="free_queue"
                    className="text-xs font-normal text-zinc-300 cursor-pointer"
                  >
                    Izinkan antrian gratis (tanpa kode donasi Sociabuzz)
                  </label>
                </div>
              </div>

              {/* Overlay Appearance Section */}
              <div className="apple-card p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-2xl bg-[#2997ff]/20 text-[#2997ff] border border-[#2997ff]/30">
                    <Tv className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm tracking-tight text-white">
                    Kustomisasi Judul & Tampilan Overlay OBS
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Custom Title Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-zinc-300">
                        Judul Overlay (Tulis Sendiri / Bebas)
                      </label>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-[#2997ff] border border-white/[0.08]">
                        Atas Tengah
                      </span>
                    </div>
                    <input
                      type="text"
                      value={settingsForm.title || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
                      placeholder="Contoh: ANTRIAN BY1"
                      className="apple-input text-xs w-full"
                    />
                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <span className="text-[10px] text-zinc-500 mr-1">
                        Preset:
                      </span>
                      {['ANTRIAN BY1', 'ANTRIAN 1V1', 'ROOM BY 1', 'LIVE DUEL BY1'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSettingsForm({ ...settingsForm, title: preset })}
                          className={`px-2.5 py-1 rounded-full text-[10px] transition-all cursor-pointer ${
                            settingsForm.title === preset
                              ? 'bg-white text-black font-semibold shadow-sm'
                              : 'apple-button-secondary text-zinc-400'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme Selector */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Tema Visual Kartu Overlay
                    </label>
                    <select
                      value={settingsForm.theme || 'obsidian'}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          theme: e.target.value as OverlaySettings['theme'],
                        })
                      }
                      className="apple-input text-xs w-full bg-zinc-900 border border-white/[0.1] text-white"
                    >
                      <option value="obsidian">React Bits Dark (Signature Style)</option>
                      <option value="cyber">Cyberpunk React Bits</option>
                      <option value="crimson">Crimson Duel</option>
                      <option value="imperial">Imperial Gold</option>
                      <option value="purple">Royal Amethyst</option>
                      <option value="minimal">Charcoal Minimal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Ukuran Font
                    </label>
                    <select
                      value={settingsForm.font_size || 'medium'}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          font_size: e.target.value as OverlaySettings['font_size'],
                        })
                      }
                      className="apple-input text-xs w-full bg-zinc-900 border border-white/[0.1] text-white"
                    >
                      <option value="small">Kecil (Compact)</option>
                      <option value="medium">Sedang (Standard 1080p)</option>
                      <option value="large">Besar (Big Screen)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Ukuran Card
                    </label>
                    <select
                      value={settingsForm.card_size || 'normal'}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          card_size: e.target.value as OverlaySettings['card_size'],
                        })
                      }
                      className="apple-input text-xs w-full bg-zinc-900 border border-white/[0.1] text-white"
                    >
                      <option value="compact">Rapat (Compact)</option>
                      <option value="normal">Normal</option>
                      <option value="spacious">Lebar (Spacious)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Maksimal Player Tampil di Overlay
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={12}
                      value={settingsForm.max_visible_players ?? 5}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          max_visible_players: Number(e.target.value),
                        })
                      }
                      className="apple-input text-xs font-mono w-full"
                    />
                  </div>
                </div>

                {/* Opacity Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-300 mb-1.5">
                    <span>Transparansi Background Overlay</span>
                    <span className="font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-[#2997ff]">
                      {settingsForm.opacity ?? 96}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={70}
                    max={100}
                    value={settingsForm.opacity ?? 96}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, opacity: Number(e.target.value) })
                    }
                    className="w-full accent-white cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-normal mt-1">
                    <span>Sedikit Transparan (70%)</span>
                    <span>Solid Gelap Rekomendasi (96% - 100%)</span>
                  </div>
                </div>

                {/* Spacing Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-300 mb-1.5">
                    <span>Jarak Spacing Antar Card (px)</span>
                    <span className="font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-[#30d158]">
                      {settingsForm.spacing ?? 8}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={20}
                    value={settingsForm.spacing ?? 8}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, spacing: Number(e.target.value) })
                    }
                    className="w-full accent-white cursor-pointer"
                  />
                </div>

                {/* Audio alert */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="sound_alert"
                    checked={settingsForm.sound_alert ?? true}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, sound_alert: e.target.checked })
                    }
                    className="w-4 h-4 rounded cursor-pointer accent-[#2997ff]"
                  />
                  <label
                    htmlFor="sound_alert"
                    className="text-xs font-normal text-zinc-300 cursor-pointer flex items-center gap-1.5"
                  >
                    <Volume2 className="w-4 h-4 text-[#ffd60a]" />
                    <span>Nyalakan notifikasi audio otomatis saat giliran match berganti</span>
                  </label>
                </div>

                {/* Panel Width & Border Radius Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.08]">
                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-300 mb-1">
                      <span>Lebar Panel Overlay (Width)</span>
                      <span className="font-mono text-[#2997ff]">
                        {settingsForm.panel_width ?? 440}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={340}
                      max={600}
                      value={settingsForm.panel_width ?? 440}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, panel_width: Number(e.target.value) })
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-300 mb-1">
                      <span>Lengkungan Sudut (Border Radius)</span>
                      <span className="font-mono text-[#2997ff]">
                        {settingsForm.border_radius ?? 22}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={32}
                      value={settingsForm.border_radius ?? 22}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, border_radius: Number(e.target.value) })
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>
                </div>

                {/* Badge & Details Toggles (Section 16) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="show_id"
                      checked={settingsForm.show_id !== false}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, show_id: e.target.checked })
                      }
                      className="w-4 h-4 rounded cursor-pointer accent-[#2997ff]"
                    />
                    <label htmlFor="show_id" className="text-xs font-normal text-zinc-300 cursor-pointer">
                      Tampilkan ID Game
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="show_vip_badge"
                      checked={settingsForm.show_vip_badge !== false}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, show_vip_badge: e.target.checked })
                      }
                      className="w-4 h-4 rounded cursor-pointer accent-[#2997ff]"
                    />
                    <label htmlFor="show_vip_badge" className="text-xs font-normal text-zinc-300 cursor-pointer">
                      Tampilkan Badge VIP / VVIP
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="show_live_badge"
                      checked={settingsForm.show_live_badge !== false}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, show_live_badge: e.target.checked })
                      }
                      className="w-4 h-4 rounded cursor-pointer accent-[#2997ff]"
                    />
                    <label htmlFor="show_live_badge" className="text-xs font-normal text-zinc-300 cursor-pointer">
                      Tampilkan Indikator LIVE
                    </label>
                  </div>
                </div>

                {/* Animation Settings (Section 16) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="enable_animation"
                      checked={settingsForm.enable_animation !== false}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, enable_animation: e.target.checked })
                      }
                      className="w-4 h-4 rounded cursor-pointer accent-[#2997ff]"
                    />
                    <label htmlFor="enable_animation" className="text-xs font-normal text-zinc-300 cursor-pointer">
                      Aktifkan Animasi Transisi Card
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Kecepatan Animasi
                    </label>
                    <select
                      value={settingsForm.animation_speed || 'normal'}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          animation_speed: e.target.value as 'slow' | 'normal' | 'fast',
                        })
                      }
                      className="apple-input text-xs w-full bg-zinc-900 border border-white/[0.1] text-white"
                    >
                      <option value="slow">Lambat (Smooth Cinematic)</option>
                      <option value="normal">Standar (Optimal OBS)</option>
                      <option value="fast">Cepat (Snappy)</option>
                    </select>
                  </div>
                </div>

                {/* Hide currently playing player from queue overlay */}
                <div className="flex items-start gap-3 pt-2 border-t border-white/[0.08]">
                  <input
                    type="checkbox"
                    id="hide_playing_in_overlay"
                    checked={settingsForm.hide_playing_in_overlay || false}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, hide_playing_in_overlay: e.target.checked })
                    }
                    className="w-4 h-4 rounded cursor-pointer accent-[#2997ff] mt-0.5"
                  />
                  <div>
                    <label
                      htmlFor="hide_playing_in_overlay"
                      className="text-xs font-normal text-zinc-300 cursor-pointer flex items-center gap-1.5"
                    >
                      <Users className="w-4 h-4 text-zinc-400" />
                      <span>Sembunyikan player yang sedang main dari overlay (Hanya tampilkan antrian menunggu)</span>
                    </label>
                    <p className="text-[11px] text-zinc-500 font-normal mt-0.5">
                      Jika dimatikan (rekomendasi), pemain yang sedang bertanding akan tampil di posisi #1 dengan indikator 🔴 LIVE, diikuti pemain berikutnya di bawahnya.
                    </p>
                  </div>
                </div>

                {/* Platform Promotion Banner Toggle */}
                <div className="flex items-start gap-3 pt-2 border-t border-white/[0.08]">
                  <input
                    type="checkbox"
                    id="allow_promotion"
                    checked={settingsForm.allow_promotion || false}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, allow_promotion: e.target.checked })
                    }
                    className="w-4 h-4 rounded cursor-pointer accent-[#2997ff] mt-0.5"
                  />
                  <div>
                    <label
                      htmlFor="allow_promotion"
                      className="text-xs font-normal text-zinc-300 cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-[#ffd60a]" />
                      <span>Tampilkan Platform Promotion Banner di Overlay OBS</span>
                    </label>
                    <p className="text-[11px] text-zinc-500 font-normal mt-0.5">
                      Jika diaktifkan, banner promosi resmi platform akan tampil secara halus di bagian bawah overlay tanpa mengganggu antrian.
                    </p>
                  </div>
                </div>
              </div>

              {/* BAGIAN PENGATURAN BARU: CUSTOMISASI WARNA OVERLAY */}
              <OverlayColorCustomizer
                colors={settingsForm.custom_colors || settings?.custom_colors || DEFAULT_OVERLAY_COLORS}
                onChange={handleColorsChange}
                onReset={handleResetColors}
                onSave={() => handleSaveSettings()}
                isSaving={savingSettings}
                saveSuccess={settingsSuccess}
                isLight={isLight}
              />

              <button
                type="submit"
                disabled={savingSettings}
                className="apple-button-primary w-full py-3.5 rounded-full font-medium text-xs tracking-tight transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingSettings ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
              </button>
            </form>

            {/* Token & Security Section */}
            <div className="apple-card p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm tracking-tight text-white">
                  Keamanan & Token Overlay
                </h3>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div>
                  <div className="text-xs font-semibold text-white">Regenerate Token Overlay</div>
                  <div className="text-[11px] text-zinc-400 font-normal mt-0.5">
                    Jika URL OBS Anda bocor saat streaming, Anda dapat membuat token baru seketika.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegenerateModal(true)}
                  className="apple-button-secondary px-4 py-2 rounded-full text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-600 transition-all cursor-pointer"
                >
                  Regenerate
                </button>
              </div>

              {/* PIN Change */}
              <form onSubmit={handleUpdatePin} className="space-y-3 pt-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Ganti PIN Admin Streamer
                </label>
                {pinSuccess && (
                  <div className="text-[#30d158] font-medium text-xs">✓ {pinSuccess}</div>
                )}
                <div className="flex items-center gap-2.5">
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="PIN baru (minimal 4 karakter)"
                    className="apple-input text-xs font-mono flex-1"
                  />
                  <button
                    type="submit"
                    className="apple-button-primary px-5 py-2.5 rounded-full text-xs font-medium transition-all cursor-pointer"
                  >
                    Simpan PIN
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 7: PLATFORM ADMIN PANEL */}
        {activeTab === 'admin' && user?.role === 'admin' && (
          <div className="p-6 sm:p-8 space-y-6 max-w-6xl mx-auto">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2997ff]/20 text-[#2997ff] border border-[#2997ff]/30">
                  PLATFORM OWNER
                </span>
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  Admin Platform Panel
                </h1>
              </div>
              <p className="text-xs text-zinc-400 font-normal">
                Kelola iklan promosi global, pantau statistik SaaS, dan lihat audit platform streamer.
              </p>
            </div>

            {/* Platform Analytics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="apple-card p-4 rounded-2xl">
                <div className="text-[10px] font-medium text-zinc-400 uppercase">Total Streamer</div>
                <div className="text-xl font-bold text-white mt-1">
                  {platformAnalytics?.total_streamers ?? registeredUsers.length ?? 0}
                </div>
              </div>
              <div className="apple-card p-4 rounded-2xl">
                <div className="text-[10px] font-medium text-zinc-400 uppercase">Streamer Aktif</div>
                <div className="text-xl font-bold text-[#30d158] mt-1">
                  {platformAnalytics?.active_streamers ?? 0}
                </div>
              </div>
              <div className="apple-card p-4 rounded-2xl">
                <div className="text-[10px] font-medium text-zinc-400 uppercase">Total Queue</div>
                <div className="text-xl font-bold text-[#2997ff] mt-1">
                  {platformAnalytics?.total_queue_players ?? 0}
                </div>
              </div>
              <div className="apple-card p-4 rounded-2xl">
                <div className="text-[10px] font-medium text-zinc-400 uppercase">Total Donasi</div>
                <div className="text-xl font-bold text-[#ffd60a] mt-1">
                  {platformAnalytics?.total_donations_count ?? 0}
                </div>
              </div>
              <div className="apple-card p-4 rounded-2xl">
                <div className="text-[10px] font-medium text-zinc-400 uppercase">Nominal Donasi</div>
                <div className="text-xs font-bold text-amber-300 mt-1 truncate">
                  Rp {(platformAnalytics?.total_donations_amount ?? 0).toLocaleString('id-ID')}
                </div>
              </div>
              <div className="apple-card p-4 rounded-2xl">
                <div className="text-[10px] font-medium text-zinc-400 uppercase">Webhook Events</div>
                <div className="text-xl font-bold text-purple-400 mt-1">
                  {platformAnalytics?.total_webhook_events ?? 0}
                </div>
              </div>
            </div>

            {/* Promotion Banner Management Form */}
            <form onSubmit={handleSavePromotion} className="apple-card p-6 rounded-3xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#ffd60a]/20 text-[#ffd60a] flex items-center justify-center border border-[#ffd60a]/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm tracking-tight text-white">
                      Pengaturan Platform Promotion Banner
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Banner ini akan tampil di overlay OBS streamer yang mengaktifkan opsi promosi platform.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promotionForm.enabled}
                    onChange={(e) =>
                      setPromotionForm({ ...promotionForm, enabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#30d158]"></div>
                  <span className="ml-2.5 text-xs font-medium text-white">
                    {promotionForm.enabled ? 'Status: AKTIF' : 'Status: NONAKTIF'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Judul Promosi / Produk
                  </label>
                  <input
                    type="text"
                    required
                    value={promotionForm.title}
                    onChange={(e) =>
                      setPromotionForm({ ...promotionForm, title: e.target.value })
                    }
                    placeholder="Contoh: 🔥 PRODUK TERBARU"
                    className="apple-input text-xs w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Target Link URL
                  </label>
                  <input
                    type="url"
                    required
                    value={promotionForm.link_url}
                    onChange={(e) =>
                      setPromotionForm({ ...promotionForm, link_url: e.target.value })
                    }
                    placeholder="https://antrian1v1.com/produk"
                    className="apple-input text-xs font-mono w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Deskripsi Singkat Banner
                </label>
                <textarea
                  rows={2}
                  required
                  value={promotionForm.description}
                  onChange={(e) =>
                    setPromotionForm({ ...promotionForm, description: e.target.value })
                  }
                  placeholder="Cek produk dan penawaran eksklusif live stream kami sekarang!"
                  className="apple-input text-xs w-full"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPromotion}
                  className="apple-button-primary py-2.5 px-6 rounded-full text-xs font-medium tracking-tight cursor-pointer disabled:opacity-50"
                >
                  {savingPromotion ? 'Menyimpan...' : 'Simpan & Siarkan Promosi Platform'}
                </button>
              </div>
            </form>

            {/* Registered Streamers List */}
            <div className="apple-card p-6 rounded-3xl space-y-4">
              <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2997ff]" />
                <span>Daftar Akun Streamer Terdaftar ({registeredUsers.length})</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-zinc-400 font-medium">
                      <th className="pb-2.5 pl-2">Pengguna</th>
                      <th className="pb-2.5">Email Google</th>
                      <th className="pb-2.5">Role</th>
                      <th className="pb-2.5 pr-2">Tanggal Terdaftar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {registeredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-zinc-500">
                          Belum ada data akun terdaftar.
                        </td>
                      </tr>
                    ) : (
                      registeredUsers.map((u) => (
                        <tr key={u.id} className="text-zinc-200">
                          <td className="py-2.5 pl-2 font-semibold text-white">{u.name}</td>
                          <td className="py-2.5 font-mono text-zinc-400">{u.email}</td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.role === 'admin'
                                  ? 'bg-[#2997ff]/20 text-[#2997ff]'
                                  : 'bg-white/10 text-zinc-300'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-2.5 pr-2 text-zinc-400 text-[11px]">
                            {new Date(u.created_at).toLocaleDateString('id-ID')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          uiTheme={uiTheme}
          onClose={() => setEditingPlayer(null)}
          onSave={handleSavePlayerEdit}
        />
      )}

      {showAddModal && (
        <AddPlayerModal
          uiTheme={uiTheme}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddPlayer}
        />
      )}

      {showSimModal && (
        <SociabuzzSimulatorModal
          uiTheme={uiTheme}
          onClose={() => setShowSimModal(false)}
          onSimulate={handleSimulateDonation}
        />
      )}

      {/* Security Confirmation Modal for OBS Token Regeneration */}
      {showRegenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="apple-glass border border-white/[0.14] text-white shadow-2xl rounded-3xl max-w-md w-full p-6 space-y-5 relative backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-[#ffd60a] shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-base tracking-tight text-white">
                  Buat Ulang Token OBS Overlay?
                </h3>
                <p className="text-xs text-zinc-400 font-normal mt-0.5">
                  Konfirmasi keamanan sebelum mengganti token
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
              <p className="font-semibold text-amber-300">⚠️ PERINGATAN KEAMANAN:</p>
              <p className="leading-relaxed text-zinc-300">
                Membuat token baru akan <strong className="text-white">LANGSUNG MENCABUT AKSE</strong> link OBS Browser Source saat ini. URL overlay lama Anda tidak akan dapat digunakan lagi di OBS Studio.
              </p>
              <p className="text-[11px] text-zinc-400">
                Setelah token baru dibuat, Anda wajib menyalin URL baru dan memperbaruinya di OBS Studio Anda.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isRegeneratingToken}
                onClick={() => setShowRegenerateModal(false)}
                className="apple-button-secondary px-4 py-2.5 rounded-full text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isRegeneratingToken}
                onClick={handleConfirmRegenerateToken}
                className="apple-button-primary px-5 py-2.5 rounded-full text-xs font-medium bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 cursor-pointer shadow-lg"
              >
                {isRegeneratingToken ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ya, Buat Token Baru</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
