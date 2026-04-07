import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Sun, SmilePlus } from "lucide-react";

export interface BeautyFilter {
  smooth: number;   // 0-100, maps to blur
  brighten: number;  // 0-100, maps to brightness
  slim: number;      // 0-100, maps to scaleX
}

export const DEFAULT_BEAUTY: BeautyFilter = { smooth: 0, brighten: 0, slim: 0 };

const BEAUTY_PRESETS = [
  { name: "Natural", emoji: "🌿", value: { smooth: 20, brighten: 15, slim: 5 } },
  { name: "Glow Up", emoji: "✨", value: { smooth: 40, brighten: 30, slim: 10 } },
  { name: "Smooth", emoji: "🧖", value: { smooth: 60, brighten: 10, slim: 0 } },
  { name: "Idol", emoji: "💫", value: { smooth: 50, brighten: 25, slim: 15 } },
];

interface BeautyFilterControlsProps {
  beauty: BeautyFilter;
  onChange: (b: BeautyFilter) => void;
}

/**
 * Converts beauty filter values to CSS filter + transform strings for the video element.
 */
export function getBeautyCSS(beauty: BeautyFilter) {
  const blur = (beauty.smooth / 100) * 1.5; // max 1.5px blur
  const brightness = 1 + (beauty.brighten / 100) * 0.4; // max 1.4x
  const contrast = 1 + (beauty.brighten / 100) * 0.1; // slight contrast boost
  const scaleX = 1 - (beauty.slim / 100) * 0.08; // max 8% narrower

  const filter = `blur(${blur}px) brightness(${brightness}) contrast(${contrast})`;
  const transform = `scaleX(-${scaleX})`; // includes mirror

  return { filter, transform };
}

/**
 * Apply beauty filter when capturing from webcam canvas.
 */
export function applyBeautyToCanvas(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  beauty: BeautyFilter
) {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;

  // Mirror
  ctx.translate(w, 0);
  ctx.scale(-1, 1);

  // Apply slim (scaleX)
  if (beauty.slim > 0) {
    const sx = 1 - (beauty.slim / 100) * 0.08;
    const offset = (w * (1 - sx)) / 2;
    ctx.translate(offset, 0);
    ctx.scale(sx, 1);
  }

  // Apply blur via filter
  const blur = (beauty.smooth / 100) * 1.5;
  const brightness = 1 + (beauty.brighten / 100) * 0.4;
  const contrast = 1 + (beauty.brighten / 100) * 0.1;
  ctx.filter = `blur(${blur}px) brightness(${brightness}) contrast(${contrast})`;

  ctx.drawImage(video, 0, 0, w, h);
  ctx.filter = "none";
}

const BeautyFilterControls = ({ beauty, onChange }: BeautyFilterControlsProps) => {
  const [expanded, setExpanded] = useState(false);
  const isActive = beauty.smooth > 0 || beauty.brighten > 0 || beauty.slim > 0;

  return (
    <div className="w-full">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          isActive ? "bg-pink-500/20 text-pink-300 border border-pink-500/30" : "bg-muted/80 text-muted-foreground hover:text-foreground"
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Beauty {isActive ? "ON" : "OFF"}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 glass-card rounded-xl p-3 space-y-3"
        >
          {/* Presets */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => onChange(DEFAULT_BEAUTY)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                !isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              Off
            </button>
            {BEAUTY_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => onChange(preset.value)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                  beauty.smooth === preset.value.smooth && beauty.brighten === preset.value.brighten
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {preset.emoji} {preset.name}
              </button>
            ))}
          </div>

          {/* Sliders */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-14">🧖 Smooth</span>
              <input
                type="range"
                min={0}
                max={100}
                value={beauty.smooth}
                onChange={(e) => onChange({ ...beauty, smooth: +e.target.value })}
                className="flex-1 h-1.5 accent-pink-400"
              />
              <span className="text-[10px] text-foreground w-6 text-right">{beauty.smooth}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-14">☀️ Bright</span>
              <input
                type="range"
                min={0}
                max={100}
                value={beauty.brighten}
                onChange={(e) => onChange({ ...beauty, brighten: +e.target.value })}
                className="flex-1 h-1.5 accent-yellow-400"
              />
              <span className="text-[10px] text-foreground w-6 text-right">{beauty.brighten}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-14">📐 Slim</span>
              <input
                type="range"
                min={0}
                max={100}
                value={beauty.slim}
                onChange={(e) => onChange({ ...beauty, slim: +e.target.value })}
                className="flex-1 h-1.5 accent-purple-400"
              />
              <span className="text-[10px] text-foreground w-6 text-right">{beauty.slim}</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default BeautyFilterControls;
