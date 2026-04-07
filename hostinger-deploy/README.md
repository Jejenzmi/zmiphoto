# Hostinger Deploy

Upload **seluruh isi folder ini** ke `public_html/` di Hostinger.

## Struktur yang benar di Hostinger:

```
public_html/
├── .htaccess              ← routing SPA + exception untuk /api/
├── api/
│   └── flip-proxy.php     ← proxy ke Flip API
├── index.html             ← dari build React (sudah ada)
├── assets/                ← dari build React (sudah ada)
└── ...
```

## Langkah:

1. Download ZIP dari GitHub
2. Buka folder `hostinger-deploy/`
3. Upload `.htaccess` ke `public_html/` (timpa yang lama)
4. Upload folder `api/` ke `public_html/`
5. Edit `public_html/api/flip-proxy.php` → ganti `PROXY_SECRET`
6. Test: buka `https://jebox.zefin.id/api/flip-proxy.php` → harus muncul `{"error":"Unauthorized"}`
