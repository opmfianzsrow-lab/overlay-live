import React, { useState } from 'react';
import { X, UserPlus, User, Hash, Crown } from 'lucide-react';
import type { MembershipType } from '../../types/queue';

interface AddPlayerModalProps {
  uiTheme?: 'neobrutalism' | 'dark';
  onClose: () => void;
  onAdd: (data: { name: string; game_id: string; membership: MembershipType }) => Promise<void>;
}

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-3xl apple-glass border border-white/[0.12] shadow-2xl text-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm tracking-tight text-white">Tambah Player Manual</h3>
              <p className="text-[11px] text-zinc-500">Sisipkan player langsung ke dalam antrian</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white flex items-center justify-center border border-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Nama Player
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: RAFFI A"
              className="apple-input text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              ID Game
            </label>
            <input
              type="text"
              required
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Contoh: 1948271048"
              className="apple-input text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />
              Tingkat Prioritas (Membership)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['REGULAR', 'VIP', 'VVIP'] as MembershipType[]).map((tier) => (
                <button
                  type="button"
                  key={tier}
                  onClick={() => setMembership(tier)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium tracking-tight transition-all cursor-pointer ${
                    membership === tier
                      ? tier === 'VVIP'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm'
                        : tier === 'VIP'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-sm'
                        : 'bg-white text-black shadow-sm'
                      : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06] hover:bg-white/[0.08]'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-medium text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-full text-xs font-medium text-black bg-white hover:bg-zinc-100 transition-all cursor-pointer active:scale-[0.98]"
            >
              {saving ? 'Menyimpan...' : 'Tambahkan ke Antrian'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
