import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
  body: unknown = null,
  contentType: string = "application/json"
): Promise<{ status: number; text: string }> {
  const proxyUrl = Deno.env.get("FLIP_PROXY_URL");
  const proxySecret = Deno.env.get("FLIP_PROXY_SECRET");

  if (proxyUrl && proxySecret) {
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
    console.log("Calling Flip API directly (no proxy configured)");
    const fetchOpts: RequestInit = { method, headers };
    if (body && ["POST", "PUT", "PATCH"].includes(method)) {
      (fetchOpts.headers as Record<string, string>)["Content-Type"] = contentType;
      fetchOpts.body = contentType === "application/json" ? JSON.stringify(body) : String(body);
    }
    const directResponse = await fetch(url, fetchOpts);
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

    const secretKey = FLIP_SECRET_KEY.trim();
    const encoder = new TextEncoder();
    const credentials = encoder.encode(secretKey + ":");
    const encoded = base64Encode(credentials);
    const authHeader = "Basic " + encoded;

    const results: Record<string, unknown> = {
      key_length: secretKey.length,
      key_prefix: secretKey.substring(0, 8),
      key_suffix: secretKey.substring(secretKey.length - 8),
      proxy_configured: !!(Deno.env.get("FLIP_PROXY_URL") && Deno.env.get("FLIP_PROXY_SECRET")),
      proxy_url: Deno.env.get("FLIP_PROXY_URL") || "(not set)",
    };

    // Test: v2 production - get balance
    const balRes = await callFlipApi(
      "https://bigflip.id/api/v2/general/balance",
      "GET",
      { "Authorization": authHeader }
    );
    results.v2_balance_status = balRes.status;
    results.v2_balance_response = balRes.text.substring(0, 200);

    // Test: v3 production - create bill
    const v3Res = await callFlipApi(
      "https://bigflip.id/api/v3/pwf/bill",
      "POST",
      {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      {
        title: "Test",
        type: "SINGLE",
        step: "direct_api",
        amount: 10000,
        sender_name: "Test",
        sender_email: "test@test.com",
        sender_bank: "qris",
        sender_bank_type: "wallet_account",
      }
    );
    results.v3_bill_status = v3Res.status;
    results.v3_bill_response = v3Res.text.substring(0, 300);

    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
