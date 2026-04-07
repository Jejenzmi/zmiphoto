# ZMI Photobox - Canon DSLR Camera Bridge

Script bridge untuk mengontrol kamera Canon EOS 1200D/1300D dari web app ZMI Photobox.

## Arsitektur

```
[Browser - ZMI Kiosk UI] 
    ↕ HTTP (localhost:8080)
[Camera Bridge Server]
    ↕ USB
[Canon EOS 1200D / 1300D]
```

## Setup

### Pilih salah satu sesuai OS:

### 🪟 Windows — digiCamControl

1. Install [digiCamControl](http://digicamcontrol.com/download) (gratis)
2. Install [Node.js](https://nodejs.org/) v18+
3. Hubungkan Canon ke PC via USB, pastikan digiCamControl bisa detect kamera
4. Jalankan bridge:

```bash
cd camera-bridge
npm install
node bridge-windows.js
```

### 🐧 Linux — gPhoto2

1. Install gPhoto2:
```bash
sudo apt-get install gphoto2 libgphoto2-dev
```
2. Install Node.js v18+
3. Hubungkan Canon ke PC via USB
4. Pastikan gPhoto2 detect kamera: `gphoto2 --auto-detect`
5. Jalankan bridge:

```bash
cd camera-bridge
npm install
node bridge-linux.js
```

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/status` | Cek status kamera (connected/disconnected) |
| POST | `/capture` | Trigger shutter, return foto sebagai base64 |
| GET | `/preview` | Ambil live view frame (JPEG) |
| POST | `/settings` | Ubah setting kamera (ISO, shutter speed, dll) |

## Konfigurasi

Edit `.env` di folder `camera-bridge`:

```env
PORT=8080
CAMERA_TYPE=auto  # auto | gphoto2 | digicam
PHOTO_QUALITY=high  # high | medium | low
SAVE_LOCAL=true  # Simpan juga ke folder lokal
LOCAL_SAVE_PATH=./captured-photos
```

## Troubleshooting

- **Kamera tidak terdeteksi**: Pastikan USB mode kamera di PTP/MTP, bukan Mass Storage
- **Permission denied (Linux)**: `sudo chmod a+rw /dev/bus/usb/xxx/yyy` atau tambahkan udev rules
- **digiCamControl error**: Pastikan aplikasi digiCamControl berjalan di background
