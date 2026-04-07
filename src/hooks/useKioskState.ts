import { useState, useCallback } from "react";
import { DEFAULT_BEAUTY, type BeautyFilter } from "@/components/kiosk/BeautyFilterControls";
import { FRAME_COLOR_PRESETS, type FrameColorPreset } from "@/utils/frameRenderer";
import type { Sticker } from "@/components/kiosk/StickerOverlay";

export type KioskState = "IDLE" | "INSTRUCTIONS" | "SELECTION" | "PAYMENT" | "FRAME" | "SESSION" | "PREVIEW" | "COMPOSITING" | "PRINTING" | "DONE";
export type Orientation = "portrait" | "landscape";
export type ProductType = "photostrip" | "a3";

export interface SlotRect {
  x: number; // percentage 0-100
  y: number;
  w: number;
  h: number;
}

export interface Template {
  id: string;
  name: string;
  photos: number;
  desc: string;
  image: string;
  price: number;
  orientation: Orientation;
  canvasWidth: number;
  canvasHeight: number;
  gridCols: number;
  slotConfig?: SlotRect[] | null;
}

export function useKioskState(initialTemplate: Template) {
  const [state, setState] = useState<KioskState>("IDLE");
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(initialTemplate);
  const [photosTaken, setPhotosTaken] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [countdownDuration, setCountdownDuration] = useState(3);
  const [captureMode, setCaptureMode] = useState<"auto" | "manual">("auto");
  const [selectedFilter, setSelectedFilter] = useState("Original");
  const [printProgress, setPrintProgress] = useState(0);
  const [shortCode, setShortCode] = useState("");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedImageUrl, setEnhancedImageUrl] = useState<string | null>(null);
  const [selectedEnhancement, setSelectedEnhancement] = useState<string | null>(null);
  const [compositePreview, setCompositePreview] = useState<string | null>(null);
  const [photoOrder, setPhotoOrder] = useState<number[]>([]);
  const [selected3DTheme, setSelected3DTheme] = useState<string | null>(null);
  const [captured3DUrl, setCaptured3DUrl] = useState<string | null>(null);
  const [frameColor, setFrameColor] = useState<FrameColorPreset>(FRAME_COLOR_PRESETS[0]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [customText, setCustomText] = useState("");
  const [beautyFilter, setBeautyFilter] = useState<BeautyFilter>(DEFAULT_BEAUTY);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [productType, setProductType] = useState<ProductType>("photostrip");

  const reset = useCallback(() => {
    setState("IDLE");
    setPhotosTaken(0);
    setCountdown(0);
    setSelectedFilter("Original");
    setPrintProgress(0);
    setShortCode("");
    setTransactionId(null);
    setEnhancedImageUrl(null);
    setSelectedEnhancement(null);
    setEnhancing(false);
    setCapturedPhotos([]);
    setUploading(false);
    setCompositePreview(null);
    setPhotoOrder([]);
    setCaptureMode("auto");
    setStickers([]);
    setCustomText("");
    setBeautyFilter(DEFAULT_BEAUTY);
    setSelected3DTheme(null);
    setCaptured3DUrl(null);
    setFlashActive(false);
    setProductType("photostrip");
  }, []);

  return {
    state, setState,
    selectedTemplate, setSelectedTemplate,
    photosTaken, setPhotosTaken,
    countdown, setCountdown,
    countdownDuration, setCountdownDuration,
    captureMode, setCaptureMode,
    selectedFilter, setSelectedFilter,
    printProgress, setPrintProgress,
    shortCode, setShortCode,
    transactionId, setTransactionId,
    enhancing, setEnhancing,
    enhancedImageUrl, setEnhancedImageUrl,
    selectedEnhancement, setSelectedEnhancement,
    compositePreview, setCompositePreview,
    photoOrder, setPhotoOrder,
    selected3DTheme, setSelected3DTheme,
    captured3DUrl, setCaptured3DUrl,
    frameColor, setFrameColor,
    stickers, setStickers,
    customText, setCustomText,
    beautyFilter, setBeautyFilter,
    capturedPhotos, setCapturedPhotos,
    uploading, setUploading,
    flashActive, setFlashActive,
    productType, setProductType,
    reset,
  };
}
