import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, ZoomIn, ZoomOut, X } from "lucide-react";

import type { SlotRect } from "@/hooks/useKioskState";

interface Template {
  id: string;
  name: string;
  photos: number;
  image: string;
  orientation: "portrait" | "landscape";
  canvasWidth: number;
  canvasHeight: number;
  gridCols: number;
  slotConfig?: SlotRect[] | null;
}

interface FrameColors {
  border: string;
  glow: string;
  glowSecondary: string;
  background: string;
}

interface CompositePreviewProps {
  photos: string[];
  template: Template;
  filter: string;
  frameColors?: FrameColors;
  frameOverlayUrl?: string | null;
  customText?: string;
  onOrderChange: (newOrder: number[]) => void;
  children?: React.ReactNode; // For sticker overlay
}

const CompositePreview = ({ photos, template, filter, frameColors, frameOverlayUrl, customText, onOrderChange, children }: CompositePreviewProps) => {
  const colors = frameColors || { border: "#e040fb", glow: "#e040fb", glowSecondary: "#00e5ff", background: "#0d0d1a" };
  const [photoOrder, setPhotoOrder] = useState<number[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panStartOffset = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    setPhotoOrder(photos.map((_, i) => i));
    setSelectedSlot(null);
  }, [photos.length]);

  const cols = template.gridCols;
  const rows = Math.ceil(template.photos / cols);

  const handleSlotClick = (slotIndex: number) => {
    if (photos.length <= 1) return;
    if (selectedSlot === null) {
      setSelectedSlot(slotIndex);
    } else if (selectedSlot === slotIndex) {
      setSelectedSlot(null);
    } else {
      const newOrder = [...photoOrder];
      const temp = newOrder[selectedSlot];
      newOrder[selectedSlot] = newOrder[slotIndex];
      newOrder[slotIndex] = temp;
      setPhotoOrder(newOrder);
      setSelectedSlot(null);
      onOrderChange(newOrder);
    }
  };

  const filterClass = filter === "B&W" ? "grayscale" : filter === "Vintage" ? "sepia" : filter === "Cool" ? "hue-rotate-30 saturate-50" : "";

  const openZoom = () => { setZoomed(true); setZoomScale(1); setPanOffset({ x: 0, y: 0 }); };
  const closeZoom = () => { setZoomed(false); setZoomScale(1); setPanOffset({ x: 0, y: 0 }); };
  const handleZoomIn = () => setZoomScale((s) => Math.min(s + 0.5, 5));
  const handleZoomOut = () => {
    setZoomScale((s) => {
      const next = Math.max(s - 0.5, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoomScale <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
    panStartOffset.current = { ...panOffset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning || zoomScale <= 1) return;
    setPanOffset({
      x: panStartOffset.current.x + e.clientX - panStart.current.x,
      y: panStartOffset.current.y + e.clientY - panStart.current.y,
    });
  };
  const handlePointerUp = () => setIsPanning(false);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist.current !== null) {
        const delta = (dist - lastPinchDist.current) * 0.01;
        setZoomScale((s) => Math.max(1, Math.min(5, s + delta)));
      }
      lastPinchDist.current = dist;
    }
  };
  const handleTouchEnd = () => { lastPinchDist.current = null; };
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (zoomScale > 1) { setZoomScale(1); setPanOffset({ x: 0, y: 0 }); } else { setZoomScale(2.5); }
    }
    lastTap.current = now;
  };

  /**
   * CSS-based composite preview.
   * Background: dark frame area with neon CSS borders
   * Photos rendered in grid slots on top
   * No PNG overlay needed - frame is pure CSS with transparency
   */
  const hasUploadedFrame = frameOverlayUrl && frameOverlayUrl.startsWith("http");
  const hasCustomSlots = template.slotConfig && template.slotConfig.length > 0;

  const renderComposite = (interactive: boolean) => (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        aspectRatio: `${template.canvasWidth} / ${template.canvasHeight}`,
        background: hasUploadedFrame
          ? "#000"
          : `linear-gradient(135deg, ${colors.background} 0%, ${colors.background}ee 50%, ${colors.background} 100%)`,
      }}
    >
      {/* Programmatic neon border - only when no uploaded frame */}
      {!hasUploadedFrame && (
        <>
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              border: `2px solid ${colors.border}`,
              boxShadow: `0 0 15px ${colors.glow}80, inset 0 0 15px ${colors.glow}30, 0 0 30px ${colors.glow}40`,
              margin: "1.5%",
            }}
          />
          {[
            { top: "3%", left: "3%", borderTop: `2px solid ${colors.glowSecondary}`, borderLeft: `2px solid ${colors.glowSecondary}` },
            { top: "3%", right: "3%", borderTop: `2px solid ${colors.glowSecondary}`, borderRight: `2px solid ${colors.glowSecondary}` },
            { bottom: "3%", left: "3%", borderBottom: `2px solid ${colors.glowSecondary}`, borderLeft: `2px solid ${colors.glowSecondary}` },
            { bottom: "3%", right: "3%", borderBottom: `2px solid ${colors.glowSecondary}`, borderRight: `2px solid ${colors.glowSecondary}` },
          ].map((style, i) => (
            <div key={i} className="absolute pointer-events-none" style={{ ...style, width: "8%", height: "4%", filter: `drop-shadow(0 0 6px ${colors.glowSecondary})` }} />
          ))}
        </>
      )}

      {/* Photos - custom slot positions or grid */}
      {hasCustomSlots ? (
        <div className="absolute inset-0">
          {template.slotConfig!.map((slot, slotIdx) => {
            const photoIdx = photoOrder[slotIdx] ?? slotIdx;
            const photo = photos[photoIdx];
            return (
              <div
                key={slotIdx}
                className={`absolute overflow-hidden rounded-sm ${interactive && photos.length > 1 ? "cursor-pointer" : ""}`}
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  width: `${slot.w}%`,
                  height: `${slot.h}%`,
                  ...((!hasUploadedFrame) ? {
                    border: `1.5px solid ${colors.border}90`,
                    boxShadow: selectedSlot === slotIdx
                      ? `0 0 20px ${colors.glow}, inset 0 0 10px ${colors.glow}50`
                      : `0 0 8px ${colors.glow}40, inset 0 0 4px ${colors.glow}20`,
                  } : {}),
                }}
                onClick={interactive ? () => handleSlotClick(slotIdx) : undefined}
              >
                {photo ? (
                  <img src={photo} alt={`Foto ${slotIdx + 1}`} className={`w-full h-full object-cover ${filterClass}`} draggable={false} />
                ) : (
                  <div className="w-full h-full bg-black/40 flex items-center justify-center">
                    <span className="text-white/30 text-xs">Slot {slotIdx + 1}</span>
                  </div>
                )}
                {interactive && photos.length > 1 && (
                  <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{slotIdx + 1}</span>
                  </div>
                )}
                {interactive && selectedSlot !== null && selectedSlot !== slotIdx && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${colors.border}30` }}>
                    <ArrowLeftRight className="w-5 h-5" style={{ color: colors.border }} />
                  </div>
                )}
                {interactive && selectedSlot === slotIdx && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${colors.border}40` }}>
                    <span className="text-xs font-bold text-white rounded-lg px-2 py-0.5" style={{ backgroundColor: colors.border }}>Dipilih</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            padding: hasUploadedFrame ? "0" : "4%",
            gap: hasUploadedFrame ? "0" : "2%",
          }}
        >
          {Array.from({ length: template.photos }).map((_, slotIdx) => {
            const photoIdx = photoOrder[slotIdx] ?? slotIdx;
            const photo = photos[photoIdx];
            return (
              <div
                key={slotIdx}
                className={`relative overflow-hidden rounded-sm ${interactive && photos.length > 1 ? "cursor-pointer" : ""}`}
                style={!hasUploadedFrame ? {
                  border: `1.5px solid ${colors.border}90`,
                  boxShadow: selectedSlot === slotIdx
                    ? `0 0 20px ${colors.glow}, inset 0 0 10px ${colors.glow}50`
                    : `0 0 8px ${colors.glow}40, inset 0 0 4px ${colors.glow}20`,
                } : {}}
                onClick={interactive ? () => handleSlotClick(slotIdx) : undefined}
              >
                {photo ? (
                  <img src={photo} alt={`Foto ${slotIdx + 1}`} className={`w-full h-full object-cover ${filterClass}`} draggable={false} />
                ) : (
                  <div className="w-full h-full bg-black/40 flex items-center justify-center">
                    <span className="text-white/30 text-xs">Slot {slotIdx + 1}</span>
                  </div>
                )}
                {interactive && photos.length > 1 && (
                  <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{slotIdx + 1}</span>
                  </div>
                )}
                {interactive && selectedSlot !== null && selectedSlot !== slotIdx && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${colors.border}30` }}>
                    <ArrowLeftRight className="w-5 h-5" style={{ color: colors.border }} />
                  </div>
                )}
                {interactive && selectedSlot === slotIdx && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${colors.border}40` }}>
                    <span className="text-xs font-bold text-white rounded-lg px-2 py-0.5" style={{ backgroundColor: colors.border }}>Dipilih</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Uploaded frame overlay - rendered on top of photos */}
      {hasUploadedFrame && (
        <img
          src={frameOverlayUrl!}
          alt="Frame"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
          draggable={false}
        />
      )}

      {/* Custom text at top - only when no uploaded frame */}
      {customText && !hasUploadedFrame && (
        <div className="absolute top-0 left-0 right-0 text-center pointer-events-none z-20" style={{ paddingTop: "2%" }}>
          <span
            className="font-semibold tracking-wide"
            style={{
              fontSize: "clamp(8px, 2.5vw, 20px)",
              color: colors.glowSecondary,
              textShadow: `0 0 10px ${colors.glow}, 0 0 5px ${colors.glowSecondary}80`,
            }}
          >
            {customText}
          </span>
        </div>
      )}

      {/* Brand text at bottom - only when no uploaded frame */}
      {!hasUploadedFrame && (
        <div className="absolute bottom-0 left-0 right-0 text-center pointer-events-none z-20" style={{ paddingBottom: "1.5%" }}>
          <span
            className="font-black tracking-widest uppercase"
            style={{
              fontSize: "clamp(10px, 4vw, 32px)",
              color: colors.border,
              textShadow: `0 0 15px ${colors.glow}, 0 0 30px ${colors.glow}80, 0 0 5px #fff`,
            }}
          >
            ZMI PHOTOBOX
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full space-y-3">
      {photos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full relative group cursor-zoom-in"
          onClick={(e) => {
            if (photos.length <= 1 || selectedSlot !== null) return;
            if ((e.target as HTMLElement).closest('[data-slot]')) return;
            openZoom();
          }}
        >
          {renderComposite(true)}
          {/* Sticker overlay layer */}
          {children}
          <div className="absolute bottom-2 right-2 z-30 bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-xs text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="w-3.5 h-3.5" /> Tap untuk zoom
          </div>
        </motion.div>
      )}

      {photos.length > 1 && (
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Tap 2 foto di bingkai untuk menukar posisi
        </p>
      )}

      {/* Fullscreen zoom overlay */}
      {zoomed && photos.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="text-sm font-medium text-foreground">
              Zoom Preview — {Math.round(zoomScale * 100)}%
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleZoomOut} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <ZoomOut className="w-5 h-5 text-foreground" />
              </button>
              <button onClick={handleZoomIn} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <ZoomIn className="w-5 h-5 text-foreground" />
              </button>
              <button onClick={closeZoom} className="p-2 rounded-lg hover:bg-muted transition-colors ml-2">
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-hidden flex items-center justify-center touch-none p-4"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleDoubleTap}
          >
            <div
              className="w-full max-w-2xl"
              style={{
                transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                transition: isPanning ? "none" : "transform 0.2s ease-out",
              }}
            >
              {renderComposite(false)}
            </div>
          </div>

          <div className="text-center py-2 text-xs text-muted-foreground">
            Double-tap untuk zoom • Pinch untuk zoom • Geser untuk pan
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CompositePreview;
