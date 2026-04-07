/**
 * ZMI Photobox — Canon DSLR Bridge (Linux / gPhoto2)
 * 
 * Menghubungkan Canon EOS 1200D/1300D ke web app via HTTP API.
 * Menggunakan gPhoto2 CLI untuk kontrol kamera.
 * 
 * Requirement: sudo apt-get install gphoto2
 * Usage: node bridge-linux.js
 */

const express = require('express');
const cors = require('cors');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const SAVE_DIR = process.env.LOCAL_SAVE_PATH || './captured-photos';

// Ensure save directory exists
if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });

// CORS — allow requests from any origin (kiosk web app)
app.use(cors());
app.use(express.json());

// Kill any process holding the camera (e.g., gvfs-gphoto2-volume-monitor)
function killCameraProcesses() {
  try {
    execSync('pkill -f gvfs-gphoto2 2>/dev/null || true');
    execSync('pkill -f gphoto2 2>/dev/null || true');
  } catch (e) {
    // ignore
  }
}

// GET /status — Check camera connection
app.get('/status', (req, res) => {
  try {
    const output = execSync('gphoto2 --auto-detect', { timeout: 5000 }).toString();
    const lines = output.trim().split('\n').filter(l => l && !l.startsWith('Model') && !l.startsWith('---'));
    
    if (lines.length > 0) {
      // Get camera summary
      let summary = {};
      try {
        const summaryOutput = execSync('gphoto2 --summary', { timeout: 5000 }).toString();
        const modelMatch = summaryOutput.match(/Model:\s*(.+)/);
        const serialMatch = summaryOutput.match(/Serial Number:\s*(.+)/);
        summary = {
          model: modelMatch ? modelMatch[1].trim() : lines[0].trim(),
          serial: serialMatch ? serialMatch[1].trim() : null,
        };
      } catch (e) {
        summary = { model: lines[0].trim() };
      }

      res.json({
        connected: true,
        camera: summary,
        message: `Kamera terdeteksi: ${summary.model}`,
      });
    } else {
      res.json({ connected: false, message: 'Tidak ada kamera terdeteksi' });
    }
  } catch (e) {
    res.json({ connected: false, message: 'gPhoto2 error: ' + e.message });
  }
});

// POST /capture — Trigger shutter and return photo
app.post('/capture', async (req, res) => {
  const timestamp = Date.now();
  const filename = `capture_${timestamp}.jpg`;
  const filepath = path.join(SAVE_DIR, filename);

  try {
    killCameraProcesses();

    // Capture image and download to local
    execSync(
      `gphoto2 --capture-image-and-download --filename "${filepath}" --force-overwrite`,
      { timeout: 30000 }
    );

    if (!fs.existsSync(filepath)) {
      throw new Error('Foto tidak tersimpan');
    }

    // Read file and convert to base64
    const imageBuffer = fs.readFileSync(filepath);
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    // Optionally resize for web preview (keep original saved locally)
    let previewDataUrl = dataUrl;
    try {
      const sharp = require('sharp');
      const resized = await sharp(filepath)
        .resize(1280, 960, { fit: 'inside' })
        .jpeg({ quality: 90 })
        .toBuffer();
      previewDataUrl = `data:image/jpeg;base64,${resized.toString('base64')}`;
    } catch (e) {
      // sharp not available, use full resolution
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
      hint: 'Pastikan kamera terhubung via USB dan dalam mode PTP',
    });
  }
});

// GET /preview — Get live view frame (if supported)
app.get('/preview', (req, res) => {
  const previewPath = path.join(SAVE_DIR, 'preview.jpg');
  
  try {
    killCameraProcesses();
    execSync(
      `gphoto2 --capture-preview --filename "${previewPath}" --force-overwrite`,
      { timeout: 10000 }
    );

    if (fs.existsSync(previewPath)) {
      const imageBuffer = fs.readFileSync(previewPath);
      res.json({
        success: true,
        preview: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
      });
      fs.unlinkSync(previewPath); // cleanup
    } else {
      throw new Error('Preview tidak tersedia');
    }
  } catch (e) {
    // Live view not supported on all Canon models
    res.status(501).json({
      success: false,
      error: 'Live view tidak didukung di kamera ini',
      hint: 'Canon 1200D tidak mendukung live view via gPhoto2. Gunakan webcam untuk preview.',
    });
  }
});

// POST /settings — Change camera settings
app.post('/settings', (req, res) => {
  const { iso, shutterspeed, aperture } = req.body;

  try {
    killCameraProcesses();

    if (iso) {
      execSync(`gphoto2 --set-config iso=${iso}`, { timeout: 5000 });
    }
    if (shutterspeed) {
      execSync(`gphoto2 --set-config shutterspeed=${shutterspeed}`, { timeout: 5000 });
    }
    if (aperture) {
      execSync(`gphoto2 --set-config aperture=${aperture}`, { timeout: 5000 });
    }

    // Read back current settings
    const configOutput = execSync('gphoto2 --get-config iso --get-config shutterspeed --get-config aperture', { timeout: 5000 }).toString();

    res.json({ success: true, message: 'Settings updated', raw: configOutput });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🟢 ZMI Camera Bridge (Linux/gPhoto2) running on http://localhost:${PORT}`);
  console.log(`   Endpoints:`);
  console.log(`   GET  /status   — Check camera`);
  console.log(`   POST /capture  — Take photo`);
  console.log(`   GET  /preview  — Live view frame`);
  console.log(`   POST /settings — Camera settings\n`);

  // Auto-detect camera on startup
  try {
    const output = execSync('gphoto2 --auto-detect', { timeout: 5000 }).toString();
    console.log('   Camera detection:', output.trim());
  } catch (e) {
    console.log('   ⚠️  gPhoto2 not found or no camera detected');
  }
});
