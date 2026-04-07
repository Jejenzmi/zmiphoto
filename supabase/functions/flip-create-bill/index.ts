import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Send request to Flip API - either directly or through Hostinger proxy
 */
async function callFlipApi(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
  contentType: string = "application/json"
): Promise<{ status: number; text: string }> {
  const proxyUrl = Deno.env.get("FLIP_PROXY_URL");
  const proxySecret = Deno.env.get("FLIP_PROXY_SECRET");

  if (proxyUrl && proxySecret) {
    // Route through Hostinger proxy
    console.log("Using Hostinger proxy:", proxyUrl);
    const proxyResponse = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proxy-Secret": proxySecret,
      },
      body: JSON.stringify({
        url,
        method,
        headers,
        body,
        content_type: contentType,
      }),
    });
    return { status: proxyResponse.status, text: await proxyResponse.text() };
  } else {
    // Direct call to Flip API (fallback)
    console.log("Calling Flip API directly (no proxy configured)");
    const directResponse = await fetch(url, {
      method,
      headers: { ...headers, "Content-Type": contentType },
      body: contentType === "application/json" ? JSON.stringify(body) : String(body),
    });
    return { status: directResponse.status, text: await directResponse.text() };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FLIP_SECRET_KEY = Deno.env.get("FLIP_SECRET_KEY");
    if (!FLIP_SECRET_KEY) {
      throw new Error("Flip credentials not configured");
    }

    const { amount, kiosk_id, template_name, payment_method } = await req.json();

    if (!amount || amount < 1000) {
      return new Response(JSON.stringify({ error: "Minimum amount Rp 1.000" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine sender_bank and sender_bank_type based on payment_method
    let sender_bank = "qris";
    let sender_bank_type = "wallet_account";

    if (payment_method) {
      const methodMap: Record<string, { bank: string; type: string }> = {
        qris: { bank: "qris", type: "wallet_account" },
        ovo: { bank: "ovo", type: "wallet_account" },
        shopeepay: { bank: "shopeepay_app", type: "wallet_account" },
        dana: { bank: "dana", type: "wallet_account" },
        linkaja: { bank: "linkaja", type: "wallet_account" },
        va_bca: { bank: "bca", type: "virtual_account" },
        va_bni: { bank: "bni", type: "virtual_account" },
        va_bri: { bank: "bri", type: "virtual_account" },
        va_mandiri: { bank: "mandiri", type: "virtual_account" },
        va_permata: { bank: "permata", type: "virtual_account" },
        va_cimb: { bank: "cimb", type: "virtual_account" },
        va_danamon: { bank: "danamon", type: "virtual_account" },
      };

      const mapped = methodMap[payment_method];
      if (mapped) {
        sender_bank = mapped.bank;
        sender_bank_type = mapped.type;
      }
    }

    // Basic Auth
    const secretKey = FLIP_SECRET_KEY.trim();
    const encoder = new TextEncoder();
    const credentials = encoder.encode(secretKey + ":");
    const encoded = base64Encode(credentials);
    const authHeader = "Basic " + encoded;

    const requestBody = {
      title: template_name || "Photo Session",
      type: "SINGLE",
      step: "direct_api",
      amount: amount,
      sender_name: "Customer",
      sender_email: "customer@zmiphoto.com",
      sender_bank: sender_bank,
      sender_bank_type: sender_bank_type,
    };

    const apiUrl = "https://bigflip.id/api/v3/pwf/bill";
    console.log("Flip create bill request:", { apiUrl, sender_bank, sender_bank_type, amount });

    const { status: respStatus, text: responseText } = await callFlipApi(
      apiUrl,
      "POST",
      {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "idempotency-key": `bill-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      },
      requestBody
    );

    console.log("Flip response status:", respStatus);
    console.log("Flip response:", responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`Flip returned non-JSON response (status ${respStatus}). Response: ${responseText.substring(0, 200)}`);
    }

    if (respStatus < 200 || respStatus >= 300) {
      const errMsg = data?.errors?.[0]?.message || data?.message || `Flip API error (${respStatus})`;
      console.error("Flip error:", JSON.stringify(data));
      throw new Error(errMsg);
    }

    console.log("Flip create bill response:", JSON.stringify(data));

    const linkId = data.link_id;
    const linkUrl = data.link_url;
    const billPayment = data.bill_payment;
    const qrCodeData = billPayment?.receiver_bank_account?.qr_code_data || "";
    const vaNumber = billPayment?.receiver_bank_account?.account_number || "";
    const bankCode = billPayment?.receiver_bank_account?.bank_code || "";
    const paymentUrl = data.payment_url || linkUrl || "";

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
        payment_method: payment_method || "qris",
        qris_reference_id: linkId?.toString() || null,
        qris_invoice_id: billPayment?.id?.toString() || null,
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
        link_id: linkId,
        link_url: linkUrl,
        payment_url: paymentUrl,
        qr_string: qrCodeData,
        va_number: vaNumber,
        bank_code: bankCode,
        amount,
        payment_method: payment_method || "qris",
        sender_bank,
        sender_bank_type,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error creating Flip bill:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
