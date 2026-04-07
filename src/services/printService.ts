/**
 * Print service: abstracts print bridge (localhost:8081)
 * for thermal printers and photo printers.
 */

const PRINT_BRIDGE_URL = "http://localhost:8081";

/** Printer name mapping by product type */
export const PRINTER_MAP = {
  a3: "Epson_L18050",          // A3/A4 inkjet (CUPS name)
  a4: "Epson_L18050",          // A4 uses same Epson
  photostrip: "DNP_DS-RX1HS",  // 2R photostrip dye-sub (CUPS name)
  receipt: "iWare_X_Series",   // thermal receipt (CUPS name)
} as const;

/** Friendly display names */
export const PRINTER_DISPLAY = {
  a3: "Epson L18050",
  a4: "Epson L18050",
  photostrip: "DNP DS-RX1HS",
  receipt: "iWare X Series",
} as const;

export type ProductPrinterType = keyof typeof PRINTER_MAP;

export interface PrinterInfo {
  name: string;
  driver?: string;
  port?: string;
  isPhotoPrinter: boolean;
}

export interface PrintStatus {
  connected: boolean;
  printers: PrinterInfo[];
  defaultPrinter: string | null;
  photoPrinter: string | null;
  total: number;
  message: string;
}

export interface PrintResult {
  success: boolean;
  message?: string;
  error?: string;
}

/** Check if print bridge is running and list available printers */
export async function checkPrintBridge(): Promise<PrintStatus> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const resp = await fetch(`${PRINT_BRIDGE_URL}/status`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) throw new Error("Print bridge not responding");
    return await resp.json();
  } catch {
    return {
      connected: false,
      printers: [],
      defaultPrinter: null,
      photoPrinter: null,
      total: 0,
      message: "Print bridge tidak ditemukan (localhost:8081)",
    };
  }
}

/** Send image to photo/inkjet printer */
export async function printPhoto(options: {
  imageBase64: string;
  printerName?: string;
  copies?: number;
  paperSize?: "4x6" | "2x6" | "5x7" | "A3" | "A4" | "receipt";
}): Promise<PrintResult> {
  try {
    const resp = await fetch(`${PRINT_BRIDGE_URL}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });

    const data = await resp.json();
    if (data.success) {
      return { success: true, message: data.message };
    }
    throw new Error(data.error || "Print failed");
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/** Send image to thermal printer (ESC/POS) */
export async function printThermal(imageBase64: string): Promise<PrintResult> {
  try {
    const resp = await fetch(`${PRINT_BRIDGE_URL}/print-thermal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
    });

    const data = await resp.json();
    if (data.success) {
      return { success: true, message: data.message };
    }
    throw new Error(data.error || "Thermal print failed");
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
