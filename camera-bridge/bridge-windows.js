/**
 * ZMI Photobox — Canon DSLR Bridge (Windows / digiCamControl)
 * 
 * Menghubungkan Canon EOS 1200D/1300D ke web app via HTTP API.
 * Menggunakan digiCamControl CLI (CameraControlCmd.exe).
 * 
 * Requirement: Install digiCamControl dari http://digicamcontrol.com
 * Usage: node bridge-windows.js
 */

const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const SAVE_DIR = process.env.LOCAL_SAVE_PATH || './captured-photos';

// digiCamControl paths (adjust if installed elsewhere)
const DCC_PATHS = [
  'C:\\Program Files (x86)\\digiCamControl\\CameraControlCmd.exe',
  'C:\\Program Files\\digiCamControl\\CameraControlCmd.exe',
  path.join(process.env.LOCALAPPDATA || '', 'digiCamControl', 'CameraControlCmd.exe'),
];

let DCC_PATH = '';

function findDCC() {
  for (const p of DCC_PATHS) {
    if (fs.existsSync(p)) { DCC_PATH = p; return true; }
  }
  return false;
}

function dccCommand(cmd) {
  if (!DCC_PATH) throw new Error('digiCamControl not found');
  return execSync(`"${DCC_PATH}" /c ${cmd}`, { timeout: 30000 }).toString().trim();
}

// Ensure save directory exists
if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });

app.use(cors());
app.use(express.json());

// GET /status
app.get('/status', (req, res) => {
  try {
    if (!findDCC()) {
      return res.json({ connected: false, message: 'digiCamControl tidak ditemukan. Install dari digicamcontrol.com' });
    }

    const output = dccCommand('list cameras');
    const cameras = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (cameras.length > 0 && !output.includes('No camera')) {
      res.json({
        connected: true,
        camera: { model: cameras[0] },
        message: `Kamera terdeteksi: ${cameras[0]}`,
      });
    } else {
      res.json({ connected: false, message: 'Tidak ada kamera terdeteksi' });
    }
  } catch (e) {
    res.json({ connected: false, message: 'Error: ' + e.message });
  }
});

// POST /capture
app.post('/capture', async (req, res) => {
  const timestamp = Date.now();
  const filename = `capture_${timestamp}.jpg`;
  const filepath = path.join(path.resolve(SAVE_DIR), filename);

  try {
    if (!findDCC()) throw new Error('digiCamControl not found');

    // Capture and save
    dccCommand(`capture "${filepath}"`);

    // Wait a bit for file to be written
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!fs.existsSync(filepath)) {
      // Try alternative: capture to camera, then download last
      dccCommand('capture');
      await new Promise(resolve => setTimeout(resolve, 2000));
      dccCommand(`transfer "${filepath}"`);
    }

    if (!fs.existsSync(filepath)) {
      throw new Error('Foto tidak tersimpan');
    }

    const imageBuffer = fs.readFileSync(filepath);
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    // Resize for web
    let previewDataUrl = dataUrl;
    try {
      const sharp = require('sharp');
      const resized = await sharp(filepath)
        .resize(1280, 960, { fit: 'inside' })
        .jpeg({ quality: 90 })
        .toBuffer();
      previewDataUrl = `data:image/jpeg;base64,${resized.toString('base64')}`;
    } catch (e) {
      // sharp not available
    }

    res.json({
      success: true,
      photo: previewDataUrl,
      fullResolution: dataUrl,
      filename,
      localPath: filepath,
      size: imageBuffer.length,
      timestamp,
    });
  } catch (e) {
    console.error('Capture failed:', e.message);
    res.status(500).json({
      success: false,
      error: e.message,
      hint: 'Pastikan digiCamControl berjalan dan kamera terhubung via USB',
    });
  }
});

// GET /preview — Live view frame
app.get('/preview', (req, res) => {
  try {
    if (!findDCC()) throw new Error('digiCamControl not found');
    
    const previewPath = path.join(path.resolve(SAVE_DIR), 'preview.jpg');
    dccCommand(`do LiveViewToFile "${previewPath}"`);

    if (fs.existsSync(previewPath)) {
      const imageBuffer = fs.readFileSync(previewPath);
      res.json({
        success: true,
        preview: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
      });
      fs.unlinkSync(previewPath);
    } else {
      throw new Error('Preview tidak tersedia');
    }
  } catch (e) {
    res.status(501).json({
      success: false,
      error: 'Live view error: ' + e.message,
      hint: 'Tidak semua kamera mendukung live view. Gunakan webcam untuk preview.',
    });
  }
});

// POST /settings
app.post('/settings', (req, res) => {
  const { iso, shutterspeed, aperture } = req.body;

  try {
    if (!findDCC()) throw new Error('digiCamControl not found');

    if (iso) dccCommand(`set iso ${iso}`);
    if (shutterspeed) dccCommand(`set shutterspeed ${shutterspeed}`);
    if (aperture) dccCommand(`set aperture ${aperture}`);

    res.json({ success: true, message: 'Settings updated' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🟢 ZMI Camera Bridge (Windows/digiCamControl) on http://localhost:${PORT}`);
  console.log(`   Endpoints: /status, /capture, /preview, /settings\n`);

  if (findDCC()) {
    console.log(`   ✅ digiCamControl found at: ${DCC_PATH}`);
    try {
      const cameras = dccCommand('list cameras');
      console.log(`   📷 Cameras: ${cameras}`);
    } catch (e) {
      console.log('   ⚠️  Could not list cameras:', e.message);
    }
  } else {
    console.log('   ⚠️  digiCamControl NOT found. Install from digicamcontrol.com');
  }
});
