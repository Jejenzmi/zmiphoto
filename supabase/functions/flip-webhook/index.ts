import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FLIP_VALIDATION_KEY = Deno.env.get("FLIP_VALIDATION_KEY");
    if (!FLIP_VALIDATION_KEY) {
      throw new Error("Flip validation key not configured");
    }

    // Flip sends webhook as form-urlencoded with a "data" field containing JSON
    const formData = await req.formData();
    const dataStr = formData.get("data")?.toString();
    const token = formData.get("token")?.toString();

    if (!dataStr) {
      console.error("No data field in webhook");
      return new Response("No data", { status: 400 });
    }

    // Validate token
    if (token !== FLIP_VALIDATION_KEY) {
      console.error("Invalid webhook token");
      return new Response("Unauthorized", { status: 401 });
    }

    const data = JSON.parse(dataStr);
    console.log("Flip webhook data:", JSON.stringify(data));

    const billLinkId = data.bill_link_id || data.link_id;
    const status = data.status; // "SUCCESSFUL", "FAILED", "CANCELLED"

    if (!billLinkId) {
      console.error("No bill_link_id in webhook data");
      return new Response("Missing bill_link_id", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let paymentStatus = "pending";
    if (status === "SUCCESSFUL") {
      paymentStatus = "paid";
    } else if (status === "FAILED" || status === "CANCELLED") {
      paymentStatus = "failed";
    }

    // Update transaction by link_id stored in qris_reference_id
    const { data: updated, error: updateErr } = await supabase
      .from("transactions")
      .update({ payment_status: paymentStatus })
      .eq("qris_reference_id", billLinkId.toString())
      .eq("payment_status", "pending")
      .select("id")
      .maybeSingle();

    if (updateErr) {
      console.error("DB update error:", updateErr);
      return new Response("DB error", { status: 500 });
    }

    console.log("Updated transaction:", updated?.id, "status:", paymentStatus);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Flip webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
