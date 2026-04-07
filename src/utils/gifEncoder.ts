/**
 * Minimal GIF89a encoder for creating animated GIFs from canvas frames.
 * No external dependencies needed.
 */

class GifEncoder {
  private width: number;
  private height: number;
  private frames: { data: Uint8ClampedArray; delay: number }[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  addFrame(imageData: ImageData, delay: number = 100) {
    this.frames.push({ data: imageData.data, delay });
  }

  encode(): Blob {
    const bytes: number[] = [];

    // Header
    this.writeString(bytes, "GIF89a");

    // Logical Screen Descriptor
    this.writeShort(bytes, this.width);
    this.writeShort(bytes, this.height);
    bytes.push(0xF7); // GCT flag, 8-bit color (256 colors)
    bytes.push(0);    // Background color index
    bytes.push(0);    // Pixel aspect ratio

    // Global Color Table (256 RGB entries)
    const palette = this.buildPalette();
    for (const c of palette) {
      bytes.push(c[0], c[1], c[2]);
    }

    // Netscape extension for looping
    bytes.push(0x21, 0xFF, 0x0B);
    this.writeString(bytes, "NETSCAPE2.0");
    bytes.push(0x03, 0x01);
    this.writeShort(bytes, 0); // loop forever
    bytes.push(0x00);

    // Frames
    for (const frame of this.frames) {
      // Graphic Control Extension
      bytes.push(0x21, 0xF9, 0x04);
      bytes.push(0x00); // disposal method
      this.writeShort(bytes, Math.round(frame.delay / 10)); // delay in centiseconds
      bytes.push(0x00); // transparent color index
      bytes.push(0x00); // block terminator

      // Image Descriptor
      bytes.push(0x2C);
      this.writeShort(bytes, 0); // left
      this.writeShort(bytes, 0); // top
      this.writeShort(bytes, this.width);
      this.writeShort(bytes, this.height);
      bytes.push(0x00); // no local color table

      // LZW compressed image data
      const pixels = this.quantizeFrame(frame.data, palette);
      const compressed = this.lzwEncode(pixels, 8);
      bytes.push(8); // LZW minimum code size
      // Write sub-blocks
      let offset = 0;
      while (offset < compressed.length) {
        const blockSize = Math.min(255, compressed.length - offset);
        bytes.push(blockSize);
        for (let i = 0; i < blockSize; i++) {
          bytes.push(compressed[offset + i]);
        }
        offset += blockSize;
      }
      bytes.push(0x00); // block terminator
    }

    // Trailer
    bytes.push(0x3B);

    return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
  }

  private buildPalette(): [number, number, number][] {
    // Simple 6-6-6 color cube = 216 colors + 40 grayscale
    const palette: [number, number, number][] = [];
    for (let r = 0; r < 6; r++) {
      for (let g = 0; g < 6; g++) {
        for (let b = 0; b < 6; b++) {
          palette.push([Math.round(r * 51), Math.round(g * 51), Math.round(b * 51)]);
        }
      }
    }
    // Fill remaining 40 slots with grays
    for (let i = 0; i < 40; i++) {
      const v = Math.round((i / 39) * 255);
      palette.push([v, v, v]);
    }
    return palette;
  }

  private quantizeFrame(data: Uint8ClampedArray, palette: [number, number, number][]): number[] {
    const pixels: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Fast nearest match in 6-6-6 cube
      const ri = Math.min(5, Math.round(r / 51));
      const gi = Math.min(5, Math.round(g / 51));
      const bi = Math.min(5, Math.round(b / 51));
      pixels.push(ri * 36 + gi * 6 + bi);
    }
    return pixels;
  }

  private lzwEncode(pixels: number[], minCodeSize: number): number[] {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    const maxCode = 4096;

    const codeTable = new Map<string, number>();

    // Initialize code table
    for (let i = 0; i < clearCode; i++) {
      codeTable.set(String(i), i);
    }

    const output: number[] = [];
    let buffer = 0;
    let bufferBits = 0;

    const emit = (code: number) => {
      buffer |= code << bufferBits;
      bufferBits += codeSize;
      while (bufferBits >= 8) {
        output.push(buffer & 0xFF);
        buffer >>= 8;
        bufferBits -= 8;
      }
    };

    emit(clearCode);

    let current = String(pixels[0]);
    for (let i = 1; i < pixels.length; i++) {
      const next = current + "," + pixels[i];
      if (codeTable.has(next)) {
        current = next;
      } else {
        emit(codeTable.get(current)!);
        if (nextCode < maxCode) {
          codeTable.set(next, nextCode++);
          if (nextCode > (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        } else {
          emit(clearCode);
          codeTable.clear();
          for (let j = 0; j < clearCode; j++) {
            codeTable.set(String(j), j);
          }
          nextCode = eoiCode + 1;
          codeSize = minCodeSize + 1;
        }
        current = String(pixels[i]);
      }
    }

    emit(codeTable.get(current)!);
    emit(eoiCode);

    if (bufferBits > 0) {
      output.push(buffer & 0xFF);
    }

    return output;
  }

  private writeShort(bytes: number[], val: number) {
    bytes.push(val & 0xFF, (val >> 8) & 0xFF);
  }

  private writeString(bytes: number[], str: string) {
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
  }
}

/**
 * Create a boomerang GIF from an array of photo URLs.
 * Sequence: 1,2,3,...,N,...,3,2,1 (bounce)
 */
export async function createBoomerangGif(
  photos: string[],
  outputWidth = 320,
  outputHeight = 320,
  frameDelay = 200
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d")!;

  const encoder = new GifEncoder(outputWidth, outputHeight);

  // Load all images
  const images: HTMLImageElement[] = [];
  for (const src of photos) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
    images.push(img);
  }

  // Create bounce sequence: forward + reverse (minus endpoints to avoid doubles)
  const sequence = [...images];
  if (images.length > 2) {
    for (let i = images.length - 2; i >= 1; i--) {
      sequence.push(images[i]);
    }
  } else if (images.length === 2) {
    sequence.push(images[0]);
  }

  // Render each frame
  for (const img of sequence) {
    ctx.clearRect(0, 0, outputWidth, outputHeight);

    // Cover-fit
    const imgRatio = img.width / img.height;
    const canvasRatio = outputWidth / outputHeight;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgRatio > canvasRatio) {
      sw = img.height * canvasRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / canvasRatio;
      sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

    const imageData = ctx.getImageData(0, 0, outputWidth, outputHeight);
    encoder.addFrame(imageData, frameDelay);
  }

  return encoder.encode();
}
