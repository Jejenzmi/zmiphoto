# ZMI Photobox - Print Bridge

Bridge server untuk mencetak foto dari web app ZMI Photobox ke printer lokal.

## Arsitektur

```
[Browser - ZMI Kiosk UI]
    ↕ HTTP (localhost:8081)
[Print Bridge Server]
    ↕ USB / Network
[Printer: DNP / HiTi / Epson / dll]
```

## Printer yang Didukung

| Tipe | Contoh | Metode |
|------|--------|--------|
| Photo Printer | DNP DS-RX1, HiTi P520L, Canon Selphy | Windows Print / CUPS |
| Thermal Printer | Epson TM-T88, POS printer | ESC/POS via USB |
| Inkjet/Laser | Printer standar apapun | Windows Print / CUPS |

## Setup

### 🪟 Windows

```bash
cd print-bridge
npm install
node bridge-windows.js
```

### 🐧 Linux

1. Pastikan CUPS terinstall:
```bash
sudo apt-get install cups
```

2. Jalankan bridge:
```bash
cd print-bridge
npm install
node bridge-linux.js
```

### Thermal Printer (opsional)

```bash
npm install escpos escpos-usb
```

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/status` | List semua printer yang terdeteksi |
| POST | `/print` | Cetak foto ke photo/inkjet printer |
| POST | `/print-thermal` | Cetak ke thermal printer (ESC/POS) |

## POST /print Body

```json
{
  "imageBase64": "data:image/jpeg;base64,...",
  "printerName": "DNP DS-RX1",
  "copies": 1,
  "paperSize": "4x6"
}
```

Paper sizes: `4x6`, `2x6`, `5x7`
