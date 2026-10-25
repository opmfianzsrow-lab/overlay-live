import React, { useState } from 'react';
import { X, Save, User, Hash, Crown } from 'lucide-react';
import type { Player, MembershipType } from '../../types/queue';

interface EditPlayerModalProps {
  player: Player;
  uiTheme?: 'neobrutalism' | 'dark';
  onClose: () => void;
  onSave: (updates: { name: string; game_id: string; membership: MembershipType }) => Promise<void>;
}

export const EditPlayerModal: React.FC<EditPlayerModalProps> = ({
  player,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(player.name);
  const [gameId, setGameId] = useState(player.game_id);
  const [membership, setMembership] = useState<MembershipType>(player.membership);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ name, game_id: gameId, membership });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-3xl apple-glass border border-white/[0.12] shadow-2xl text-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-sm tracking-tight text-white">Edit Data Player</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white flex items-center justify-center border border-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              className="apple-input text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />
              Membership & Prioritas
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
              className="px-5 py-2.5 rounded-full text-xs font-medium text-black bg-white hover:bg-zinc-100 transition-all cursor-pointer active:scale-[0.98] flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
