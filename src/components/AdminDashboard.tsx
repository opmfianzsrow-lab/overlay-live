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
} from 'lucide-react';
import type {
  QueueItem,
  Donation,
  OverlaySettings,
  ActivityLog,
  QueueStats,
  Player,
  MembershipType,
} from '../types/queue';
import { EditPlayerModal } from './modals/EditPlayerModal';
import { AddPlayerModal } from './modals/AddPlayerModal';
import { SociabuzzSimulatorModal } from './modals/SociabuzzSimulatorModal';
import { OverlayView } from './OverlayView';

interface AdminDashboardProps {
  adminPin: string;
  onLogout: () => void;
}

type TabType = 'dashboard' | 'queue' | 'donations' | 'overlay' | 'settings';
type UiThemeType = 'neobrutalism' | 'dark';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminPin, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [settings, setSettings] = useState<OverlaySettings | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // UI Theme state (Neobrutalism vs Dark Esports)
  const [uiTheme, setUiTheme] = useState<UiThemeType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_ui_theme');
      if (saved === 'dark' || saved === 'neobrutalism') return saved;
    }
    return 'neobrutalism';
  });

  // Copy feedback state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDonation, setCopiedDonation] = useState(false);
  const [copiedJoin, setCopiedJoin] = useState(false);

  // Modals state
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<Partial<OverlaySettings>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // PIN change state
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

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
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Operasi gagal.');
      }
      return res.json();
    },
    [adminPin]
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

  // Fetch full dashboard
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { 'x-admin-pin': adminPin },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      setSettings(data.settings);
      setSettingsForm(data.settings);
      setQueue(data.queue);
      setDonations(data.donations);
      setStats(data.stats);
      setLogs(data.logs);

      // If user has not manually overridden theme locally, respect server setting
      if (data.settings?.dashboard_ui_theme && !localStorage.getItem('dashboard_ui_theme')) {
        setUiTheme(data.settings.dashboard_ui_theme);
      }
    } catch (e) {
      console.error('Error fetching dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, [adminPin, onLogout]);

  // Initial load + Realtime SSE listener
  useEffect(() => {
    fetchDashboard();

    const eventSource = new EventSource(`/api/realtime?pin=${encodeURIComponent(adminPin)}`);

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
      } catch (err) {
        console.error('Error parsing admin queue_update SSE:', err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [adminPin, fetchDashboard]);

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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess('');
    try {
      const res = await callAdminApi('/api/admin/settings', settingsForm);
      setSettings(res.settings);
      setSettingsSuccess('Pengaturan berhasil disimpan!');
      showNotification('Pengaturan berhasil disimpan!', 'success');
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err: unknown) {
      showNotification(
        err instanceof Error ? err.message : 'Gagal menyimpan pengaturan',
        'error'
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRegenerateToken = async () => {
    try {
      const res = await callAdminApi('/api/admin/settings/regenerate-token');
      if (settings) {
        setSettings({ ...settings, streamer_token: res.token });
      }
      showNotification('Token OBS baru berhasil dibuat: ' + res.token, 'success');
      fetchDashboard();
    } catch (err: unknown) {
      showNotification(
        err instanceof Error ? err.message : 'Gagal regenerate token',
        'error'
      );
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
  const domain = typeof window !== 'undefined' ? window.location.origin : 'https://DOMAIN';
  const overlayUrl = `${domain}/overlay/${settings?.streamer_token || 'TOKEN'}`;
  const joinUrl = `${domain}/join`;
  const sociabuzzUrl = settings?.sociabuzz_url || 'https://sociabuzz.com/prostreamer';

  const copyToClipboard = (text: string, type: 'overlay' | 'sociabuzz' | 'join') => {
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
    }
  };

  const isNeo = uiTheme === 'neobrutalism';

  if (loading && !settings) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center font-black ${
          isNeo ? 'bg-[#F5F2EB] text-black' : 'bg-zinc-950 text-white'
        }`}
      >
        <div
          className={`p-6 rounded-2xl flex items-center gap-3 ${
            isNeo
              ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
              : 'bg-zinc-900 border border-zinc-800'
          }`}
        >
          <RefreshCw className="w-6 h-6 animate-spin text-current" />
          <span>MEMUAT DASHBOARD STREAMER...</span>
        </div>
      </div>
    );
  }

  const playingItem = queue.find((q) => q.status === 'PLAYING');
  const queuedItems = queue.filter((q) => q.status === 'QUEUED');
  const nextItem = queuedItems[0] || null;

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-200 relative ${
        isNeo
          ? 'bg-[#F5F2EB] text-black selection:bg-[#FFE600] selection:text-black'
          : 'bg-zinc-950 text-zinc-100 selection:bg-red-600 selection:text-white'
      }`}
    >
      {/* Global In-App Notification Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] max-w-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
              isNeo
                ? `border-[2.5px] border-black shadow-[4px_4px_0px_0px_#000] text-black ${
                    toast.type === 'success'
                      ? 'bg-[#4EFE82]'
                      : toast.type === 'error'
                      ? 'bg-[#FF4D4D] text-white'
                      : 'bg-[#FFE600]'
                  }`
                : `border shadow-2xl backdrop-blur-md ${
                    toast.type === 'success'
                      ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
                      : toast.type === 'error'
                      ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
                      : 'bg-zinc-900/95 border-zinc-700 text-zinc-200'
                  }`
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 stroke-[2.5]" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 shrink-0 stroke-[2.5]" />
            ) : (
              <Sparkles className="w-5 h-5 shrink-0 stroke-[2.5]" />
            )}
            <p className="text-xs font-black tracking-wide leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-auto text-xs font-black opacity-70 hover:opacity-100 cursor-pointer px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`w-full md:w-68 flex flex-col justify-between shrink-0 z-20 transition-colors duration-200 ${
          isNeo ? 'bg-white border-r-[3px] border-black' : 'bg-zinc-900/90 border-r border-zinc-800'
        }`}
      >
        <div>
          {/* Logo / Brand Header */}
          <div
            className={`p-5 flex items-center gap-3 ${
              isNeo
                ? 'border-b-[3px] border-black bg-[#FFE600]'
                : 'border-b border-zinc-800 bg-zinc-950/40'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isNeo
                  ? 'bg-[#FF4D4D] border-2 border-black text-white shadow-[3px_3px_0px_0px_#000]'
                  : 'bg-red-600/20 border border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
              }`}
            >
              <Swords className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-black text-lg tracking-tight uppercase leading-tight">
                1v1 STREAMER
              </h2>
              <span
                className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  isNeo
                    ? 'bg-black text-[#FFE600] border border-black shadow-[1.5px_1.5px_0px_0px_#000]'
                    : 'text-red-400 bg-red-950/60 border border-red-500/30'
                }`}
              >
                Control Hub ★
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3.5 space-y-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? isNeo
                    ? 'bg-[#FFE600] text-black border-2 border-black shadow-[4px_4px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                    : 'bg-red-600 text-white shadow-lg shadow-red-950/40'
                  : isNeo
                  ? 'bg-white text-black hover:bg-zinc-100 border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 stroke-[2.5]" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'queue'
                  ? isNeo
                    ? 'bg-[#00E5FF] text-black border-2 border-black shadow-[4px_4px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                    : 'bg-red-600 text-white shadow-lg shadow-red-950/40'
                  : isNeo
                  ? 'bg-white text-black hover:bg-zinc-100 border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 stroke-[2.5]" />
                <span>Antrian 1v1</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                  isNeo ? 'bg-black text-white border border-black' : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {queue.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('donations')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'donations'
                  ? isNeo
                    ? 'bg-[#4EFE82] text-black border-2 border-black shadow-[4px_4px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                    : 'bg-red-600 text-white shadow-lg shadow-red-950/40'
                  : isNeo
                  ? 'bg-white text-black hover:bg-zinc-100 border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Coins className="w-4 h-4 stroke-[2.5]" />
                <span>Donasi Sociabuzz</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                  isNeo
                    ? 'bg-[#FFE600] text-black border border-black'
                    : 'bg-zinc-800 text-amber-400'
                }`}
              >
                {donations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('overlay')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'overlay'
                  ? isNeo
                    ? 'bg-[#FF5B89] text-white border-2 border-black shadow-[4px_4px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                    : 'bg-red-600 text-white shadow-lg shadow-red-950/40'
                  : isNeo
                  ? 'bg-white text-black hover:bg-zinc-100 border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
              }`}
            >
              <Tv className="w-4 h-4 stroke-[2.5]" />
              <span>OBS Overlay</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? isNeo
                    ? 'bg-[#A259FF] text-white border-2 border-black shadow-[4px_4px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                    : 'bg-red-600 text-white shadow-lg shadow-red-950/40'
                  : isNeo
                  ? 'bg-white text-black hover:bg-zinc-100 border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
              }`}
            >
              <SettingsIcon className="w-4 h-4 stroke-[2.5]" />
              <span>Pengaturan</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div
          className={`p-4 space-y-2.5 ${
            isNeo ? 'border-t-[3px] border-black bg-zinc-50' : 'border-t border-zinc-800 bg-zinc-950/30'
          }`}
        >
          {/* Quick Viewer Join Link Box */}
          <div
            className={`p-3 rounded-xl text-xs ${
              isNeo
                ? 'bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000]'
                : 'bg-zinc-800/70 border border-zinc-700/60'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-black text-[10px] uppercase">Link Viewer</span>
              <button
                onClick={() => copyToClipboard(joinUrl, 'join')}
                className={`px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 cursor-pointer ${
                  isNeo
                    ? 'bg-[#00E5FF] hover:bg-[#00D0E8] text-black border border-black shadow-[1.5px_1.5px_0px_0px_#000]'
                    : 'text-cyan-400 hover:text-cyan-300'
                }`}
              >
                {copiedJoin ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedJoin ? 'Tersalin' : 'Copy'}</span>
              </button>
            </div>
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-mono font-bold text-[11px] truncate block ${
                isNeo ? 'text-black hover:underline' : 'text-zinc-300 hover:text-white'
              }`}
            >
              /join
            </a>
          </div>

          <button
            onClick={onLogout}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isNeo
                ? 'bg-white hover:bg-[#FF4D4D] hover:text-white text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-red-400'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Kunci Dashboard</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto max-h-screen">
        {/* Top Header Bar */}
        <header
          className={`px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 transition-colors duration-200 ${
            isNeo
              ? 'bg-white border-b-[3px] border-black shadow-[0_4px_0_0_#000]'
              : 'bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md'
          }`}
        >
          {/* Sociabuzz Quick Copy Box */}
          <div
            className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl ${
              isNeo
                ? 'bg-[#FFFDE8] border-2 border-black shadow-[3px_3px_0px_0px_#000]'
                : 'bg-black/40 border border-amber-500/30'
            }`}
          >
            <span
              className={`px-1.5 py-0.5 font-black text-[10px] rounded uppercase ${
                isNeo ? 'bg-black text-[#FFE600]' : 'text-amber-300'
              }`}
            >
              Sociabuzz
            </span>
            <span
              className={`text-xs font-mono font-bold truncate max-w-[200px] sm:max-w-xs ${
                isNeo ? 'text-black' : 'text-zinc-300'
              }`}
            >
              {sociabuzzUrl}
            </span>
            <button
              onClick={() => copyToClipboard(sociabuzzUrl, 'sociabuzz')}
              className={`ml-1 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                isNeo
                  ? 'bg-[#FFE600] hover:bg-[#FFD700] text-black border border-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                  : 'bg-amber-400 hover:bg-amber-300 text-black shadow-sm'
              }`}
            >
              {copiedDonation ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedDonation ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          {/* Quick Header Actions: UI Style Switcher & Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 2-Option UI Style Switcher Button */}
            <button
              onClick={() => handleToggleUiTheme()}
              title="Ganti Gaya Tampilan UI Dashboard (Neobrutalism vs Dark Esports)"
              className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                isNeo
                  ? 'bg-[#FFE600] hover:bg-[#FFD700] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 shadow-sm'
              }`}
            >
              {isNeo ? (
                <>
                  <Palette className="w-4 h-4 stroke-[2.5]" />
                  <span>UI: Neobrutalism (Ganti ke Dark 🌙)</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-cyan-400" />
                  <span>UI: Obsidian Dark (Ganti ke Neo 🎨)</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowSimModal(true)}
              className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                isNeo
                  ? 'bg-[#00E5FF] hover:bg-[#00D0E8] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Simulasi</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                isNeo
                  ? 'bg-[#4EFE82] hover:bg-[#3de870] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Tambah Player</span>
            </button>
          </div>
        </header>

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="p-6 space-y-6">
            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Antrian */}
              <div
                className={`p-5 rounded-2xl transition-all ${
                  isNeo
                    ? 'bg-[#00E5FF] border-[3px] border-black shadow-[5px_5px_0px_0px_#000] text-black'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black uppercase mb-1">
                  <span>Total Antrian</span>
                  <Users className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="text-3xl font-black">{stats?.total_queued ?? queue.length}</div>
                <div className={`text-[11px] font-bold mt-0.5 ${isNeo ? 'text-zinc-800' : 'text-zinc-500'}`}>
                  Menunggu giliran
                </div>
              </div>

              {/* Sedang Bermain */}
              <div
                className={`p-5 rounded-2xl transition-all ${
                  isNeo
                    ? 'bg-[#FF5B89] border-[3px] border-black shadow-[5px_5px_0px_0px_#000] text-white'
                    : 'bg-zinc-900 border border-zinc-800 text-red-400 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black uppercase mb-1">
                  <span>Sedang Bermain</span>
                  <Radio className="w-5 h-5 stroke-[2.5] animate-pulse" />
                </div>
                <div className="text-3xl font-black truncate">
                  {playingItem ? playingItem.player.name : 'KOSONG'}
                </div>
                <div className={`text-[11px] font-bold mt-0.5 truncate ${isNeo ? 'text-white/90' : 'text-zinc-500'}`}>
                  {playingItem ? `ID: ${playingItem.player.game_id}` : 'Belum ada player aktif'}
                </div>
              </div>

              {/* Selesai Hari Ini */}
              <div
                className={`p-5 rounded-2xl transition-all ${
                  isNeo
                    ? 'bg-[#4EFE82] border-[3px] border-black shadow-[5px_5px_0px_0px_#000] text-black'
                    : 'bg-zinc-900 border border-zinc-800 text-emerald-400 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black uppercase mb-1">
                  <span>Selesai Hari Ini</span>
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="text-3xl font-black">{stats?.done_today ?? 0}</div>
                <div className={`text-[11px] font-bold mt-0.5 ${isNeo ? 'text-zinc-800' : 'text-zinc-500'}`}>
                  Pertandingan rampung
                </div>
              </div>

              {/* Total Donasi */}
              <div
                className={`p-5 rounded-2xl transition-all ${
                  isNeo
                    ? 'bg-[#FFE600] border-[3px] border-black shadow-[5px_5px_0px_0px_#000] text-black'
                    : 'bg-zinc-900 border border-zinc-800 text-amber-400 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black uppercase mb-1">
                  <span>Donasi Hari Ini</span>
                  <Coins className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="text-2xl sm:text-3xl font-black">
                  Rp {(stats?.total_donations_today ?? 0).toLocaleString('id-ID')}
                </div>
                <div className={`text-[11px] font-bold mt-0.5 ${isNeo ? 'text-zinc-800' : 'text-zinc-500'}`}>
                  Dari Sociabuzz
                </div>
              </div>
            </div>

            {/* Match Spotlight Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Player Card */}
              <div
                className={`rounded-2xl overflow-hidden ${
                  isNeo
                    ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
                    : 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-[#1e0f11] border border-red-500/30 shadow-xl'
                }`}
              >
                <div
                  className={`px-5 py-3.5 flex items-center justify-between ${
                    isNeo
                      ? 'bg-[#FF4D4D] border-b-[2.5px] border-black text-white'
                      : 'border-b border-white/10 bg-black/40 text-red-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                    <span className="font-black text-xs uppercase tracking-wider">
                      Sedang Bermain (LIVE)
                    </span>
                  </div>
                  {playingItem && (
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase ${
                        isNeo
                          ? 'bg-black text-white border border-black shadow-[1.5px_1.5px_0px_0px_#000]'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      #{playingItem.position}
                    </span>
                  )}
                </div>

                <div className="p-5">
                  {playingItem ? (
                    <div className="space-y-4">
                      <div>
                        <div
                          className={`text-3xl font-black tracking-tight ${
                            isNeo ? 'text-black' : 'text-white'
                          }`}
                        >
                          {playingItem.player.name}
                        </div>
                        <div
                          className={`font-mono text-sm mt-0.5 ${
                            isNeo ? 'text-zinc-700 font-bold' : 'text-zinc-400'
                          }`}
                        >
                          ID: {playingItem.player.game_id}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                              isNeo
                                ? `border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] ${
                                    playingItem.player.membership === 'VVIP'
                                      ? 'bg-[#FFE600] text-black'
                                      : playingItem.player.membership === 'VIP'
                                      ? 'bg-[#A259FF] text-white'
                                      : 'bg-black text-white'
                                  }`
                                : playingItem.player.membership === 'VVIP'
                                ? 'bg-amber-400 text-black'
                                : playingItem.player.membership === 'VIP'
                                ? 'bg-purple-600 text-white'
                                : 'bg-zinc-700 text-zinc-300'
                            }`}
                          >
                            {playingItem.player.membership}
                          </span>
                          {playingItem.donation && (
                            <span
                              className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                                isNeo
                                  ? 'bg-[#FFE600] text-black border border-black'
                                  : 'text-amber-400'
                              }`}
                            >
                              Rp {playingItem.donation.amount.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-2.5">
                        <button
                          onClick={() => handleSetDone(playingItem.id)}
                          className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                            isNeo
                              ? 'bg-white hover:bg-zinc-100 text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                              : 'bg-zinc-800 hover:bg-zinc-750 text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
                          <span>Selesai (Done)</span>
                        </button>
                        <button
                          onClick={handleNextMatch}
                          className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isNeo
                              ? 'bg-[#FFE600] hover:bg-[#FFD700] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg'
                          }`}
                        >
                          <SkipForward className="w-4 h-4 stroke-[2.5]" />
                          <span>NEXT MATCH</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-zinc-500 font-bold text-sm">
                      Tidak ada player yang sedang bermain.
                      {nextItem && (
                        <div className="mt-3">
                          <button
                            onClick={handleNextMatch}
                            className={`px-4 py-2 rounded-xl font-black text-xs uppercase cursor-pointer ${
                              isNeo
                                ? 'bg-[#FFE600] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000]'
                                : 'bg-red-600 text-white'
                            }`}
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
                className={`rounded-2xl overflow-hidden ${
                  isNeo
                    ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
                    : 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-[#1f1a10] border border-amber-500/30 shadow-xl'
                }`}
              >
                <div
                  className={`px-5 py-3.5 flex items-center justify-between ${
                    isNeo
                      ? 'bg-[#FFE600] border-b-[2.5px] border-black text-black'
                      : 'border-b border-white/10 bg-black/40 text-amber-400'
                  }`}
                >
                  <span className="font-black text-xs uppercase tracking-wider">
                    Next Player (Berikutnya)
                  </span>
                  {nextItem && (
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase ${
                        isNeo
                          ? 'bg-black text-white border border-black shadow-[1.5px_1.5px_0px_0px_#000]'
                          : 'bg-amber-400 text-black'
                      }`}
                    >
                      #{nextItem.position}
                    </span>
                  )}
                </div>

                <div className="p-5">
                  {nextItem ? (
                    <div className="space-y-4">
                      <div>
                        <div
                          className={`text-3xl font-black tracking-tight ${
                            isNeo ? 'text-black' : 'text-white'
                          }`}
                        >
                          {nextItem.player.name}
                        </div>
                        <div
                          className={`font-mono text-sm mt-0.5 ${
                            isNeo ? 'text-zinc-700 font-bold' : 'text-zinc-400'
                          }`}
                        >
                          ID: {nextItem.player.game_id}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                              isNeo
                                ? `border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] ${
                                    nextItem.player.membership === 'VVIP'
                                      ? 'bg-[#FFE600] text-black'
                                      : nextItem.player.membership === 'VIP'
                                      ? 'bg-[#A259FF] text-white'
                                      : 'bg-black text-white'
                                  }`
                                : nextItem.player.membership === 'VVIP'
                                ? 'bg-amber-400 text-black'
                                : nextItem.player.membership === 'VIP'
                                ? 'bg-purple-600 text-white'
                                : 'bg-zinc-700 text-zinc-300'
                            }`}
                          >
                            {nextItem.player.membership}
                          </span>
                          {nextItem.donation && (
                            <span
                              className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                                isNeo
                                  ? 'bg-[#FFE600] text-black border border-black'
                                  : 'text-amber-400'
                              }`}
                            >
                              Rp {nextItem.donation.amount.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-2.5">
                        <button
                          onClick={() => handleSkip(nextItem.id)}
                          className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                            isNeo
                              ? 'bg-white hover:bg-zinc-100 text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                              : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300'
                          }`}
                        >
                          Skip Player
                        </button>
                        <button
                          onClick={handleNextMatch}
                          className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isNeo
                              ? 'bg-[#00E5FF] hover:bg-[#00D0E8] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                              : 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-950/40'
                          }`}
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>MAIN SEKARANG</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-zinc-500 font-bold text-sm">
                      Antrian berikutnya masih kosong.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity Log Feed */}
            <div
              className={`rounded-2xl p-6 space-y-4 ${
                isNeo
                  ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
                  : 'bg-zinc-900 border border-zinc-800'
              }`}
            >
              <div
                className={`flex items-center justify-between pb-3 ${
                  isNeo ? 'border-b-2 border-black' : 'border-b border-zinc-800'
                }`}
              >
                <h3 className="font-black text-base uppercase tracking-wider">Aktivitas Terbaru</h3>
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded ${
                    isNeo
                      ? 'bg-black text-[#FFE600] border border-black'
                      : 'text-zinc-500 font-mono'
                  }`}
                >
                  REALTIME LOG
                </span>
              </div>

              <div className="space-y-2.5">
                {logs.length === 0 ? (
                  <div className="py-4 text-center text-zinc-500 font-bold text-xs">
                    Belum ada aktivitas tercatat.
                  </div>
                ) : (
                  logs.slice(0, 8).map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl flex items-center justify-between text-xs ${
                        isNeo
                          ? 'bg-zinc-50 border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] text-black'
                          : 'bg-zinc-800/50 border border-zinc-800 text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-3 h-3 rounded-md border border-black shadow-[1px_1px_0px_0px_#000] ${
                            log.type === 'play'
                              ? 'bg-[#FF4D4D]'
                              : log.type === 'donation'
                              ? 'bg-[#FFE600]'
                              : log.type === 'join'
                              ? 'bg-[#00E5FF]'
                              : log.type === 'done'
                              ? 'bg-[#4EFE82]'
                              : 'bg-black'
                          }`}
                        />
                        <span className="font-black">{log.text}</span>
                      </div>
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          isNeo ? 'text-zinc-600' : 'text-zinc-500'
                        }`}
                      >
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
          <div className="p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Daftar Antrian 1v1</h2>
                <p className={`text-xs font-bold mt-0.5 ${isNeo ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Kelola posisi, status, aksi next, skip, remove, dan edit player secara realtime.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleNextMatch}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    isNeo
                      ? 'bg-[#FFE600] hover:bg-[#FFD700] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                  }`}
                >
                  <SkipForward className="w-4 h-4 stroke-[2.5]" />
                  <span>NEXT MATCH</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    isNeo
                      ? 'bg-[#4EFE82] hover:bg-[#3de870] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                      : 'bg-zinc-800 hover:bg-zinc-750 text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>Tambah Manual</span>
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div
              className={`rounded-2xl overflow-hidden ${
                isNeo
                  ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
                  : 'bg-zinc-900 border border-zinc-800 shadow-xl'
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead
                    className={`uppercase tracking-wider font-black ${
                      isNeo
                        ? 'bg-[#FFE600] text-black border-b-[2.5px] border-black'
                        : 'bg-zinc-950 text-zinc-400 border-b border-zinc-800'
                    }`}
                  >
                    <tr>
                      <th className="py-4 px-4 w-18 text-center">Posisi</th>
                      <th className="py-4 px-4">Nama</th>
                      <th className="py-4 px-4">ID Game</th>
                      <th className="py-4 px-4">Membership</th>
                      <th className="py-4 px-4">Donasi</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody
                    className={isNeo ? 'divide-y-2 divide-black text-black' : 'divide-y divide-zinc-800/80 text-zinc-300'}
                  >
                    {queue.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-500 font-bold">
                          Antrian saat ini kosong. Viewer dapat mendaftar di halaman{' '}
                          <code
                            className={`px-1.5 py-0.5 rounded font-black ${
                              isNeo
                                ? 'bg-[#FFE600] text-black border border-black'
                                : 'text-red-400 bg-zinc-800'
                            }`}
                          >
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
                              isNeo
                                ? isPlaying
                                  ? 'bg-[#FFF3E6] font-bold'
                                  : 'hover:bg-zinc-50 font-bold'
                                : isPlaying
                                ? 'bg-red-950/20 hover:bg-red-950/30'
                                : 'hover:bg-zinc-800/40'
                            }`}
                          >
                            {/* Posisi */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black ${
                                  isNeo
                                    ? `border-2 border-black shadow-[2px_2px_0px_0px_#000] ${
                                        isPlaying
                                          ? 'bg-[#FF4D4D] text-white'
                                          : item.position === 2
                                          ? 'bg-[#FFE600] text-black'
                                          : item.position === 3
                                          ? 'bg-[#A259FF] text-white'
                                          : 'bg-white text-black'
                                      }`
                                    : isPlaying
                                    ? 'bg-white text-zinc-950 shadow-sm'
                                    : item.position === 2
                                    ? 'bg-amber-400 text-black'
                                    : item.position === 3
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-zinc-800 text-zinc-300'
                                }`}
                              >
                                #{item.position}
                              </span>
                            </td>

                            {/* Nama */}
                            <td
                              className={`py-3.5 px-4 font-black text-sm ${
                                isNeo ? 'text-black' : 'text-white'
                              }`}
                            >
                              {item.player.name}
                            </td>

                            {/* ID Game */}
                            <td className="py-3.5 px-4 font-mono font-bold">{item.player.game_id}</td>

                            {/* Membership */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 font-black px-2 py-0.5 rounded text-[10px] uppercase ${
                                  isNeo
                                    ? `border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] ${
                                        item.player.membership === 'VVIP'
                                          ? 'bg-[#FFE600] text-black'
                                          : item.player.membership === 'VIP'
                                          ? 'bg-[#A259FF] text-white'
                                          : 'bg-black text-white'
                                      }`
                                    : item.player.membership === 'VVIP'
                                    ? 'bg-amber-400 text-black'
                                    : item.player.membership === 'VIP'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                }`}
                              >
                                {item.player.membership === 'VVIP' && (
                                  <Crown className="w-3 h-3 fill-current" />
                                )}
                                {item.player.membership === 'VIP' && (
                                  <Sparkles className="w-3 h-3" />
                                )}
                                {item.player.membership}
                              </span>
                            </td>

                            {/* Donasi */}
                            <td className="py-3.5 px-4 font-mono font-black">
                              {item.donation ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${
                                    isNeo
                                      ? 'bg-[#FFE600] text-black border border-black'
                                      : 'text-amber-400'
                                  }`}
                                >
                                  Rp {item.donation.amount.toLocaleString('id-ID')}
                                </span>
                              ) : (
                                <span className="text-zinc-500">-</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              {isPlaying ? (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                    isNeo
                                      ? 'bg-[#FF4D4D] text-white border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                                      : 'bg-red-600 text-white'
                                  }`}
                                >
                                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                  LIVE MATCH
                                </span>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    isNeo
                                      ? 'bg-zinc-100 text-black border border-black'
                                      : 'bg-zinc-800 text-zinc-300'
                                  }`}
                                >
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
                                    className={`p-2 rounded-lg cursor-pointer ${
                                      isNeo
                                        ? 'bg-[#4EFE82] hover:bg-[#3de870] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                                        : 'bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white'
                                    }`}
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                )}

                                {isPlaying && (
                                  <button
                                    onClick={() => handleSetDone(item.id)}
                                    title="Tandai Selesai (Done)"
                                    className={`p-2 rounded-lg cursor-pointer ${
                                      isNeo
                                        ? 'bg-[#FFE600] hover:bg-[#FFD700] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                                        : 'bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </button>
                                )}

                                {/* Move Up */}
                                <button
                                  disabled={isPlaying || idx <= 1}
                                  onClick={() => handleMove(item.id, 'up')}
                                  title="Geser Posisi Ke Atas"
                                  className={`p-2 rounded-lg cursor-pointer disabled:opacity-30 ${
                                    isNeo
                                      ? 'bg-white hover:bg-zinc-100 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] disabled:shadow-none'
                                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                                  }`}
                                >
                                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>

                                {/* Move Down */}
                                <button
                                  disabled={isPlaying || idx === queue.length - 1}
                                  onClick={() => handleMove(item.id, 'down')}
                                  title="Geser Posisi Ke Bawah"
                                  className={`p-2 rounded-lg cursor-pointer disabled:opacity-30 ${
                                    isNeo
                                      ? 'bg-white hover:bg-zinc-100 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] disabled:shadow-none'
                                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                                  }`}
                                >
                                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>

                                {/* Edit */}
                                <button
                                  onClick={() => setEditingPlayer(item.player)}
                                  title="Edit Player"
                                  className={`p-2 rounded-lg cursor-pointer ${
                                    isNeo
                                      ? 'bg-[#00E5FF] hover:bg-[#00D0E8] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                                      : 'bg-zinc-800 hover:bg-cyan-600 text-zinc-300 hover:text-white'
                                  }`}
                                >
                                  <Edit className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>

                                {/* Skip */}
                                <button
                                  onClick={() => handleSkip(item.id)}
                                  title="Skip Player"
                                  className={`p-2 rounded-lg cursor-pointer ${
                                    isNeo
                                      ? 'bg-[#FFE600] hover:bg-[#FFD700] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                                      : 'bg-zinc-800 hover:bg-amber-600 text-zinc-300 hover:text-white'
                                  }`}
                                >
                                  <SkipForward className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>

                                {/* Remove */}
                                <button
                                  onClick={() => handleRemove(item.id)}
                                  title="Hapus Player"
                                  className={`p-2 rounded-lg cursor-pointer ${
                                    isNeo
                                      ? 'bg-[#FF4D4D] hover:bg-red-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                                      : 'bg-zinc-800 hover:bg-red-600 text-zinc-300 hover:text-white'
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
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
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  Riwayat Donasi Sociabuzz
                </h2>
                <p className={`text-xs font-bold mt-0.5 ${isNeo ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Menampilkan data donasi yang masuk melalui webhook atau simulasi Sociabuzz.
                </p>
              </div>

              <button
                onClick={() => setShowSimModal(true)}
                className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  isNeo
                    ? 'bg-[#FFE600] hover:bg-[#FFD700] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                    : 'bg-amber-400 hover:bg-amber-300 text-black shadow-md'
                }`}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Simulasi Donasi Sociabuzz</span>
              </button>
            </div>

            {/* Sociabuzz Webhook Info Box */}
            <div
              className={`p-5 rounded-2xl space-y-2.5 ${
                isNeo
                  ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
                  : 'bg-zinc-900 border border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 font-black text-[11px] rounded uppercase ${
                    isNeo
                      ? 'bg-[#4EFE82] text-black border border-black shadow-[1.5px_1.5px_0px_0px_#000]'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  Webhook URL
                </span>
                <h3 className="font-black text-sm uppercase tracking-wider">
                  Endpoint Integrasi Sociabuzz
                </h3>
              </div>
              <p
                className={`text-xs font-bold leading-relaxed ${
                  isNeo ? 'text-zinc-700' : 'text-zinc-400'
                }`}
              >
                Pasang URL ini pada menu Webhook akun Sociabuzz Anda:
              </p>
              <div className="flex items-center gap-2">
                <code
                  className={`px-4 py-2.5 rounded-xl font-mono font-bold text-xs flex-1 truncate ${
                    isNeo
                      ? 'bg-zinc-100 border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-black/60 border border-zinc-800 text-cyan-400'
                  }`}
                >
                  {domain}/api/webhooks/sociabuzz
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(`${domain}/api/webhooks/sociabuzz`)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    isNeo
                      ? 'bg-[#00E5FF] hover:bg-[#00D0E8] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  Copy URL
                </button>
              </div>
            </div>

            {/* Donations Table */}
            <div
              className={`rounded-2xl overflow-hidden ${
                isNeo
                  ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
                  : 'bg-zinc-900 border border-zinc-800 shadow-xl'
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead
                    className={`uppercase tracking-wider font-black ${
                      isNeo
                        ? 'bg-[#FFE600] text-black border-b-[2.5px] border-black'
                        : 'bg-zinc-950 text-zinc-400 border-b border-zinc-800'
                    }`}
                  >
                    <tr>
                      <th className="py-4 px-4">Donation ID</th>
                      <th className="py-4 px-4">Donor Name</th>
                      <th className="py-4 px-4">Nominal</th>
                      <th className="py-4 px-4">Pesan</th>
                      <th className="py-4 px-4">Waktu</th>
                      <th className="py-4 px-4">Status Klaim</th>
                    </tr>
                  </thead>
                  <tbody
                    className={isNeo ? 'divide-y-2 divide-black text-black' : 'divide-y divide-zinc-800/80 text-zinc-300'}
                  >
                    {donations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500 font-bold">
                          Belum ada riwayat donasi.
                        </td>
                      </tr>
                    ) : (
                      donations.map((don) => (
                        <tr
                          key={don.id}
                          className={isNeo ? 'hover:bg-zinc-50 font-bold' : 'hover:bg-zinc-800/40'}
                        >
                          <td className="py-3.5 px-4 font-mono font-black">
                            {don.external_donation_id}
                          </td>
                          <td className="py-3.5 px-4 font-black text-sm">{don.donor_name}</td>
                          <td className="py-3.5 px-4 font-mono font-black">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                isNeo
                                  ? 'bg-[#FFE600] text-black border border-black'
                                  : 'text-amber-400'
                              }`}
                            >
                              Rp {don.amount.toLocaleString('id-ID')}
                            </span>
                          </td>
                          <td
                            className={`py-3.5 px-4 max-w-xs truncate ${
                              isNeo ? 'text-zinc-700' : 'text-zinc-400'
                            }`}
                          >
                            {don.message || '-'}
                          </td>
                          <td
                            className={`py-3.5 px-4 font-mono text-[11px] ${
                              isNeo ? 'text-zinc-600' : 'text-zinc-500'
                            }`}
                          >
                            {new Date(don.created_at).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3.5 px-4">
                            {don.status === 'CLAIMED' ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                                  isNeo
                                    ? 'bg-[#4EFE82] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]'
                                    : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                                SUDAH MASUK QUEUE
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                                  isNeo
                                    ? 'bg-[#FFFDE8] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]'
                                    : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                                }`}
                              >
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
              <h2 className="text-2xl font-black uppercase tracking-tight">
                Pengaturan & Link OBS Overlay
              </h2>
              <p className={`text-xs font-bold mt-0.5 ${isNeo ? 'text-zinc-700' : 'text-zinc-400'}`}>
                Copy link Browser Source di bawah ini dan tempelkan langsung ke OBS Studio.
              </p>
            </div>

            {/* OBS BROWSER SOURCE CARD */}
            <div
              className={`p-6 rounded-2xl space-y-4 ${
                isNeo
                  ? 'bg-[#FFE600] border-[3px] border-black shadow-[6px_6px_0px_0px_#000] text-black'
                  : 'bg-zinc-900 border border-red-500/30 shadow-2xl text-zinc-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                  <Tv className="w-4 h-4 stroke-[2.5]" />
                  OBS BROWSER SOURCE URL
                </span>
                <span
                  className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                    isNeo
                      ? 'bg-white text-black border border-black shadow-[1.5px_1.5px_0px_0px_#000]'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  Token: {settings?.streamer_token}
                </span>
              </div>

              {/* URL Input Box */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  readOnly
                  value={overlayUrl}
                  className={`flex-1 px-4 py-3 rounded-xl font-mono font-bold text-xs select-all focus:outline-none ${
                    isNeo
                      ? 'bg-white border-[2.5px] border-black text-black shadow-[3px_3px_0px_0px_#000]'
                      : 'bg-black/60 border border-zinc-700 text-cyan-300'
                  }`}
                />
                <button
                  onClick={() => copyToClipboard(overlayUrl, 'overlay')}
                  className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isNeo
                      ? 'bg-[#00E5FF] hover:bg-[#00D0E8] text-black border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/60'
                  }`}
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <Copy className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>{copiedLink ? 'LINK TERSALIN!' : 'COPY LINK'}</span>
                </button>
                <a
                  href={overlayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isNeo
                      ? 'bg-white hover:bg-zinc-100 text-black border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                      : 'bg-zinc-800 hover:bg-zinc-750 text-white'
                  }`}
                >
                  <span>OPEN PREVIEW</span>
                  <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                </a>
              </div>

              {/* Quick OBS Setup Guide */}
              <div
                className={`pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs ${
                  isNeo ? 'border-t-2 border-black text-black' : 'border-t border-zinc-800 text-zinc-400'
                }`}
              >
                <div
                  className={`p-3 rounded-xl ${
                    isNeo
                      ? 'bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-black/30 border border-zinc-800'
                  }`}
                >
                  <span className="font-black block mb-0.5">1. Tambah Browser</span>
                  <span className="font-bold">Di OBS Studio, klik + pada Sources lalu pilih "Browser".</span>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    isNeo
                      ? 'bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-black/30 border border-zinc-800'
                  }`}
                >
                  <span className="font-black block mb-0.5">2. Atur Resolusi</span>
                  <span className="font-bold">Set Width: 450, Height: 650.</span>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    isNeo
                      ? 'bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-black/30 border border-zinc-800'
                  }`}
                >
                  <span className="font-black block mb-0.5">3. Transparansi OBS</span>
                  <span className="font-bold">Latar luar transparan, langsung menempel di stream gameplay.</span>
                </div>
              </div>
            </div>

            {/* LIVE OVERLAY PREVIEW */}
            <div
              className={`rounded-2xl p-6 space-y-4 ${
                isNeo
                  ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
                  : 'bg-zinc-900 border border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base uppercase tracking-wider">
                    Interactive Live Overlay Preview
                  </h3>
                  <p className={`text-xs font-bold ${isNeo ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    Tampilan persis seperti yang akan tampil di live stream OBS Anda.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    isNeo
                      ? 'bg-[#FFE600] hover:bg-[#FFD700] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300'
                  }`}
                >
                  Ubah Tampilan & Judul
                </button>
              </div>

              {/* Preview Window Frame */}
              <div
                className={`w-full bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] bg-zinc-950/80 rounded-2xl p-6 flex justify-center min-h-[460px] overflow-hidden ${
                  isNeo ? 'border-[3px] border-black shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)]' : 'border border-zinc-800'
                }`}
              >
                <div className="w-full max-w-[440px]">
                  <OverlayView
                    previewSettings={settings || undefined}
                    previewQueue={queue}
                    isPreviewMode={true}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PENGATURAN (SETTINGS) */}
        {activeTab === 'settings' && (
          <div className="p-6 space-y-6 max-w-4xl">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">
                Pengaturan Sistem & Tampilan
              </h2>
              <p className={`text-xs font-bold mt-0.5 ${isNeo ? 'text-zinc-700' : 'text-zinc-400'}`}>
                Sesuaikan gaya UI dashboard, link Sociabuzz, batas donasi, judul custom, dan PIN.
              </p>
            </div>

            {settingsSuccess && (
              <div
                className={`p-4 rounded-xl text-xs font-black flex items-center gap-2 ${
                  isNeo
                    ? 'bg-[#4EFE82] border-2 border-black text-black shadow-[3px_3px_0px_0px_#000]'
                    : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            {/* DEDICATED SECTION: 2 OPTIONS UI DASHBOARD STYLE */}
            <div
              className={`p-6 rounded-2xl space-y-4 ${
                isNeo
                  ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
                  : 'bg-zinc-900 border border-zinc-800 shadow-xl'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isNeo ? 'bg-[#FFE600] border-2 border-black text-black' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    <Palette className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-black text-base uppercase tracking-wider">
                      Pilihan Gaya UI Dashboard
                    </h3>
                    <p className={`text-xs font-bold ${isNeo ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      Pilih antara gaya Neobrutalism (cerah & pop) atau Obsidian Dark (gaming gelap).
                    </p>
                  </div>
                </div>
              </div>

              {/* 2 Big Selectable Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Opsi 1: Neobrutalism */}
                <button
                  type="button"
                  onClick={() => handleToggleUiTheme('neobrutalism')}
                  className={`p-4 rounded-2xl text-left transition-all cursor-pointer border-[3px] border-black relative overflow-hidden ${
                    uiTheme === 'neobrutalism'
                      ? 'bg-[#FFFDE8] shadow-[5px_5px_0px_0px_#000] ring-2 ring-black'
                      : 'bg-white shadow-[2px_2px_0px_0px_#000] opacity-75 hover:opacity-100 hover:shadow-[4px_4px_0px_0px_#000]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase bg-[#FFE600] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]">
                      🎨 Opsi 1: Neobrutalism Pop
                    </span>
                    {uiTheme === 'neobrutalism' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#4EFE82] text-black border border-black">
                        ✓ AKTIF
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-black text-black">
                    Border tebal 3px, hard shadow tanpa blur, blok warna flat pop (#FFE600, #00E5FF, #4EFE82).
                  </p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-[#FFE600] border border-black" />
                    <span className="w-4 h-4 rounded bg-[#00E5FF] border border-black" />
                    <span className="w-4 h-4 rounded bg-[#4EFE82] border border-black" />
                    <span className="w-4 h-4 rounded bg-[#FF5B89] border border-black" />
                    <span className="text-[10px] font-black text-zinc-600 ml-1">Karakter Ceria & Kontras</span>
                  </div>
                </button>

                {/* Opsi 2: Obsidian Dark */}
                <button
                  type="button"
                  onClick={() => handleToggleUiTheme('dark')}
                  className={`p-4 rounded-2xl text-left transition-all cursor-pointer relative overflow-hidden ${
                    uiTheme === 'dark'
                      ? 'bg-zinc-900 text-white border-2 border-red-500 shadow-xl ring-2 ring-red-500/50'
                      : isNeo
                      ? 'bg-zinc-900 text-white border-2 border-black shadow-[2px_2px_0px_0px_#000] opacity-75 hover:opacity-100'
                      : 'bg-zinc-900 text-white border border-zinc-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm">
                      🌙 Opsi 2: Obsidian Dark
                    </span>
                    {uiTheme === 'dark' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 text-white">
                        ✓ AKTIF
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-zinc-300">
                    Nuansa hitam charcoal, aksen merah/cyan gaming, border halus, minim kelelahan mata saat live streaming malam hari.
                  </p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-[#18181b] border border-zinc-700" />
                    <span className="w-4 h-4 rounded bg-red-600 border border-zinc-700" />
                    <span className="w-4 h-4 rounded bg-amber-400 border border-zinc-700" />
                    <span className="w-4 h-4 rounded bg-cyan-400 border border-zinc-700" />
                    <span className="text-[10px] font-bold text-zinc-400 ml-1">Karakter Esports Gelap</span>
                  </div>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Sociabuzz & Donasi Section */}
              <div
                className={`p-6 rounded-2xl space-y-4 ${
                  isNeo
                    ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
                    : 'bg-zinc-900 border border-zinc-800 shadow-xl'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isNeo ? 'bg-[#FFE600] border-2 border-black text-black' : 'bg-amber-400/20 text-amber-400'
                    }`}
                  >
                    <Coins className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <h3 className="font-black text-base uppercase tracking-wider">
                    Pengaturan Integrasi Sociabuzz
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
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
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-mono font-bold focus:outline-none ${
                      isNeo
                        ? 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFFDE8]'
                        : 'bg-zinc-800 border border-zinc-700 text-white focus:border-amber-400'
                    }`}
                  />
                  <span className={`text-[11px] font-bold mt-1 block ${isNeo ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    Link ini yang ditampilkan ke viewer dan tombol donasi cepat.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1">
                      Min Donasi Regular
                    </label>
                    <input
                      type="number"
                      step={1000}
                      value={settingsForm.min_donation ?? 10000}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, min_donation: Number(e.target.value) })
                      }
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold ${
                        isNeo
                          ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]'
                          : 'bg-zinc-800 border border-zinc-700 text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1 text-[#A259FF]">
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
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold ${
                        isNeo
                          ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]'
                          : 'bg-zinc-800 border border-zinc-700 text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1 text-amber-600">
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
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold ${
                        isNeo
                          ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]'
                          : 'bg-zinc-800 border border-zinc-700 text-white'
                      }`}
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
                    className="w-5 h-5 rounded cursor-pointer accent-black"
                  />
                  <label
                    htmlFor="free_queue"
                    className="text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Izinkan antrian gratis (tanpa kode donasi Sociabuzz)
                  </label>
                </div>
              </div>

              {/* Overlay Appearance Section */}
              <div
                className={`p-6 rounded-2xl space-y-4 ${
                  isNeo
                    ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
                    : 'bg-zinc-900 border border-zinc-800 shadow-xl'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isNeo ? 'bg-[#00E5FF] border-2 border-black text-black' : 'bg-cyan-500/20 text-cyan-400'
                    }`}
                  >
                    <Tv className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <h3 className="font-black text-base uppercase tracking-wider">
                    Kustomisasi Judul & Tampilan Overlay OBS
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Custom Title Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-black uppercase tracking-wider">
                        Judul Overlay (Tulis Sendiri / Bebas)
                      </label>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          isNeo ? 'bg-[#FFE600] text-black border border-black' : 'text-cyan-400'
                        }`}
                      >
                        Atas Tengah
                      </span>
                    </div>
                    <input
                      type="text"
                      value={settingsForm.title || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
                      placeholder="Contoh: ANTRIAN BY1"
                      className={`w-full px-4 py-2.5 rounded-xl text-xs font-black focus:outline-none ${
                        isNeo
                          ? 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFFDE8]'
                          : 'bg-zinc-800 border border-zinc-700 text-white focus:border-red-500'
                      }`}
                    />
                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <span className={`text-[10px] font-black mr-1 ${isNeo ? 'text-zinc-600' : 'text-zinc-500'}`}>
                        Preset Cepat:
                      </span>
                      {['ANTRIAN BY1', 'ANTRIAN 1V1', 'ROOM BY 1', 'LIVE DUEL BY1'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSettingsForm({ ...settingsForm, title: preset })}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                            isNeo
                              ? `border-2 border-black ${
                                  settingsForm.title === preset
                                    ? 'bg-[#FFE600] text-black shadow-[2px_2px_0px_0px_#000]'
                                    : 'bg-zinc-100 text-black hover:bg-zinc-200'
                                }`
                              : settingsForm.title === preset
                              ? 'bg-red-600 text-white'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme Selector */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
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
                      className={`w-full px-4 py-2.5 rounded-xl text-xs font-black focus:outline-none ${
                        isNeo
                          ? 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_#000]'
                          : 'bg-zinc-800 border border-zinc-700 text-white'
                      }`}
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
                    <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
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
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold ${
                        isNeo
                          ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]'
                          : 'bg-zinc-800 border border-zinc-700 text-white'
                      }`}
                    >
                      <option value="small">Kecil (Compact)</option>
                      <option value="medium">Sedang (Standard 1080p)</option>
                      <option value="large">Besar (Big Screen)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
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
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold ${
                        isNeo
                          ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]'
                          : 'bg-zinc-800 border border-zinc-700 text-white'
                      }`}
                    >
                      <option value="compact">Rapat (Compact)</option>
                      <option value="normal">Normal</option>
                      <option value="spacious">Lebar (Spacious)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
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
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold ${
                        isNeo
                          ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]'
                          : 'bg-zinc-800 border border-zinc-700 text-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Opacity Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider mb-1.5">
                    <span>Transparansi Background Overlay</span>
                    <span
                      className={`font-mono px-2 py-0.5 rounded ${
                        isNeo
                          ? 'bg-[#FFE600] text-black border border-black'
                          : 'text-cyan-400 bg-zinc-800'
                      }`}
                    >
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
                    className="w-full accent-black cursor-pointer"
                  />
                  <div className={`flex justify-between text-[10px] font-bold mt-1 ${isNeo ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    <span>Sedikit Transparan (70%)</span>
                    <span>Solid Gelap Rekomendasi (96% - 100%)</span>
                  </div>
                </div>

                {/* Spacing Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider mb-1.5">
                    <span>Jarak Spacing Antar Card (px)</span>
                    <span
                      className={`font-mono px-2 py-0.5 rounded ${
                        isNeo
                          ? 'bg-[#00E5FF] text-black border border-black'
                          : 'text-cyan-400 bg-zinc-800'
                      }`}
                    >
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
                    className="w-full accent-black cursor-pointer"
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
                    className="w-5 h-5 rounded cursor-pointer accent-black"
                  />
                  <label
                    htmlFor="sound_alert"
                    className="text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                  >
                    <Volume2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Nyalakan notifikasi audio otomatis saat giliran match berganti</span>
                  </label>
                </div>

                {/* Hide currently playing player from queue overlay */}
                <div className="flex items-start gap-3 pt-2 border-t border-zinc-200/50">
                  <input
                    type="checkbox"
                    id="hide_playing_in_overlay"
                    checked={settingsForm.hide_playing_in_overlay ?? true}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, hide_playing_in_overlay: e.target.checked })
                    }
                    className="w-5 h-5 rounded cursor-pointer accent-black mt-0.5"
                  />
                  <div>
                    <label
                      htmlFor="hide_playing_in_overlay"
                      className="text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                    >
                      <Users className="w-4 h-4 stroke-[2.5]" />
                      <span>Sembunyikan player yang sedang main dari overlay (Hanya tampilkan antrian berikutnya)</span>
                    </label>
                    <p className={`text-[11px] font-bold mt-0.5 ${isNeo ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      Contoh: Saat streamer sedang bertanding melawan Bara dan urutan selanjutnya Fianz, di overlay antrian hanya akan muncul Fianz (#1) dan pemain berikutnya.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  isNeo
                    ? 'bg-[#4EFE82] hover:bg-[#3de870] text-black border-[3px] border-black shadow-[5px_5px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-lg'
                }`}
              >
                {savingSettings ? 'Menyimpan...' : 'SIMPAN SEMUA PENGATURAN'}
              </button>
            </form>

            {/* Token & Security Section */}
            <div
              className={`p-6 rounded-2xl space-y-4 ${
                isNeo
                  ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000]'
                  : 'bg-zinc-900 border border-zinc-800 shadow-xl'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    isNeo ? 'bg-[#FF4D4D] text-white border-2 border-black' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  <Lock className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="font-black text-base uppercase tracking-wider">
                  Keamanan & Token Overlay
                </h3>
              </div>

              <div
                className={`flex items-center justify-between p-4 rounded-xl ${
                  isNeo
                    ? 'bg-zinc-50 border-2 border-black shadow-[3px_3px_0px_0px_#000]'
                    : 'bg-black/40 border border-zinc-800'
                }`}
              >
                <div>
                  <div className="text-xs font-black uppercase">Regenerate Token Overlay</div>
                  <div className={`text-[11px] font-bold ${isNeo ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    Jika URL OBS Anda bocor saat streaming, Anda dapat membuat token baru seketika.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateToken}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    isNeo
                      ? 'bg-[#FF4D4D] hover:bg-red-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                      : 'bg-zinc-800 hover:bg-rose-600 text-white'
                  }`}
                >
                  Regenerate
                </button>
              </div>

              {/* PIN Change */}
              <form onSubmit={handleUpdatePin} className="space-y-3 pt-2">
                <label className="block text-xs font-black uppercase tracking-wider">
                  Ganti PIN Admin Streamer
                </label>
                {pinSuccess && (
                  <div className="text-emerald-500 font-black text-xs">✓ {pinSuccess}</div>
                )}
                <div className="flex items-center gap-2.5">
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="PIN baru (minimal 4 karakter)"
                    className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-mono font-bold focus:outline-none ${
                      isNeo
                        ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]'
                        : 'bg-zinc-800 border border-zinc-700 text-white focus:border-red-500'
                    }`}
                  />
                  <button
                    type="submit"
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                      isNeo
                        ? 'bg-[#00E5FF] hover:bg-[#00D0E8] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    Simpan PIN
                  </button>
                </div>
              </form>
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
    </div>
  );
};
