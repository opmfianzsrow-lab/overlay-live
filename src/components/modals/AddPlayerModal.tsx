import React, { useState } from 'react';
import { X, UserPlus, User, Hash, Crown } from 'lucide-react';
import type { MembershipType } from '../../types/queue';

interface AddPlayerModalProps {
  uiTheme?: 'neobrutalism' | 'dark';
  onClose: () => void;
  onAdd: (data: { name: string; game_id: string; membership: MembershipType }) => Promise<void>;
}

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  uiTheme = 'neobrutalism',
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [gameId, setGameId] = useState('');
  const [membership, setMembership] = useState<MembershipType>('REGULAR');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !gameId.trim()) {
      setError('Semua kolom wajib diisi');
      return;
    }

    setSaving(true);
    try {
      await onAdd({ name: name.trim(), game_id: gameId.trim(), membership });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Gagal menambahkan player');
      }
    } finally {
      setSaving(false);
    }
  };

  const isNeo = uiTheme === 'neobrutalism';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-md overflow-hidden rounded-2xl ${
          isNeo
            ? 'bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000]'
            : 'bg-zinc-900 border border-zinc-800 shadow-2xl text-white'
        }`}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 ${
            isNeo
              ? 'border-b-[2.5px] border-black bg-[#4EFE82] text-black'
              : 'border-b border-zinc-800 bg-zinc-950/70 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 stroke-[2.5]" />
            <h3 className="font-black text-base uppercase tracking-wider">Tambah Player Manual</h3>
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

        <form onSubmit={handleSubmit} className={`p-5 space-y-4 ${isNeo ? 'text-black' : 'text-zinc-200'}`}>
          {error && (
            <div
              className={`p-3 rounded-xl text-xs font-black ${
                isNeo
                  ? 'bg-[#FF4D4D] border-2 border-black text-white shadow-[3px_3px_0px_0px_#000]'
                  : 'bg-red-950/70 border border-red-500/40 text-red-300'
              }`}
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Nama Player
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: RAFFI A"
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-sm focus:outline-none ${
                isNeo
                  ? 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFFDE8]'
                  : 'bg-zinc-800 border border-zinc-700 text-white focus:border-red-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              ID Game
            </label>
            <input
              type="text"
              required
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Contoh: 1948271048"
              className={`w-full px-3.5 py-2.5 rounded-xl font-mono font-bold text-sm focus:outline-none ${
                isNeo
                  ? 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_#000] focus:bg-[#FFFDE8]'
                  : 'bg-zinc-800 border border-zinc-700 text-white focus:border-red-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />
              Tentukan Membership
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['REGULAR', 'VIP', 'VVIP'] as MembershipType[]).map((tier) => (
                <button
                  type="button"
                  key={tier}
                  onClick={() => setMembership(tier)}
                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isNeo
                      ? `border-2 border-black ${
                          membership === tier
                            ? tier === 'VVIP'
                              ? 'bg-[#FFE600] text-black shadow-[3px_3px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                              : tier === 'VIP'
                              ? 'bg-[#A259FF] text-white shadow-[3px_3px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                              : 'bg-black text-white shadow-[3px_3px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                            : 'bg-zinc-100 text-black hover:bg-zinc-200'
                        }`
                      : `border ${
                          membership === tier
                            ? tier === 'VVIP'
                              ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                              : tier === 'VIP'
                              ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                              : 'bg-zinc-700 text-white border-zinc-500'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-750'
                        }`
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`pt-3 flex items-center justify-end gap-2 ${
              isNeo ? 'border-t-[2.5px] border-black' : 'border-t border-zinc-800'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase cursor-pointer ${
                isNeo
                  ? 'text-black bg-zinc-100 hover:bg-zinc-200 border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isNeo
                  ? 'bg-[#4EFE82] hover:bg-[#3de870] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-md'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{saving ? 'Menambahkan...' : 'Tambah ke Antrian'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
