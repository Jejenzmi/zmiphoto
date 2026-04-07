/**
 * Photo Receipt generator — creates a real photostrip-style receipt
 * with actual captured photos stacked vertically + event info at bottom,
 * like a classic photo booth strip.
 */

interface ReceiptData {
  shortCode: string;
  templateName: string;
  filterApplied: string;
  photoCount: number;
  venueName?: string;
  venueType?: string;
  price: number;
  date: Date;
  compositeUrl?: string | null;
  capturedPhotos?: string[];
  galleryUrl: string;
  eventName?: string;
}

/**
 * Load an image from a data URL or URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Generate a photostrip-style receipt with actual photos
 * Similar to classic photo booth strips: photos stacked vertically
 * with event name and date at the bottom on white background.
 */
export async function generateDigitalReceipt(data: ReceiptData): Promise<string> {
  const canvas = document.createElement("canvas");

  const photos = data.capturedPhotos || [];
  const photoCount = photos.length || data.photoCount;

  // Strip dimensions (2x6 inch at 150dpi-ish for screen)
  const stripW = 400;
  const photoSlotH = 260;
  const padding = 16;
  const photoGap = 8;
  const bottomInfoH = 120;
  const topPad = 12;

  const totalPhotoH = photoCount * photoSlotH + (photoCount - 1) * photoGap;
  const stripH = topPad + totalPhotoH + bottomInfoH + padding;

  canvas.width = stripW;
  canvas.height = stripH;
  const ctx = canvas.getContext("2d")!;

  // --- White background ---
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, stripW, stripH);

  // --- Draw photos ---
  const photoX = padding;
  const photoW = stripW - padding * 2;
  let curY = topPad;

  for (let i = 0; i < photoCount; i++) {
    // Photo area with slight border
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(photoX, curY, photoW, photoSlotH);

    if (photos[i]) {
      try {
        const img = await loadImage(photos[i]);
        // Cover-fit the photo into the slot
        const imgAspect = img.width / img.height;
        const slotAspect = photoW / photoSlotH;

        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgAspect > slotAspect) {
          // Image wider — crop sides
          sw = img.height * slotAspect;
          sx = (img.width - sw) / 2;
        } else {
          // Image taller — crop top/bottom
          sh = img.width / slotAspect;
          sy = (img.height - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, photoX, curY, photoW, photoSlotH);
      } catch (e) {
        // Failed to load, show placeholder
        ctx.fillStyle = "#e0e0e0";
        ctx.fillRect(photoX, curY, photoW, photoSlotH);
        ctx.fillStyle = "#999999";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`Photo ${i + 1}`, stripW / 2, curY + photoSlotH / 2 + 5);
      }
    } else {
      // No photo data — placeholder
      ctx.fillStyle = "#e0e0e0";
      ctx.fillRect(photoX, curY, photoW, photoSlotH);
      ctx.fillStyle = "#bbbbbb";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Photo ${i + 1}`, stripW / 2, curY + photoSlotH / 2 + 5);
    }

    curY += photoSlotH + photoGap;
  }

  // --- Bottom info area ---
  const infoY = curY + 8;

  // Event name or template name (large, centered)
  ctx.fillStyle = "#222222";
  ctx.font = "bold 18px 'Georgia', serif";
  ctx.textAlign = "center";
  const displayName = data.eventName || data.templateName || "PHOTO BOOTH";
  ctx.fillText(displayName.toUpperCase(), stripW / 2, infoY + 24);

  // Date line
  const dateStr = data.date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
  ctx.fillStyle = "#555555";
  ctx.font = "12px 'Georgia', serif";
  ctx.fillText(dateStr, stripW / 2, infoY + 48);

  // Short code (small, subtle)
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillText(data.shortCode, stripW / 2, infoY + 68);

  // Thin decorative line
  ctx.strokeStyle = "#dddddd";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(stripW / 2 - 60, infoY + 78);
  ctx.lineTo(stripW / 2 + 60, infoY + 78);
  ctx.stroke();

  // Brand watermark
  ctx.fillStyle = "#cccccc";
  ctx.font = "9px sans-serif";
  ctx.fillText("ZMI PHOTOBOX", stripW / 2, infoY + 94);

  return canvas.toDataURL("image/png");
}

/**
 * Format receipt data for thermal printer (text-based)
 */
export function formatThermalReceipt(data: ReceiptData): string {
  const sep = "================================";
  const lines = [
    "",
    "       ZMI PHOTOBOX",
    "    ═══ PHOTO RECEIPT ═══",
    sep,
    `Kode     : ${data.shortCode}`,
    `Template : ${data.templateName}`,
    `Filter   : ${data.filterApplied}`,
    `Foto     : ${data.photoCount} frame`,
    `Harga    : Rp ${data.price.toLocaleString("id-ID")}`,
    `Tanggal  : ${data.date.toLocaleDateString("id-ID")}`,
    `Waktu    : ${data.date.toLocaleTimeString("id-ID")}`,
  ];
  if (data.venueName) {
    lines.push(`Venue    : ${data.venueName}`);
  }
  lines.push(
    sep,
    `Gallery: ${data.galleryUrl}`,
    sep,
    "  Terima kasih! Follow",
    "     @zmi.photobox",
    "",
  );
  return lines.join("\n");
}
