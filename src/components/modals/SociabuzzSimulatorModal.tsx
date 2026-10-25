import React, { useState } from 'react';
import { X, Send, Zap } from 'lucide-react';

interface SociabuzzSimulatorModalProps {
  uiTheme?: 'neobrutalism' | 'dark';
  onClose: () => void;
  onSimulate: (data: { donor_name: string; amount: number; message: string }) => Promise<void>;
}

export const SociabuzzSimulatorModal: React.FC<SociabuzzSimulatorModalProps> = ({
  onClose,
  onSimulate,
}) => {
  const [donorName, setDonorName] = useState('Budi Gaming');
  const [amount, setAmount] = useState<number>(25000);
  const [message, setMessage] = useState('Gaskeun 1v1 bang hero favorit!');
  const [simulating, setSimulating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setSuccessMsg('');
    try {
      await onSimulate({ donor_name: donorName, amount: Number(amount), message });
      setSuccessMsg('Simulasi donasi Sociabuzz berhasil dikirim!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } finally {
      setSimulating(false);
    }
  };

  const handlePreset = (name: string, amt: number, msg: string) => {
    setDonorName(name);
    setAmount(amt);
    setMessage(msg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl apple-glass border border-white/[0.12] shadow-2xl text-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-semibold text-sm tracking-tight text-white">
                Simulator Webhook Sociabuzz
              </h3>
              <p className="text-[11px] text-zinc-500">
                Uji coba aliran donasi webhook tanpa transaksi finansial nyata
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white flex items-center justify-center border border-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSimulate} className="p-6 space-y-4">
          {successMsg && (
            <div className="p-3 rounded-2xl text-xs font-medium text-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              ✓ {successMsg}
            </div>
          )}

          {/* Presets */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-2">
              Preset Donasi Cepat
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePreset('Sultan Gaming', 50000, 'Slot VVIP gas 1v1!')}
                className="p-3 rounded-2xl text-left bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
              >
                <div className="text-xs font-medium text-amber-300">Rp 50.000</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">VVIP Auto Priority</div>
              </button>
              <button
                type="button"
                onClick={() => handlePreset('Pro Gamer 99', 25000, 'Tantang streamer!')}
                className="p-3 rounded-2xl text-left bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
              >
                <div className="text-xs font-medium text-purple-300">Rp 25.000</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">VIP Regular</div>
              </button>
              <button
                type="button"
                onClick={() => handlePreset('Viewer Setia', 10000, 'Semangat live-nya!')}
                className="p-3 rounded-2xl text-left bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
              >
                <div className="text-xs font-medium text-zinc-200">Rp 10.000</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Standard Queue</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Nama Donatur
            </label>
            <input
              type="text"
              required
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              className="apple-input text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Jumlah Nominal (IDR)
            </label>
            <input
              type="number"
              required
              min="1000"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="apple-input text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Pesan Donasi (Bisa menyertakan ID Game)
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="apple-input text-sm resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-medium text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={simulating}
              className="px-5 py-2.5 rounded-full text-xs font-medium text-black bg-white hover:bg-zinc-100 transition-all cursor-pointer active:scale-[0.98] flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{simulating ? 'Mengirim...' : 'Kirim Simulasi Webhook'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
