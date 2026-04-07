import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CompositePreview from "@/components/kiosk/CompositePreview";
import { StickerLayer, StickerControls, type Sticker } from "@/components/kiosk/StickerOverlay";
import CustomTextInput from "@/components/kiosk/CustomTextInput";
import { FRAME_COLOR_PRESETS, type FrameColorPreset } from "@/utils/frameRenderer";
import type { Template } from "@/hooks/useKioskState";

const FILTERS = ["Original", "B&W", "Vintage", "Cool", "Warm", "Sepia"];

interface Props {
  capturedPhotos: string[];
  template: Template;
  frameOverlayUrl?: string | null;
  selectedFilter: string;
  setSelectedFilter: (f: string) => void;
  frameColor: FrameColorPreset;
  setFrameColor: (c: FrameColorPreset) => void;
  customText: string;
  setCustomText: (t: string) => void;
  stickers: Sticker[];
  setStickers: (s: Sticker[]) => void;
  selected3DTheme: string | null;
  setSelected3DTheme: (t: string | null) => void;
  onOrderChange: (order: number[]) => void;
  onCapture3D: (url: string) => void;
  onPrint: () => void;
}

const COMPOSITING_TIMER = 300; // 5 minutes

const KioskCompositingScreen = ({
  capturedPhotos, template, frameOverlayUrl, selectedFilter, setSelectedFilter,
  frameColor, setFrameColor, customText, setCustomText,
  stickers, setStickers, selected3DTheme, setSelected3DTheme,
  onOrderChange, onCapture3D, onPrint,
}: Props) => {
  const [timeLeft, setTimeLeft] = useState(COMPOSITING_TIMER);

  useEffect(() => {
    if (timeLeft <= 0) { onPrint(); return; }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, onPrint]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}.${String(s % 60).padStart(2, "0")}`;

  return (
  <motion.div
    key="compositing"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-40 jebox-gray-bg flex flex-col"
  >
    {/* Top bar */}
    <div className="flex items-center justify-between px-6 py-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full jebox-blue-bg flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm tracking-wider">{formatTime(timeLeft)}</span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-light text-primary tracking-jebox text-center flex-1 mx-4">
        SELECT YOUR FAVORITE FILTER
      </h2>
    </div>

    {/* Main: Preview + Filter chooser */}
    <div className="flex-1 flex gap-4 px-6 pb-6 min-h-0">
      {/* Left: Photo Preview */}
      <div className="w-1/2 flex flex-col">
        <div className="browser-window flex-1 bg-card/30 flex flex-col">
          <div className="browser-titlebar">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-primary" />
              <span className="text-xs text-primary tracking-wider font-medium">PHOTO PREVIEW</span>
            </div>
            <span className="text-primary text-sm">×</span>
          </div>
          <div className="flex-1 p-4 flex items-center justify-center overflow-hidden relative">
            <CompositePreview
              photos={capturedPhotos}
              template={template}
              filter={selectedFilter}
              frameColors={frameColor.colors}
              frameOverlayUrl={frameOverlayUrl}
              customText={customText}
              onOrderChange={onOrderChange}
            >
              <StickerLayer stickers={stickers} onStickersChange={setStickers} />
            </CompositePreview>
          </div>
        </div>
      </div>

      {/* Right: Filter chooser */}
      <div className="w-1/2 flex flex-col">
        <div className="browser-window flex-1 bg-card/30 flex flex-col">
          <div className="browser-titlebar">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-primary" />
              <span className="text-xs text-primary tracking-wider font-medium">CHOOSE YOUR FILTER</span>
            </div>
            <span className="text-primary text-sm">×</span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {/* Filter buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  className={`py-3 px-4 rounded-lg text-sm font-medium tracking-wider transition-all ${
                    selectedFilter === f
                      ? "jebox-blue-bg text-primary-foreground"
                      : "border-2 border-primary/30 text-primary hover:border-primary"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Frame colors */}
            <div>
              <p className="text-xs text-primary/60 tracking-wider mb-2 uppercase">Frame Color</p>
              <div className="flex gap-2 flex-wrap">
                {FRAME_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setFrameColor(preset)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      frameColor.name === preset.name ? "border-primary scale-110" : "border-primary/20"
                    }`}
                    style={{ backgroundColor: preset.colors.background }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            {/* Stickers + Text */}
            <div className="flex items-center gap-2 flex-wrap">
              <StickerControls stickers={stickers} onStickersChange={setStickers} />
              <CustomTextInput value={customText} onChange={setCustomText} />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end p-4 border-t-2 border-primary/20">
            <motion.button
              onClick={onPrint}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-2.5 rounded-full bg-accent text-accent-foreground font-medium text-sm tracking-wider"
            >
              PRINT →
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
  );
};

export default KioskCompositingScreen;
