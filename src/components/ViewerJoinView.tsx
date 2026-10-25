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

  // Load basic public settings
  useEffect(() => {
    fetch('/api/public/overlay/preview').catch(() => null);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code') || params.get('donation_id');
      if (code) setDonationCode(code);
      const prefilledName = params.get('name') || params.get('donor');
      if (prefilledName) setName(prefilledName);
    }
  }, []);

  // Poll or track live position if user is joined
  useEffect(() => {
    if (!joinedItem) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/status/${joinedItem.player_id}`);
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
  }, [joinedItem]);

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
    <div className="min-h-screen bg-[#F5F2EB] text-black flex flex-col justify-between p-4 sm:p-6 font-sans selection:bg-[#FFE600] selection:text-black">
      <div className="max-w-md w-full mx-auto my-auto py-6">
        {/* Brand Banner (Neobrutalism) */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#FFE600] border-[2.5px] border-black text-black mb-3 shadow-[4px_4px_0px_0px_#000]">
            <Swords className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black uppercase">
            Pendaftaran Antrian 1v1
          </h1>
          <p className="text-zinc-700 text-xs font-bold mt-1.5">
            Daftarkan ID Game kamu untuk tanding 1v1 live di stream!
          </p>
        </div>

        {/* Step 1 Callout: Sociabuzz Donation Banner */}
        <div className="mb-6 rounded-2xl bg-[#FFE600] border-[3px] border-black p-4.5 shadow-[5px_5px_0px_0px_#000]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-black text-[#FFE600] border border-black shadow-[1.5px_1.5px_0px_0px_#000]">
                  Langkah 1
                </span>
                <h3 className="font-black text-black text-sm uppercase tracking-wider">
                  Donasi via Sociabuzz
                </h3>
              </div>
              <p className="text-xs text-black font-bold mt-1 leading-relaxed">
                Belum donasi? Buka link donasi resmi streamer di Sociabuzz untuk mendapatkan kode
                donasi & prioritas VIP/VVIP.
              </p>
            </div>
            <a
              href="https://sociabuzz.com"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 text-black font-black text-xs uppercase border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              <span>Donasi</span>
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
            </a>
          </div>
        </div>

        {/* Main Card: Form or Success Status */}
        <div className="rounded-2xl bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_0px_#000]">
          {joinedItem ? (
            /* SUCCESS VIEW */
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#4EFE82] border-2 border-black text-center shadow-[3px_3px_0px_0px_#000]">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white text-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                  <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                </div>
                <h2 className="text-lg font-black text-black tracking-wide uppercase">
                  ✓ Berhasil Masuk Antrian!
                </h2>
                <p className="text-xs text-black font-bold mt-0.5">
                  ID kamu sudah masuk ke sistem overlay OBS streamer
                </p>
              </div>

              {/* Receipt Details */}
              <div className="bg-zinc-50 rounded-xl p-4 border-2 border-black shadow-[3px_3px_0px_0px_#000] space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center pb-2 border-b-2 border-black">
                  <span className="text-zinc-600 text-xs font-black uppercase font-sans">Nama</span>
                  <span className="font-black text-black text-base font-sans">
                    {joinedItem.player.name}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b-2 border-black">
                  <span className="text-zinc-600 text-xs font-black uppercase font-sans">ID Game</span>
                  <span className="font-black text-black tracking-wider">
                    {joinedItem.player.game_id}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b-2 border-black">
                  <span className="text-zinc-600 text-xs font-black uppercase font-sans">
                    Posisi Saat Ini
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[#FFE600] text-black font-black text-base border-2 border-black shadow-[2px_2px_0px_0px_#000] font-sans">
                    #{joinedItem.position}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b-2 border-black">
                  <span className="text-zinc-600 text-xs font-black uppercase font-sans">
                    Membership
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-black uppercase border-2 border-black font-sans shadow-[1.5px_1.5px_0px_0px_#000] ${
                      joinedItem.player.membership === 'VVIP'
                        ? 'bg-[#FFE600] text-black'
                        : joinedItem.player.membership === 'VIP'
                        ? 'bg-[#A259FF] text-white'
                        : 'bg-black text-white'
                    }`}
                  >
                    {joinedItem.player.membership}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 text-xs font-black uppercase font-sans">Status</span>
                  <span className="inline-flex items-center gap-1.5 font-black text-xs uppercase font-sans">
                    {joinedItem.status === 'PLAYING' ? (
                      <span className="text-black bg-[#FF4D4D] text-white px-2 py-0.5 rounded border border-black shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        SEDANG BERMAIN (LIVE)
                      </span>
                    ) : joinedItem.status === 'DONE' ? (
                      <span className="text-zinc-600">SELESAI</span>
                    ) : (
                      <span className="text-black flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                        MENUNGGU #{joinedItem.position}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Live Tracker Notice */}
              <div className="p-3 bg-[#EAFAFF] border-2 border-black rounded-xl text-center text-xs text-black font-bold flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_#000]">
                <RefreshCw className="w-4 h-4 animate-spin text-black stroke-[2.5]" />
                <span>Halaman ini otomatis mengupdate giliran antrian kamu.</span>
              </div>

              <button
                onClick={() => setJoinedItem(null)}
                className="w-full py-2.5 text-xs text-black font-black uppercase hover:underline cursor-pointer"
              >
                Daftarkan player lain / Reset form
              </button>
            </div>
          ) : (
            /* FORM VIEW */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-[#FF4D4D] border-2 border-black text-white text-xs font-black flex items-start gap-2 shadow-[3px_3px_0px_0px_#000]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white stroke-[2.5]" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
                  Nama Player <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: GALANG"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-black text-black placeholder-zinc-400 font-bold text-sm shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFFDE8] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
                  ID Game (In-Game ID) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  placeholder="Contoh: 12933886421 (8492)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-black text-black placeholder-zinc-400 font-mono font-bold text-sm shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFFDE8] transition-all"
                />
                <span className="text-[11px] text-zinc-600 font-bold mt-1 block">
                  Pastikan ID Game dan Server ID akurat agar streamer dapat meng-invite kamu ke room.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider">
                    Kode Donasi / ID Donasi Sociabuzz
                  </label>
                  <span className="text-[10px] text-black font-black bg-[#FFE600] px-1.5 py-0.5 rounded border border-black">
                    {allowFreeQueue ? 'Opsional' : 'Wajib'}
                  </span>
                </div>
                <input
                  type="text"
                  value={donationCode}
                  onChange={(e) => setDonationCode(e.target.value)}
                  placeholder="Contoh: SB-882910 atau ID Donasi"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-black text-black placeholder-zinc-400 font-mono font-bold text-sm shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFFDE8] transition-all"
                />
                <span className="text-[11px] text-zinc-600 font-bold mt-1 block">
                  Cek email konfirmasi Sociabuzz atau struk bukti donasi untuk mendapatkan kode ID
                  donasi.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#FFE600] hover:bg-[#FFD700] text-black font-black text-sm uppercase tracking-wider border-[2.5px] border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Memvalidasi...</span>
                    </>
                  ) : (
                    <>
                      <span>MASUK ANTRIAN</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Benefits Card (Neobrutalism) */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-black shrink-0 stroke-[2.5]" />
            <div>
              <p className="font-black text-black uppercase">Slot VVIP</p>
              <p className="text-[11px] text-zinc-600 font-bold">Prioritas paling atas</p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-black shrink-0 stroke-[2.5]" />
            <div>
              <p className="font-black text-black uppercase">Realtime OBS</p>
              <p className="text-[11px] text-zinc-600 font-bold">Tampil langsung di live</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-black font-black uppercase tracking-wider py-3">
        Sistem Antrian 1v1 Streamer • Powered by Sociabuzz Integration
      </footer>
    </div>
  );
};
