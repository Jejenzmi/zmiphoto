/**
 * ZMI Photobox — Print Bridge (Linux / CUPS)
 * 
 * Mengirim foto ke printer via CUPS (lp/lpr command).
 * Mendukung semua printer yang terdeteksi CUPS.
 * 
 * Requirement: sudo apt-get install cups
 * Usage: node bridge-linux.js
 */

const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PRINT_PORT || 8081;
const TEMP_DIR = process.env.TEMP_DIR || './print-temp';

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * Detect printers via CUPS (lpstat)
 */
function getCUPSPrinters() {
  try {
    const output = execSync('lpstat -p -d 2>/dev/null', { timeout: 5000 }).toString();
    const printers = [];
    const lines = output.split('\n');

    for (const line of lines) {
      const match = line.match(/^printer\s+(\S+)\s+/);
      if (match) {
        const name = match[1];
        const isEnabled = line.includes('enabled');
        printers.push({
          name,
          enabled: isEnabled,
          isPhotoPrinter: /dnp|hiti|photo|canon.*selphy/i.test(name),
        });
      }
    }

    // Get default printer
    const defaultMatch = output.match(/system default destination:\s*(\S+)/);
    const defaultPrinter = defaultMatch ? defaultMatch[1] : null;

    return { printers, defaultPrinter };
  } catch {
    return { printers: [], defaultPrinter: null };
  }
}

// GET /status
app.get('/status', (req, res) => {
  try {
    const { printers, defaultPrinter } = getCUPSPrinters();
    const photoPrinters = printers.filter(p => p.isPhotoPrinter);

    res.json({
      connected: printers.length > 0,
      printers,
      defaultPrinter,
      photoPrinter: photoPrinters[0]?.name || null,
      total: printers.length,
      message: printers.length > 0
        ? `${printers.length} printer terdeteksi via CUPS`
        : 'Tidak ada printer terdeteksi. Pastikan CUPS berjalan.',
    });
  } catch (e) {
    res.json({ connected: false, printers: [], message: 'Error: ' + e.message });
  }
});

// POST /print
app.post('/print', async (req, res) => {
  const { imageBase64, printerName, copies = 1, paperSize } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ success: false, error: 'imageBase64 is required' });
  }

  const timestamp = Date.now();
  const filename = `print_${timestamp}.jpg`;
  const filepath = path.resolve(TEMP_DIR, filename);

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));

    // Resize if sharp available
    try {
      const sharp = require('sharp');
      const sizes = {
        '4x6': { width: 1800, height: 1200 },
        '2x6': { width: 1800, height: 600 },
        '5x7': { width: 2100, height: 1500 },
        'A4':  { width: 2480, height: 3508 },  // 300dpi A4
        'A3':  { width: 3508, height: 4961 },  // 300dpi A3
      };
      const size = sizes[paperSize] || sizes['4x6'];
      await sharp(filepath)
        .resize(size.width, size.height, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 95 })
        .toFile(filepath + '.print.jpg');
      fs.renameSync(filepath + '.print.jpg', filepath);
    } catch {
      // sharp not available
    }

    // Map paper size to CUPS media option
    const mediaMap = {
      '4x6': '4x6',
      '2x6': '2x6',
      '5x7': '5x7',
      'A4': 'A4',
      'A3': 'A3',
    };

    // Print via lp command
    const printerFlag = printerName ? `-d "${printerName}"` : '';
    const copiesFlag = copies > 1 ? `-n ${copies}` : '';
    const media = mediaMap[paperSize] || 'A4';
    const mediaFlag = paperSize ? `-o media=${media}` : '';

    execSync(
      `lp ${printerFlag} ${copiesFlag} ${mediaFlag} -o fit-to-page "${filepath}"`,
      { timeout: 15000 }
    );

    // Cleanup
    setTimeout(() => {
      try { fs.unlinkSync(filepath); } catch {}
    }, 10000);

    res.json({
      success: true,
      message: `Foto berhasil dicetak (${copies} copy)`,
      printer: printerName || 'default',
      method: 'cups-lp',
    });
  } catch (e) {
    console.error('Print failed:', e.message);
    res.status(500).json({
      success: false,
      error: e.message,
      hint: 'Pastikan CUPS berjalan dan printer terhubung',
    });
  }
});

// POST /print-thermal
app.post('/print-thermal', (req, res) => {
  const { imageBase64 } = req.body;

  try {
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
    res.status(501).json({
      success: false,
      error: 'ESC/POS library not available',
      hint: 'Install: npm install escpos escpos-usb',
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🖨️  ZMI Print Bridge (Linux/CUPS) on http://localhost:${PORT}`);
  console.log(`   Endpoints: /status, /print, /print-thermal\n`);

  const { printers, defaultPrinter } = getCUPSPrinters();
  if (printers.length > 0) {
    console.log(`   ✅ CUPS Printers:`);
    printers.forEach(p => console.log(`      - ${p.name}${p.isPhotoPrinter ? ' (photo)' : ''}`));
    if (defaultPrinter) console.log(`   🖨️  Default: ${defaultPrinter}`);
  } else {
    console.log('   ⚠️  No printers detected via CUPS');
  }
});
