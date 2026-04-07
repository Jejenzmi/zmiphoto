import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";

export interface Sticker {
  id: string;
  emoji: string;
  x: number; // percentage
  y: number; // percentage
  scale: number;
  rotation: number;
}

const STICKER_PACKS = [
  { name: "Aesthetic", items: ["✨", "💫", "🌟", "⭐", "🦋", "🌈", "🌸", "🍃", "☁️", "💎", "🔮", "🪩"] },
  { name: "Ekspresi", items: ["😍", "🥰", "😎", "🤩", "🥺", "😜", "🤪", "😈", "👻", "🥳", "🫶", "💀"] },
  { name: "Props", items: ["👑", "🎀", "🧸", "🎈", "🎉", "🎊", "💐", "🌺", "🍭", "🍩", "🧁", "🎸"] },
  { name: "Love", items: ["❤️", "🩷", "💜", "💙", "💚", "💛", "🧡", "🤍", "🖤", "❤️‍🔥", "💝", "💘"] },
  { name: "Fun", items: ["🔥", "💯", "⚡", "🌊", "🎭", "🃏", "🫧", "🪄", "✈️", "🛸", "🎪", "🎯"] },
];

/**
 * Visual layer — renders draggable stickers on the preview.
 */
export const StickerLayer = ({ stickers, onStickersChange }: { stickers: Sticker[]; onStickersChange: (s: Sticker[]) => void }) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; stickerX: number; stickerY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const removeSticker = (id: string) => onStickersChange(stickers.filter((s) => s.id !== id));

  const handlePointerDown = (e: React.PointerEvent, sticker: Sticker) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingId(sticker.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, stickerX: sticker.x, stickerY: sticker.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    const newX = Math.max(0, Math.min(95, dragRef.current.stickerX + dx));
    const newY = Math.max(0, Math.min(95, dragRef.current.stickerY + dy));
    onStickersChange(stickers.map((s) => (s.id === draggingId ? { ...s, x: newX, y: newY } : s)));
  };

  const handlePointerUp = () => { setDraggingId(null); dragRef.current = null; };

  if (stickers.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20"
      style={{ pointerEvents: draggingId ? "auto" : "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {stickers.map((sticker) => (
        <div
          key={sticker.id}
          className="absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none group"
          style={{
            left: `${sticker.x}%`,
            top: `${sticker.y}%`,
            transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
            fontSize: "clamp(24px, 8vw, 48px)",
            zIndex: draggingId === sticker.id ? 30 : 20,
            filter: draggingId === sticker.id ? "drop-shadow(0 0 10px rgba(255,255,255,0.5))" : "none",
          }}
          onPointerDown={(e) => handlePointerDown(e, sticker)}
        >
          <span className="select-none">{sticker.emoji}</span>
          <button
            onClick={(e) => { e.stopPropagation(); removeSticker(sticker.id); }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

/**
 * Controls — sticker picker buttons and emoji grid.
 */
export const StickerControls = ({ stickers, onStickersChange }: { stickers: Sticker[]; onStickersChange: (s: Sticker[]) => void }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [activePack, setActivePack] = useState(0);

  const addSticker = (emoji: string) => {
    const s: Sticker = {
      id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      emoji,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      scale: 1,
      rotation: Math.random() * 30 - 15,
    };
    onStickersChange([...stickers, s]);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            showPicker ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Stiker {stickers.length > 0 && `(${stickers.length})`}
        </button>
        {stickers.length > 0 && (
          <button
            onClick={() => onStickersChange([])}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Hapus
          </button>
        )}
      </div>

      {showPicker && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 glass-card rounded-xl p-3">
          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
            {STICKER_PACKS.map((pack, i) => (
              <button
                key={pack.name}
                onClick={() => setActivePack(i)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                  activePack === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {pack.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1">
            {STICKER_PACKS[activePack].items.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                onClick={() => addSticker(emoji)}
                className="w-10 h-10 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
