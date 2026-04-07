/**
 * ZMI Photobox — Print Bridge (Windows)
 * 
 * Mengirim foto ke thermal printer (ESC/POS) atau photo printer (Windows Print API).
 * Mendukung: DNP DS-RX1, HiTi P520L, Epson TM-T88, dan printer standar Windows.
 * 
 * Usage: node bridge-windows.js
 */

const express = require('express');
const cors = require('cors');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PRINT_PORT || 8081;
const TEMP_DIR = process.env.TEMP_DIR || './print-temp';

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * Detect available printers on Windows
 */
function getWindowsPrinters() {
  try {
    const output = execSync(
      'powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | ConvertTo-Json"',
      { timeout: 10000 }
    ).toString();
    const printers = JSON.parse(output);
    return Array.isArray(printers) ? printers : [printers];
  } catch (e) {
    // Fallback: use wmic
    try {
      const output = execSync('wmic printer get name,drivername,portname /format:csv', { timeout: 10000 }).toString();
      const lines = output.trim().split('\n').filter(l => l.trim() && !l.includes('Node'));
      return lines.map(l => {
        const parts = l.split(',');
        return { Name: parts[1]?.trim(), DriverName: parts[2]?.trim(), PortName: parts[3]?.trim() };
      }).filter(p => p.Name);
    } catch {
      return [];
    }
  }
}

/**
 * Print image using Windows default print handler (SumatraPDF / mspaint)
 */
function printImageWindows(filepath, printerName) {
  // Method 1: PowerShell printing
  try {
    const psCommand = printerName
      ? `Start-Process -FilePath "${filepath}" -Verb PrintTo -ArgumentList "${printerName}" -Wait`
      : `Start-Process -FilePath "${filepath}" -Verb Print -Wait`;
    
    execSync(`powershell -Command "${psCommand}"`, { timeout: 30000 });
    return { success: true, method: 'powershell' };
  } catch (e) {
    // ignore, try next method
  }

  // Method 2: mspaint silent print
  try {
    const cmd = printerName
      ? `mspaint /pt "${filepath}" "${printerName}"`
      : `mspaint /p "${filepath}"`;
    execSync(cmd, { timeout: 30000 });
    return { success: true, method: 'mspaint' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// GET /status — Check printer availability
app.get('/status', (req, res) => {
  try {
    const printers = getWindowsPrinters();
    const photoPrinters = printers.filter(p => {
      const name = (p.Name || '').toLowerCase();
      const driver = (p.DriverName || '').toLowerCase();
      return name.includes('dnp') || name.includes('hiti') || name.includes('photo') ||
             driver.includes('dnp') || driver.includes('hiti') || driver.includes('photo') ||
             name.includes('canon') || name.includes('epson');
    });

    res.json({
      connected: printers.length > 0,
      printers: printers.map(p => ({
        name: p.Name,
        driver: p.DriverName,
        port: p.PortName,
        isPhotoPrinter: photoPrinters.some(pp => pp.Name === p.Name),
      })),
      defaultPrinter: printers[0]?.Name || null,
      photoPrinter: photoPrinters[0]?.Name || null,
      total: printers.length,
      message: printers.length > 0
        ? `${printers.length} printer terdeteksi${photoPrinters.length ? `, ${photoPrinters.length} photo printer` : ''}`
        : 'Tidak ada printer terdeteksi',
    });
  } catch (e) {
    res.json({ connected: false, printers: [], message: 'Error: ' + e.message });
  }
});

// POST /print — Print an image
app.post('/print', async (req, res) => {
  const { imageBase64, printerName, copies = 1, paperSize } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ success: false, error: 'imageBase64 is required' });
  }

  const timestamp = Date.now();
  const filename = `print_${timestamp}.jpg`;
  const filepath = path.resolve(TEMP_DIR, filename);

  try {
    // Decode base64 to file
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));

    // Resize for paper if sharp available
    try {
      const sharp = require('sharp');
      const sizes = {
        '4x6': { width: 1800, height: 1200 },
        '2x6': { width: 1800, height: 600 },
        '5x7': { width: 2100, height: 1500 },
      };
      const size = sizes[paperSize] || sizes['4x6'];
      await sharp(filepath)
        .resize(size.width, size.height, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 95 })
        .toFile(filepath + '.print.jpg');
      fs.renameSync(filepath + '.print.jpg', filepath);
    } catch {
      // sharp not available, use raw image
    }

    // Print with specified or default printer
    let printResult;
    for (let i = 0; i < copies; i++) {
      printResult = printImageWindows(filepath, printerName || null);
      if (!printResult.success) break;
    }

    // Cleanup temp file after delay
    setTimeout(() => {
      try { fs.unlinkSync(filepath); } catch {}
    }, 10000);

    if (printResult?.success) {
      res.json({
        success: true,
        message: `Foto berhasil dicetak (${copies} copy)`,
        printer: printerName || 'default',
        method: printResult.method,
      });
    } else {
      throw new Error(printResult?.error || 'Print failed');
    }
  } catch (e) {
    console.error('Print failed:', e.message);
    res.status(500).json({
      success: false,
      error: e.message,
      hint: 'Pastikan printer terhubung dan driver terinstall',
    });
  }
});

// POST /print-thermal — Print to ESC/POS thermal printer
app.post('/print-thermal', (req, res) => {
  const { imageBase64, printerPort = 'USB001' } = req.body;

  try {
    // For ESC/POS thermal printing, we need the escpos library
    const escpos = require('escpos');
    const USB = require('escpos-usb');

    const device = new USB();
    const printer = new escpos.Printer(device);

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const filepath = path.resolve(TEMP_DIR, `thermal_${Date.now()}.jpg`);
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));

    device.open(() => {
      escpos.Image.load(filepath, (image) => {
        printer
          .align('ct')
          .image(image, 's8')
          .then(() => {
            printer.cut().close();
            fs.unlinkSync(filepath);
            res.json({ success: true, message: 'Thermal print berhasil' });
          });
      });
    });
  } catch (e) {
    // Fallback: if escpos not installed, use raw print
    res.status(501).json({
      success: false,
      error: 'ESC/POS library not installed',
      hint: 'Install: npm install escpos escpos-usb',
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🖨️  ZMI Print Bridge (Windows) on http://localhost:${PORT}`);
  console.log(`   Endpoints: /status, /print, /print-thermal\n`);

  const printers = getWindowsPrinters();
  if (printers.length > 0) {
    console.log(`   ✅ Printers found:`);
    printers.forEach(p => console.log(`      - ${p.Name} (${p.DriverName || 'unknown driver'})`));
  } else {
    console.log('   ⚠️  No printers detected');
  }
});
