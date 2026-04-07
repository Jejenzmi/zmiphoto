import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// HMAC SHA256 signature helper
async function createSignature(signToString: string, serverKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(serverKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signToString));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Format date as YYYYMMDDHHmmss in WIB (UTC+7) timezone
function formatExpired(minutesFromNow: number): string {
  const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
  // Convert to WIB (UTC+7)
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return (
    wib.getUTCFullYear().toString() +
    String(wib.getUTCMonth() + 1).padStart(2, "0") +
    String(wib.getUTCDate()).padStart(2, "0") +
    String(wib.getUTCHours()).padStart(2, "0") +
    String(wib.getUTCMinutes()).padStart(2, "0") +
    String(wib.getUTCSeconds()).padStart(2, "0")
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LINKQU_USERNAME = Deno.env.get("LINKQU_USERNAME");
    const LINKQU_PIN = Deno.env.get("LINKQU_PIN");
    const LINKQU_CLIENT_ID = Deno.env.get("LINKQU_CLIENT_ID");
    const LINKQU_CLIENT_SECRET = Deno.env.get("LINKQU_CLIENT_SECRET");
    const LINKQU_SERVER_KEY = Deno.env.get("LINKQU_SERVER_KEY");
    const LINKQU_BASE_URL = Deno.env.get("LINKQU_BASE_URL");

    if (!LINKQU_USERNAME || !LINKQU_PIN || !LINKQU_CLIENT_ID || !LINKQU_CLIENT_SECRET || !LINKQU_SERVER_KEY || !LINKQU_BASE_URL) {
      throw new Error("LinkQu credentials not configured");
    }

    const { amount, kiosk_id, template_name } = await req.json();

    if (!amount || amount < 1000) {
      return new Response(JSON.stringify({ error: "Minimum amount Rp 1.000" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const partnerReff = `${Date.now()}${Math.random().toString().substring(2, 6)}`;
    const expired = formatExpired(30); // 30 minutes
    const customerId = "kiosk";
    const customerName = template_name || "Photo Session";
    const customerEmail = "kiosk@zmiphoto.com";
    const customerPhone = "081200000000";

    // Build signature for QRIS
    // Formula: $path.$method.$amount.$expired.$partner_reff.$customer_id.$customer_name.$customer_email.$client-id
    // IMPORTANT: Signature path does NOT include /linkqu-partner prefix
    const signaturePath = "/transaction/create/qris";
    const method = "POST";

    const rawSecond = `${amount}${expired}${partnerReff}${customerId}${customerName}${customerEmail}${LINKQU_CLIENT_ID}`;
    const secondValue = rawSecond.replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
    const signToString = `${signaturePath}${method}${secondValue}`;

    console.log("Signature input:", signToString);

    const signature = await createSignature(signToString, LINKQU_SERVER_KEY);

    const baseUrl = LINKQU_BASE_URL.replace(/\/$/, "");

    const requestBody = {
      username: LINKQU_USERNAME,
      pin: LINKQU_PIN,
      amount: amount,
      partner_reff: partnerReff,
      customer_id: customerId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      expired: expired,
      signature: signature,
    };

    const apiUrl = `${baseUrl}/linkqu-partner/transaction/create/qris`;
    console.log("LinkQu QRIS request URL:", apiUrl);
    console.log("LinkQu QRIS request body:", JSON.stringify({ ...requestBody, pin: "***" }));

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "client-id": LINKQU_CLIENT_ID,
        "client-secret": LINKQU_CLIENT_SECRET,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("LinkQu raw response:", responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`LinkQu returned non-JSON response (status ${response.status}). Response: ${responseText.substring(0, 200)}`);
    }
    console.log("LinkQu QRIS response:", JSON.stringify(data));

    // LinkQu uses response_code "00" for success
    if (data.response_code !== "00") {
      const errMsg = data.response_desc || data.rd || data.message || "LinkQu API error";
      console.error("LinkQu error:", data);
      throw new Error(errMsg);
    }

    // Extract QR content/URL from response per docs
    const qrImageUrl = data.imageqris || "";
    const qrText = data.qris_text || "";
    const partnerReff2 = data.partner_reff2 || "";

    // Save transaction to DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: txn, error: txnError } = await supabase
      .from("transactions")
      .insert({
        kiosk_id: kiosk_id || null,
        amount,
        payment_status: "pending",
        payment_method: "qris",
        qris_reference_id: partnerReff,
        qris_invoice_id: partnerReff2,
      })
      .select("id")
      .single();

    if (txnError) {
      console.error("DB insert error:", txnError);
      throw new Error("Failed to save transaction");
    }

    return new Response(
      JSON.stringify({
        transaction_id: txn.id,
        qris_image_url: qrImageUrl,
        qris_text: qrText,
        reference_id: partnerReff,
        partner_reff2: partnerReff2,
        amount,
        expired,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error creating LinkQu QRIS:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
