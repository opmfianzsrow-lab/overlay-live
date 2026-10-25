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

export const ViewerJoinView: React.FC = () => {
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
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-white/20 selection:text-white antialiased">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]" />

      <div className="relative z-10 max-w-md w-full mx-auto my-auto py-8">
        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/[0.08] border border-white/[0.12] text-white mb-3 shadow-inner">
            <Swords className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
            Pendaftaran Antrian 1v1
          </h1>
          <p className="text-zinc-400 text-xs font-normal mt-1 max-w-xs mx-auto">
            Daftarkan ID Game kamu untuk tanding 1v1 live di stream sekarang.
          </p>
        </div>

        {/* Step 1 Callout: Sociabuzz Donation Banner */}
        <div className="mb-5 rounded-3xl apple-card p-4.5 border border-white/[0.1] bg-white/[0.03] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/30">
                  Langkah 1
                </span>
                <h3 className="font-semibold text-white text-xs tracking-tight">
                  Donasi via Sociabuzz
                </h3>
              </div>
              <p className="text-xs text-zinc-400 font-normal leading-relaxed pt-1">
                Dapatkan kode donasi untuk prioritas antrian VVIP / VIP.
              </p>
            </div>
            <a
              href={sociabuzzUrl || "https://sociabuzz.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-zinc-200 text-black font-medium text-xs tracking-tight transition-all cursor-pointer active:scale-[0.98]"
            >
              <span>Donasi</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Main Card: Form or Success Status */}
        <div className="rounded-3xl apple-glass p-6 sm:p-7 border border-white/[0.12] shadow-2xl">
          {joinedItem ? (
            /* SUCCESS VIEW */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Berhasil Masuk Antrian!
                </h2>
                <p className="text-xs text-emerald-300 font-normal mt-0.5">
                  ID kamu otomatis tersinkron ke OBS live overlay streamer
                </p>
              </div>

              {/* Receipt Details */}
              <div className="apple-card rounded-2xl p-4.5 space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.06]">
                  <span className="text-zinc-500">Nama Player</span>
                  <span className="font-semibold text-white text-sm">
                    {joinedItem.player.name}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.06]">
                  <span className="text-zinc-500">ID Game</span>
                  <span className="font-mono text-zinc-200">
                    {joinedItem.player.game_id}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.06]">
                  <span className="text-zinc-500">Posisi Antrian</span>
                  <span className="px-3 py-1 rounded-full bg-white text-black font-semibold text-xs tracking-tight">
                    #{joinedItem.position}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.06]">
                  <span className="text-zinc-500">Membership</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight ${
                      joinedItem.player.membership === 'VVIP'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : joinedItem.player.membership === 'VIP'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-white/[0.08] text-zinc-300 border border-white/[0.1]'
                    }`}
                  >
                    {joinedItem.player.membership}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Status Live</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-xs">
                    {joinedItem.status === 'PLAYING' ? (
                      <span className="text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                        SEDANG BERTANDING
                      </span>
                    ) : joinedItem.status === 'DONE' ? (
                      <span className="text-zinc-400">SELESAI</span>
                    ) : (
                      <span className="text-zinc-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        Menunggu Giliran #{joinedItem.position}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Live Tracker Notice */}
              <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2997ff]" />
                <span>Halaman ini otomatis merefresh posisi antrian secara live.</span>
              </div>

              <button
                onClick={() => setJoinedItem(null)}
                className="w-full py-2 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Daftarkan player lain / Reset form
              </button>
            </div>
          ) : (
            /* FORM VIEW */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Nama Player <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: GALANG"
                  className="apple-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  ID Game (In-Game ID) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  placeholder="Contoh: 12933886421 (8492)"
                  className="apple-input text-sm font-mono"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Pastikan ID Game dan Server ID akurat agar streamer dapat meng-invite kamu ke room.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-zinc-400">
                    Kode Donasi Sociabuzz
                  </label>
                  <span className="text-[10px] text-zinc-400 font-medium bg-white/[0.06] px-2 py-0.5 rounded-full border border-white/[0.08]">
                    {allowFreeQueue ? 'Opsional' : 'Wajib'}
                  </span>
                </div>
                <input
                  type="text"
                  value={donationCode}
                  onChange={(e) => setDonationCode(e.target.value)}
                  placeholder="Contoh: SB-882910 atau ID Donasi"
                  className="apple-input text-sm font-mono"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Cek email konfirmasi Sociabuzz atau bukti donasi untuk mendapatkan kode ID donasi.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-full bg-white hover:bg-zinc-100 text-black font-medium text-sm tracking-tight active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-white/5"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
            <Trophy className="w-4 h-4 text-[#ffd60a] shrink-0" />
            <div>
              <p className="font-medium text-white tracking-tight">Slot Prioritas VVIP</p>
              <p className="text-[11px] text-zinc-500">Urutan terdepan live</p>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl apple-card flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#30d158] shrink-0" />
            <div>
              <p className="font-medium text-white tracking-tight">Realtime OBS</p>
              <p className="text-[11px] text-zinc-500">Tampil instan di stream</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center text-[11px] text-zinc-600 font-normal tracking-tight py-4">
        Sistem Antrian 1v1 Streamer • Powered by Sociabuzz Webhook Integration
      </footer>
    </div>
  );
};
