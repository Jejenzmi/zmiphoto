<?php
/**
 * Flip API Proxy - Deploy to Hostinger
 * 
 * Path: public_html/api/flip-proxy.php
 * URL:  https://jebox.zefin.id/api/flip-proxy.php
 * 
 * SETUP:
 * 1. Upload seluruh isi folder hostinger-deploy/ ke public_html/
 * 2. Ganti PROXY_SECRET di bawah dengan string random yang kuat
 * 3. Tambahkan secret yang sama sebagai FLIP_PROXY_SECRET di Lovable Cloud
 * 4. Whitelist IP Hostinger di dashboard Flip
 */

// ============================================================
// CONFIGURATION - Ganti nilai ini!
// ============================================================
define('PROXY_SECRET', 'CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET');

// ============================================================
// CORS & Preflight
// ============================================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Proxy-Secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ============================================================
// Auth check
// ============================================================
$providedSecret = $_SERVER['HTTP_X_PROXY_SECRET'] ?? '';
if ($providedSecret !== PROXY_SECRET) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// ============================================================
// Parse incoming request
// ============================================================
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON body']);
    exit;
}

$flipUrl       = $input['url'] ?? '';
$flipMethod    = strtoupper($input['method'] ?? 'POST');
$flipHeaders   = $input['headers'] ?? [];
$flipBody      = $input['body'] ?? null;
$contentType   = $input['content_type'] ?? 'application/json';

if (!$flipUrl || !str_contains($flipUrl, 'bigflip.id')) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing Flip URL']);
    exit;
}

// ============================================================
// Forward request to Flip API via cURL
// ============================================================
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $flipUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $flipMethod);

// Build headers
$curlHeaders = [];
foreach ($flipHeaders as $key => $value) {
    $curlHeaders[] = "$key: $value";
}
if (!empty($curlHeaders)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $curlHeaders);
}

// Set body
if ($flipBody !== null && in_array($flipMethod, ['POST', 'PUT', 'PATCH'])) {
    if ($contentType === 'application/x-www-form-urlencoded' && is_array($flipBody)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($flipBody));
    } else {
        curl_setopt($ch, CURLOPT_POSTFIELDS, is_string($flipBody) ? $flipBody : json_encode($flipBody));
    }
}

$response   = curl_exec($ch);
$httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError  = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Proxy error: ' . $curlError]);
    exit;
}

// ============================================================
// Return Flip's response as-is
// ============================================================
http_response_code($httpCode);
echo $response;
