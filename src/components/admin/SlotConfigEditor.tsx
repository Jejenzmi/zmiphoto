import { useState } from "react";
import { Plus, Trash2, RotateCcw } from "lucide-react";

export interface SlotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  slots: SlotRect[];
  onChange: (slots: SlotRect[]) => void;
  numPhotos: number;
  canvasWidth: number;
  canvasHeight: number;
  frameUrl?: string | null;
}

const DEFAULT_SLOT: SlotRect = { x: 10, y: 10, w: 30, h: 30 };

const SlotConfigEditor = ({ slots, onChange, numPhotos, canvasWidth, canvasHeight, frameUrl }: Props) => {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [dragging, setDragging] = useState<{ slotIdx: number; startX: number; startY: number; origSlot: SlotRect } | null>(null);

  const addSlot = () => {
    const offset = slots.length * 5;
    onChange([...slots, { ...DEFAULT_SLOT, x: DEFAULT_SLOT.x + offset, y: DEFAULT_SLOT.y + offset }]);
  };

  const removeSlot = (idx: number) => {
    onChange(slots.filter((_, i) => i !== idx));
    if (selectedSlot === idx) setSelectedSlot(null);
  };

  const updateSlot = (idx: number, field: keyof SlotRect, value: number) => {
    const updated = [...slots];
    updated[idx] = { ...updated[idx], [field]: Math.max(0, Math.min(100, value)) };
    onChange(updated);
  };

  const autoGenerate = () => {
    const cols = Math.ceil(Math.sqrt(numPhotos));
    const rows = Math.ceil(numPhotos / cols);
    const gap = 2;
    const slotW = (100 - gap * (cols + 1)) / cols;
    const slotH = (100 - gap * (rows + 1)) / rows;
    const generated: SlotRect[] = [];
    for (let i = 0; i < numPhotos; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      generated.push({
        x: Math.round((gap + col * (slotW + gap)) * 100) / 100,
        y: Math.round((gap + row * (slotH + gap)) * 100) / 100,
        w: Math.round(slotW * 100) / 100,
        h: Math.round(slotH * 100) / 100,
      });
    }
    onChange(generated);
  };

  const handlePointerDown = (e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    setSelectedSlot(idx);
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    setDragging({
      slotIdx: idx,
      startX: e.clientX,
      startY: e.clientY,
      origSlot: { ...slots[idx] },
    });
    (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const dx = ((e.clientX - dragging.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragging.startY) / rect.height) * 100;
    const updated = [...slots];
    updated[dragging.slotIdx] = {
      ...dragging.origSlot,
      x: Math.max(0, Math.min(100 - dragging.origSlot.w, dragging.origSlot.x + dx)),
      y: Math.max(0, Math.min(100 - dragging.origSlot.h, dragging.origSlot.y + dy)),
    };
    onChange(updated);
  };

  const handlePointerUp = () => setDragging(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Konfigurasi Slot Foto</label>
        <div className="flex gap-2">
          <button type="button" onClick={autoGenerate}
            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Auto {numPhotos} slot
          </button>
          <button type="button" onClick={addSlot}
            className="text-xs px-2 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary flex items-center gap-1">
            <Plus className="w-3 h-3" /> Tambah Slot
          </button>
        </div>
      </div>

      {/* Visual preview */}
      <div
        className="relative bg-black rounded-lg overflow-hidden border border-border touch-none"
        style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {frameUrl && (
          <img src={frameUrl} alt="Frame" className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10" />
        )}
        {slots.map((slot, idx) => (
          <div
            key={idx}
            className={`absolute cursor-move border-2 transition-colors ${
              selectedSlot === idx ? "border-primary bg-primary/30" : "border-white/60 bg-white/10"
            } flex items-center justify-center`}
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.w}%`,
              height: `${slot.h}%`,
            }}
            onPointerDown={(e) => handlePointerDown(e, idx)}
          >
            <span className="text-white text-xs font-bold drop-shadow-lg pointer-events-none">{idx + 1}</span>
          </div>
        ))}
        {slots.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
            Klik "Auto" atau "Tambah Slot" untuk mengatur posisi foto
          </div>
        )}
      </div>

      {/* Slot detail inputs */}
      {slots.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {slots.map((slot, idx) => (
            <div key={idx}
              className={`flex items-center gap-2 p-2 rounded text-xs ${selectedSlot === idx ? "bg-primary/10 border border-primary/30" : "bg-muted"}`}
              onClick={() => setSelectedSlot(idx)}
            >
              <span className="font-bold text-foreground w-6">#{idx + 1}</span>
              {(["x", "y", "w", "h"] as const).map(f => (
                <div key={f} className="flex items-center gap-0.5">
                  <span className="text-muted-foreground uppercase">{f}</span>
                  <input type="number" value={Math.round(slot[f] * 10) / 10}
                    onChange={(e) => updateSlot(idx, f, parseFloat(e.target.value) || 0)}
                    className="w-14 bg-background border border-border rounded px-1 py-0.5 text-foreground text-xs font-mono"
                    step={0.5} min={0} max={100} />
                </div>
              ))}
              <button type="button" onClick={(e) => { e.stopPropagation(); removeSlot(idx); }}
                className="text-destructive/60 hover:text-destructive ml-auto">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Semua nilai dalam persen (%). Jumlah slot = jumlah jepretan kamera. Drag slot di preview untuk memposisikan.
      </p>
    </div>
  );
};

export default SlotConfigEditor;
