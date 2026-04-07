# Flip API Proxy untuk Hostinger

Proxy PHP sederhana yang meneruskan request ke Flip API menggunakan IP Hostinger yang sudah di-whitelist.

## Setup

1. **Upload file** `flip-proxy.php` ke Hostinger:
   ```
   public_html/api/flip-proxy.php
   ```

2. **Ganti PROXY_SECRET** di file `flip-proxy.php`:
   ```php
   define('PROXY_SECRET', 'ganti-dengan-string-random-yang-kuat');
   ```
   Gunakan random string generator, contoh: `openssl rand -hex 32`

3. **Tambah secrets di Lovable Cloud:**
   - `FLIP_PROXY_URL` → `https://domainmu.com/api/flip-proxy.php`
   - `FLIP_PROXY_SECRET` → secret yang sama dengan di step 2

4. **Whitelist IP Hostinger** di dashboard Flip.

## Cara Kerja

```
Frontend → Edge Function → Hostinger Proxy → Flip API
                                   ↑
                          IP Hostinger (whitelisted)
```

Edge function mengirim request ke proxy dengan format:
```json
{
  "url": "https://bigflip.id/api/v3/pwf/bill",
  "method": "POST",
  "headers": { "Authorization": "Basic xxx", "Content-Type": "application/json" },
  "body": { ... },
  "content_type": "application/json"
}
```

Proxy meneruskan ke Flip API dan mengembalikan response-nya.
