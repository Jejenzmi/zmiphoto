/**
 * Programmatic frame renderer for canvas export.
 * Draws neon-glowing borders around photo slots with transparent photo areas.
 */

interface FrameConfig {
  canvasWidth: number;
  canvasHeight: number;
  gridCols: number;
  totalSlots: number;
  brandText?: string;
  customText?: string;
  stickers?: { emoji: string; x: number; y: number; scale: number; rotation: number }[];
  slotConfig?: { x: number; y: number; w: number; h: number }[] | null;
  colors?: {
    border: string;
    glow: string;
    glowSecondary: string;
    background: string;
  };
}

export interface FrameColorPreset {
  id: string;
  name: string;
  emoji: string;
  colors: { border: string; glow: string; glowSecondary: string; background: string };
}

export const FRAME_COLOR_PRESETS: FrameColorPreset[] = [
  { id: "pink-neon", name: "Pink Neon", emoji: "💖", colors: { border: "#e040fb", glow: "#e040fb", glowSecondary: "#00e5ff", background: "#0d0d1a" } },
  { id: "blue-neon", name: "Biru Neon", emoji: "💙", colors: { border: "#00b0ff", glow: "#00b0ff", glowSecondary: "#7c4dff", background: "#0a0a1e" } },
  { id: "green-neon", name: "Hijau Neon", emoji: "💚", colors: { border: "#00e676", glow: "#00e676", glowSecondary: "#76ff03", background: "#0a1a0d" } },
  { id: "gold", name: "Emas", emoji: "✨", colors: { border: "#ffd600", glow: "#ffd600", glowSecondary: "#ff9100", background: "#1a150a" } },
];

const DEFAULT_COLORS = FRAME_COLOR_PRESETS[0].colors;

/**
 * Calculate slot rectangles for a given frame config.
 */
export function getSlotRects(config: FrameConfig, useFrameOverlay?: boolean) {
  const { canvasWidth: cw, canvasHeight: ch, gridCols: cols, totalSlots } = config;

  // If custom slot_config is provided (percentage-based), use it
  if (config.slotConfig && config.slotConfig.length > 0) {
    return config.slotConfig.map(s => ({
      x: (s.x / 100) * cw,
      y: (s.y / 100) * ch,
      w: (s.w / 100) * cw,
      h: (s.h / 100) * ch,
    }));
  }

  const rows = Math.ceil(totalSlots / cols);

  const padX = useFrameOverlay ? 0 : cw * 0.04;
  const padY = useFrameOverlay ? 0 : ch * 0.04;
  const gap = useFrameOverlay ? 0 : Math.min(cw, ch) * 0.02;

  const innerW = cw - padX * 2;
  const innerH = ch - padY * 2;

  const cellW = (innerW - (cols - 1) * gap) / cols;
  const cellH = (innerH - (rows - 1) * gap) / rows;

  const rects: { x: number; y: number; w: number; h: number }[] = [];

  for (let i = 0; i < totalSlots; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    rects.push({
      x: padX + col * (cellW + gap),
      y: padY + row * (cellH + gap),
      w: cellW,
      h: cellH,
    });
  }

  return rects;
}

/**
 * Draw a rounded rectangle path.
 */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw the frame overlay on a canvas context.
 * This draws the background, neon borders, and brand text.
 * Photo areas are left transparent/clear for photos to show through.
 */
