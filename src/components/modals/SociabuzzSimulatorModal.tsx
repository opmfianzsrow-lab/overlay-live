import React, { useState } from 'react';
import { X, Send, Zap } from 'lucide-react';

interface SociabuzzSimulatorModalProps {
  uiTheme?: 'neobrutalism' | 'dark';
  onClose: () => void;
  onSimulate: (data: { donor_name: string; amount: number; message: string }) => Promise<void>;
}

export const SociabuzzSimulatorModal: React.FC<SociabuzzSimulatorModalProps> = ({
  uiTheme = 'neobrutalism',
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
      setSuccessMsg('Simulasi donasi Sociabuzz berhasil terkirim!');
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

  const isNeo = uiTheme === 'neobrutalism';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg overflow-hidden rounded-2xl ${
          isNeo
            ? 'bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000]'
            : 'bg-zinc-900 border border-zinc-800 shadow-2xl text-white'
        }`}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 ${
            isNeo
              ? 'border-b-[2.5px] border-black bg-[#FFE600] text-black'
              : 'border-b border-zinc-800 bg-zinc-950/70 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                isNeo
                  ? 'bg-black text-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-amber-400/20 text-amber-400'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-black text-base uppercase tracking-wider">
                Simulator Webhook Sociabuzz
              </h3>
              <p className={`text-[11px] font-bold ${isNeo ? 'text-zinc-800' : 'text-zinc-400'}`}>
                Uji coba aliran donasi tanpa uang riil
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg cursor-pointer ${
              isNeo
                ? 'bg-white hover:bg-zinc-100 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <form onSubmit={handleSimulate} className={`p-5 space-y-4 ${isNeo ? 'text-black' : 'text-zinc-200'}`}>
          {successMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-black text-center ${
                isNeo
                  ? 'bg-[#4EFE82] border-2 border-black text-black shadow-[3px_3px_0px_0px_#000]'
                  : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
              }`}
            >
              ✓ {successMsg}
            </div>
          )}

          {/* Presets */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider mb-2">
              Preset Donasi Cepat
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePreset('Sultan Gaming', 50000, 'Slot VVIP gas 1v1!')}
                className={`p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isNeo
                    ? 'bg-[#FFFDE8] hover:bg-[#FFE600] border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                    : 'bg-zinc-800 hover:bg-zinc-750 border border-amber-500/30'
                }`}
              >
                <div className={`text-xs font-black ${isNeo ? 'text-black' : 'text-amber-400'}`}>
                  Rp 50.000
                </div>
                <div className={`text-[10px] font-bold ${isNeo ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Tier VVIP
                </div>
              </button>
              <button
                type="button"
                onClick={() => handlePreset('Donatur Setia', 25000, 'Main bang kita duel')}
                className={`p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isNeo
                    ? 'bg-[#F6EEFF] hover:bg-[#E7D0FF] border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                    : 'bg-zinc-800 hover:bg-zinc-750 border border-purple-500/30'
                }`}
              >
                <div className={`text-xs font-black ${isNeo ? 'text-black' : 'text-purple-400'}`}>
                  Rp 25.000
                </div>
                <div className={`text-[10px] font-bold ${isNeo ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Tier VIP
                </div>
              </button>
              <button
                type="button"
                onClick={() => handlePreset('Viewer Santai', 10000, 'Semangat live-nya!')}
                className={`p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isNeo
                    ? 'bg-[#EAFAFF] hover:bg-[#C2F3FF] border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                    : 'bg-zinc-800 hover:bg-zinc-750 border border-zinc-700'
                }`}
              >
                <div className={`text-xs font-black ${isNeo ? 'text-black' : 'text-zinc-300'}`}>
                  Rp 10.000
                </div>
                <div className={`text-[10px] font-bold ${isNeo ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Tier Regular
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
              Nama Donatur (Sociabuzz)
            </label>
            <input
              type="text"
              required
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold focus:outline-none ${
                isNeo
                  ? 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFFDE8]'
                  : 'bg-zinc-800 border border-zinc-700 text-white focus:border-amber-400'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Nominal Donasi (IDR)</span>
              <span
                className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                  isNeo ? 'text-black bg-[#FFE600] border border-black' : 'text-amber-400'
                }`}
              >
                Rp {Number(amount || 0).toLocaleString('id-ID')}
              </span>
            </label>
            <div className="relative">
              <span
                className={`absolute inset-y-0 left-0 pl-3.5 flex items-center font-black text-xs ${
                  isNeo ? 'text-black' : 'text-zinc-400'
                }`}
              >
                Rp
              </span>
              <input
                type="number"
                required
                min={1000}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-mono font-bold focus:outline-none ${
                  isNeo
                    ? 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFFDE8]'
                    : 'bg-zinc-800 border border-zinc-700 text-white focus:border-amber-400'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
              Pesan Donasi
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl text-sm font-bold focus:outline-none ${
                isNeo
                  ? 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFFDE8]'
                  : 'bg-zinc-800 border border-zinc-700 text-white focus:border-amber-400'
              }`}
            />
          </div>

          <div
            className={`pt-2 flex items-center justify-end gap-2 ${
              isNeo ? 'border-t-[2.5px] border-black' : 'border-t border-zinc-800'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase cursor-pointer ${
                isNeo
                  ? 'text-black bg-zinc-100 hover:bg-zinc-200 border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={simulating}
              className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isNeo
                  ? 'bg-[#FFE600] hover:bg-[#FFD700] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                  : 'bg-amber-400 hover:bg-amber-300 text-black shadow-md'
              }`}
            >
              <Send className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{simulating ? 'Mengirim...' : 'Kirim Simulasi Webhook'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
