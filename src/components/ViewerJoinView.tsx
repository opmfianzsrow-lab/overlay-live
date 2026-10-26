import React, { useState, useEffect } from 'react';
import {
  Swords,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trophy,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import type { QueueItem } from '../types/queue';
import { useTheme } from '../context/ThemeContext';

export const ViewerJoinView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [name, setName] = useState('');
  const [gameId, setGameId] = useState('');
  const [donationCode, setDonationCode] = useState('');
  const [sociabuzzUrl, setSociabuzzUrl] = useState('https://sociabuzz.com/prostreamer');
  const [minDonation, setMinDonation] = useState(10000);
  const [allowFreeQueue, setAllowFreeQueue] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [joinedItem, setJoinedItem] = useState<QueueItem | null>(null);
  const [streamerToken, setStreamerToken] = useState<string>('');

  // Load basic public settings
  useEffect(() => {
    let token = '';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      token = params.get('streamer') || params.get('token') || '';
      setStreamerToken(token);
      const code = params.get('code') || params.get('donation_id');
      if (code) setDonationCode(code);
      const prefilledName = params.get('name') || params.get('donor');
      if (prefilledName) setName(prefilledName);
    }

    const target = token || 'preview';
    fetch(`/api/public/overlay/${target}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) {
          if (data.settings.sociabuzz_url) setSociabuzzUrl(data.settings.sociabuzz_url);
          if (data.settings.min_donation) setMinDonation(data.settings.min_donation);
          if (typeof data.settings.allow_free_queue === 'boolean') {
            setAllowFreeQueue(data.settings.allow_free_queue);
          }
        }
      })
      .catch(() => null);
  }, []);

  // Poll or track live position if user is joined
  useEffect(() => {
    if (!joinedItem) return;

    const interval = setInterval(async () => {
      try {
        const query = streamerToken ? `?token=${encodeURIComponent(streamerToken)}` : '';
        const res = await fetch(`/api/public/status/${joinedItem.player_id}${query}`);
        if (res.ok) {
          const data = await res.json();
          if (data.item) {
            setJoinedItem(data.item);
          }
        }
      } catch {
        // ignore polling error
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [joinedItem, streamerToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Nama kamu wajib diisi!');
      return;
    }
    if (!gameId.trim()) {
      setErrorMsg('ID Game wajib diisi!');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/public/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          game_id: gameId.trim(),
          donation_id: donationCode.trim() || undefined,
          streamer_token: streamerToken || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal masuk antrian. Silakan periksa kembali data kamu.');
      }

      setJoinedItem(data.queueItem);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Terjadi kesalahan koneksi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-white/20 antialiased relative z-10">
      {/* Subtle atmospheric ambient glow */}
      {isLight ? (
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(200,59,43,0.06),transparent)]" />
      ) : (
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,119,198,0.12),transparent)]" />
      )}

      <div className="relative z-10 max-w-md w-full mx-auto my-auto py-8">
        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border mb-3 shadow-inner ${
              isLight
                ? 'bg-zinc-100 border-black/10 text-zinc-800'
                : 'bg-white/[0.08] border-white/[0.12] text-white'
            }`}
          >
            <Swords className="w-5 h-5" />
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-semibold tracking-[-0.03em] ${
              isLight ? 'text-zinc-950' : 'text-white'
            }`}
          >
            Pendaftaran Antrian 1v1
          </h1>
          <p
            className={`text-xs font-normal mt-1 max-w-xs mx-auto ${
              isLight ? 'text-zinc-600' : 'text-zinc-400'
            }`}
          >
            Daftarkan ID Game kamu untuk tanding 1v1 live di stream sekarang.
          </p>
        </div>

        {/* Step 1 Callout: Sociabuzz Donation Banner */}
        <div className="mb-5 rounded-3xl apple-card p-4.5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/30">
                  Langkah 1
                </span>
                <h3
                  className={`font-semibold text-xs tracking-tight ${
                    isLight ? 'text-zinc-900' : 'text-white'
                  }`}
                >
                  Donasi via Sociabuzz
                </h3>
              </div>
              <p
                className={`text-xs font-normal leading-relaxed pt-1 ${
                  isLight ? 'text-zinc-600' : 'text-zinc-400'
                }`}
              >
                Dapatkan kode donasi untuk prioritas antrian VVIP / VIP.
              </p>
            </div>
            <a
              href={sociabuzzUrl || 'https://sociabuzz.com'}
              target="_blank"
              rel="noopener noreferrer"
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full font-medium text-xs tracking-tight transition-all cursor-pointer active:scale-[0.98] ${
                isLight
                  ? 'bg-zinc-900 hover:bg-black text-white'
                  : 'bg-white hover:bg-zinc-200 text-black'
              }`}
            >
              <span>Donasi</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Main Card: Form or Success Status */}
        <div className="rounded-3xl apple-glass p-6 sm:p-7 shadow-2xl">
          {joinedItem ? (
            /* SUCCESS VIEW */
            <div className="space-y-5">
              <div
                className={`p-4 rounded-2xl text-center border ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-white'
                }`}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h2
                  className={`text-base font-semibold tracking-tight ${
                    isLight ? 'text-zinc-900' : 'text-white'
                  }`}
                >
                  Berhasil Masuk Antrian!
                </h2>
                <p
                  className={`text-xs font-normal mt-0.5 ${
                    isLight ? 'text-emerald-700' : 'text-emerald-300'
                  }`}
                >
                  ID kamu otomatis tersinkron ke OBS live overlay streamer
                </p>
              </div>

              {/* Receipt Details */}
              <div className="apple-card rounded-2xl p-4.5 space-y-3 text-xs">
                <div
                  className={`flex justify-between items-center pb-2.5 border-b ${
                    isLight ? 'border-black/[0.06]' : 'border-white/[0.06]'
                  }`}
                >
                  <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Nama Player</span>
                  <span
                    className={`font-semibold text-sm ${
                      isLight ? 'text-zinc-900' : 'text-white'
                    }`}
                  >
                    {joinedItem.player.name}
                  </span>
                </div>

                <div
                  className={`flex justify-between items-center pb-2.5 border-b ${
                    isLight ? 'border-black/[0.06]' : 'border-white/[0.06]'
                  }`}
                >
                  <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>ID Game</span>
                  <span
                    className={`font-mono font-medium ${
                      isLight ? 'text-zinc-800' : 'text-zinc-200'
                    }`}
                  >
                    {joinedItem.player.game_id}
                  </span>
                </div>

                <div
                  className={`flex justify-between items-center pb-2.5 border-b ${
                    isLight ? 'border-black/[0.06]' : 'border-white/[0.06]'
                  }`}
                >
                  <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Posisi Antrian</span>
                  <span
                    className={`px-3 py-1 rounded-full font-semibold text-xs tracking-tight ${
                      isLight ? 'bg-zinc-900 text-white' : 'bg-white text-black'
                    }`}
                  >
                    #{joinedItem.position}
                  </span>
                </div>

                <div
                  className={`flex justify-between items-center pb-2.5 border-b ${
                    isLight ? 'border-black/[0.06]' : 'border-white/[0.06]'
                  }`}
                >
                  <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Membership</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight ${
                      joinedItem.player.membership === 'VVIP'
                        ? 'bg-amber-400/20 text-amber-500 dark:text-amber-300 border border-amber-400/30'
                        : joinedItem.player.membership === 'VIP'
                        ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30'
                        : isLight
                        ? 'bg-black/[0.06] text-zinc-700 border-black/[0.08]'
                        : 'bg-white/[0.08] text-zinc-300 border-white/[0.1]'
                    }`}
                  >
                    {joinedItem.player.membership}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>Status Live</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-xs">
                    {joinedItem.status === 'PLAYING' ? (
                      <span className="text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        SEDANG BERTANDING
                      </span>
                    ) : joinedItem.status === 'DONE' ? (
                      <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>SELESAI</span>
                    ) : (
                      <span
                        className={`flex items-center gap-1 ${
                          isLight ? 'text-zinc-700' : 'text-zinc-300'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        Menunggu Giliran #{joinedItem.position}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Live Tracker Notice */}
              <div
                className={`p-3 border rounded-2xl text-center text-xs flex items-center justify-center gap-2 ${
                  isLight
                    ? 'bg-black/[0.03] border-black/[0.06] text-zinc-600'
                    : 'bg-white/[0.03] border-white/[0.06] text-zinc-400'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2997ff]" />
                <span>Halaman ini otomatis merefresh posisi antrian secara live.</span>
              </div>

              <button
                onClick={() => setJoinedItem(null)}
                className={`w-full py-2 text-xs transition-colors cursor-pointer ${
                  isLight ? 'text-zinc-600 hover:text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Daftarkan player lain / Reset form
              </button>
            </div>
          ) : (
            /* FORM VIEW */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label
                  className={`block text-xs font-medium mb-1.5 ${
                    isLight ? 'text-zinc-700' : 'text-zinc-300'
                  }`}
                >
                  Nama Player <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: GALANG"
                  className="apple-input text-sm w-full px-3.5 py-2.5 rounded-xl"
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-medium mb-1.5 ${
                    isLight ? 'text-zinc-700' : 'text-zinc-300'
                  }`}
                >
                  ID Game (In-Game ID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  placeholder="Contoh: 12933886421 (8492)"
                  className="apple-input text-sm font-mono w-full px-3.5 py-2.5 rounded-xl"
                />
                <span
                  className={`text-[11px] mt-1 block ${
                    isLight ? 'text-zinc-500' : 'text-zinc-400'
                  }`}
                >
                  Pastikan ID Game dan Server ID akurat agar streamer dapat meng-invite kamu ke room.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    className={`block text-xs font-medium ${
                      isLight ? 'text-zinc-700' : 'text-zinc-300'
                    }`}
                  >
                    Kode Donasi Sociabuzz
                  </label>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                      isLight
                        ? 'bg-black/[0.04] text-zinc-600 border-black/[0.08]'
                        : 'bg-white/[0.06] text-zinc-400 border-white/[0.08]'
                    }`}
                  >
                    {allowFreeQueue ? 'Opsional' : 'Wajib'}
                  </span>
                </div>
                <input
                  type="text"
                  value={donationCode}
                  onChange={(e) => setDonationCode(e.target.value)}
                  placeholder="Contoh: SB-882910 atau ID Donasi"
                  className="apple-input text-sm font-mono w-full px-3.5 py-2.5 rounded-xl"
                />
                <span
                  className={`text-[11px] mt-1 block ${
                    isLight ? 'text-zinc-500' : 'text-zinc-400'
                  }`}
                >
                  Cek email konfirmasi Sociabuzz atau bukti donasi untuk mendapatkan kode ID donasi.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 px-4 rounded-full font-medium text-sm tracking-tight active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg ${
                    isLight
                      ? 'bg-zinc-900 hover:bg-black text-white shadow-zinc-900/10'
                      : 'bg-white hover:bg-zinc-100 text-black shadow-white/5'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Memvalidasi...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk Antrian</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Benefits Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl apple-card flex items-center gap-2.5">
            <Trophy className="w-4 h-4 text-[#d97706] shrink-0" />
            <div>
              <p
                className={`font-medium tracking-tight ${
                  isLight ? 'text-zinc-900' : 'text-white'
                }`}
              >
                Slot Prioritas VVIP
              </p>
              <p className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>
                Urutan terdepan live
              </p>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl apple-card flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#16a34a] shrink-0" />
            <div>
              <p
                className={`font-medium tracking-tight ${
                  isLight ? 'text-zinc-900' : 'text-white'
                }`}
              >
                Realtime OBS
              </p>
              <p className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>
                Tampil instan di stream
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className={`relative z-10 text-center text-[11px] font-normal tracking-tight py-4 ${
          isLight ? 'text-zinc-500' : 'text-zinc-500'
        }`}
      >
        Sistem Antrian 1v1 Streamer • Powered by Sociabuzz Webhook Integration
      </footer>
    </div>
  );
};