export function drawFrameOverlay(
  ctx: CanvasRenderingContext2D,
  config: FrameConfig
) {
  const { canvasWidth: cw, canvasHeight: ch } = config;
  const colors = config.colors || DEFAULT_COLORS;
  const slots = getSlotRects(config);
  const cornerRadius = Math.min(cw, ch) * 0.015;

  // 1. Fill background
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, cw, ch);

  // 2. Draw outer neon glow border
  const outerPad = Math.min(cw, ch) * 0.015;
  ctx.save();
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 25;
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 3;
  roundRect(ctx, outerPad, outerPad, cw - outerPad * 2, ch - outerPad * 2, cornerRadius * 2);
  ctx.stroke();
  ctx.restore();

  // Second outer glow layer (cyan)
  ctx.save();
  ctx.shadowColor = colors.glowSecondary;
  ctx.shadowBlur = 15;
  ctx.strokeStyle = colors.glowSecondary + "60";
  ctx.lineWidth = 1.5;
  roundRect(ctx, outerPad + 4, outerPad + 4, cw - (outerPad + 4) * 2, ch - (outerPad + 4) * 2, cornerRadius * 2);
  ctx.stroke();
  ctx.restore();

  // 3. Cut out transparent areas for photo slots
  // We do this by drawing the background everywhere EXCEPT the slots
  // Since we already filled the background, we clear the slot areas
  for (const slot of slots) {
    // Clear the slot area to transparent
    ctx.clearRect(slot.x, slot.y, slot.w, slot.h);

    // Draw neon border around each slot
    ctx.save();
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = colors.border + "90";
    ctx.lineWidth = 2;
    roundRect(ctx, slot.x - 1, slot.y - 1, slot.w + 2, slot.h + 2, cornerRadius);
    ctx.stroke();
    ctx.restore();

    // Inner subtle glow
    ctx.save();
    ctx.shadowColor = colors.glowSecondary;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = colors.glowSecondary + "40";
    ctx.lineWidth = 1;
    roundRect(ctx, slot.x + 1, slot.y + 1, slot.w - 2, slot.h - 2, cornerRadius);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Brand text at bottom
  const brandText = config.brandText || "ZMI PHOTOBOX";
  const fontSize = Math.min(cw * 0.06, 48);
  ctx.save();
  ctx.font = `bold ${fontSize}px 'Arial Black', 'Impact', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  // Neon text glow
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 20;
  ctx.fillStyle = colors.border;
  const textY = ch - Math.min(cw, ch) * 0.015 - fontSize * 0.2;
  ctx.fillText(brandText, cw / 2, textY);

  // Second pass for brightness
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 5;
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.6;
  ctx.fillText(brandText, cw / 2, textY);
  ctx.restore();

  // 5. Corner decorations
  const decorSize = Math.min(cw, ch) * 0.04;
  const decorPad = outerPad + 8;
  ctx.save();
  ctx.strokeStyle = colors.glowSecondary;
  ctx.lineWidth = 2;
  ctx.shadowColor = colors.glowSecondary;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.moveTo(decorPad, decorPad + decorSize);
  ctx.lineTo(decorPad, decorPad);
  ctx.lineTo(decorPad + decorSize, decorPad);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cw - decorPad - decorSize, decorPad);
  ctx.lineTo(cw - decorPad, decorPad);
  ctx.lineTo(cw - decorPad, decorPad + decorSize);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(decorPad, ch - decorPad - decorSize);
  ctx.lineTo(decorPad, ch - decorPad);
  ctx.lineTo(decorPad + decorSize, ch - decorPad);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cw - decorPad - decorSize, ch - decorPad);
  ctx.lineTo(cw - decorPad, ch - decorPad);
  ctx.lineTo(cw - decorPad, ch - decorPad - decorSize);
  ctx.stroke();

  ctx.restore();

  // 6. Custom text (user-provided)
  if (config.customText) {
    const ctFontSize = Math.min(cw * 0.035, 28);
    ctx.save();
    ctx.font = `600 ${ctFontSize}px 'Space Grotesk', 'Arial', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12;
    ctx.fillStyle = colors.glowSecondary;
    const ctY = outerPad + 6;
    ctx.fillText(config.customText, cw / 2, ctY);
    ctx.restore();
  }

  // 7. Draw stickers
  if (config.stickers && config.stickers.length > 0) {
    for (const sticker of config.stickers) {
      const sx = (sticker.x / 100) * cw;
      const sy = (sticker.y / 100) * ch;
      const stickerSize = Math.min(cw, ch) * 0.08 * sticker.scale;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate((sticker.rotation * Math.PI) / 180);
      ctx.font = `${stickerSize}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sticker.emoji, 0, 0);
      ctx.restore();
    }
  }
}

/**
 * Draw photos on canvas in the correct slot positions, then overlay the frame.
 * This is the main function for generating the final composite.
 */
export async function drawCompositeWithFrame(
  canvas: HTMLCanvasElement,
  photos: string[],
  config: FrameConfig,
  filter?: string,
  frameOverlayUrl?: string | null
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { canvasWidth: cw, canvasHeight: ch } = config;
  canvas.width = cw;
  canvas.height = ch;

  // 1. Draw dark background
  ctx.fillStyle = config.colors?.background || DEFAULT_COLORS.background;
  ctx.fillRect(0, 0, cw, ch);

  // 2. Draw photos into slot positions
  const hasFrameOverlay = !!(frameOverlayUrl && frameOverlayUrl.startsWith("http"));
  const slots = getSlotRects(config, hasFrameOverlay);
  const cornerRadius = Math.min(cw, ch) * 0.015;

  for (let i = 0; i < Math.min(photos.length, slots.length); i++) {
    const slot = slots[i];
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = photos[i];
    await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });

    // Cover-fit crop
    const imgRatio = img.width / img.height;
    const slotRatio = slot.w / slot.h;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgRatio > slotRatio) {
      sw = img.height * slotRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / slotRatio;
      sy = (img.height - sh) / 2;
    }

    // Clip to rounded rect
    ctx.save();
    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, cornerRadius);
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, slot.x, slot.y, slot.w, slot.h);
    ctx.restore();
  }

  // 3. Apply filter
  if (filter === "B&W") {
    const imageData = ctx.getImageData(0, 0, cw, ch);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      d[i] = d[i + 1] = d[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);
  } else if (filter === "Vintage") {
    const imageData = ctx.getImageData(0, 0, cw, ch);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, d[i] * 1.1 + 20);
      d[i + 1] = Math.min(255, d[i + 1] * 0.9 + 10);
      d[i + 2] = Math.max(0, d[i + 2] * 0.8);
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // 4. Draw frame overlay on top
  if (frameOverlayUrl && frameOverlayUrl.startsWith("http")) {
    // Use uploaded PNG frame overlay
    const frameImg = new Image();
    frameImg.crossOrigin = "anonymous";
    frameImg.src = frameOverlayUrl;
    await new Promise((resolve) => { frameImg.onload = resolve; frameImg.onerror = resolve; });
    if (frameImg.naturalWidth > 0) {
      ctx.drawImage(frameImg, 0, 0, cw, ch);
    } else {
      // Fallback to programmatic frame if image failed to load
      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = cw;
      frameCanvas.height = ch;
      const frameCtx = frameCanvas.getContext("2d");
      if (frameCtx) {
        drawFrameOverlay(frameCtx, config);
        ctx.drawImage(frameCanvas, 0, 0);
      }
    }
  } else {
    // Programmatic neon frame
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = cw;
    frameCanvas.height = ch;
    const frameCtx = frameCanvas.getContext("2d");
    if (frameCtx) {
      drawFrameOverlay(frameCtx, config);
      ctx.drawImage(frameCanvas, 0, 0);
    }
  }
}
