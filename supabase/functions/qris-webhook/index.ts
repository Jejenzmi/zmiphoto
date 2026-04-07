import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    console.log("LinkQu webhook received:", JSON.stringify(body));

    // LinkQu QRIS callback fields per docs:
    // partner_reff, amount, status, type (pay/settle), va_code, qris_id, 
    // payment_reff, serialnumber, signature, username, etc.
    const partnerReff = body.partner_reff;
    const status = body.status;
    const callbackType = body.type; // "pay" or "settle"

    if (!partnerReff) {
      console.error("Webhook missing partner_reff");
      return new Response(JSON.stringify({ response: "OK" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // LinkQu sends "SUCCESS" for successful payment (not "PAID")
    // type "pay" = payment received, type "settle" = settlement
    if (status === "SUCCESS" && callbackType === "pay") {
      const { data, error } = await supabase
        .from("transactions")
        .update({ payment_status: "paid" })
        .eq("qris_reference_id", partnerReff)
        .eq("payment_status", "pending")
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("DB update error:", error);
      } else if (data) {
        console.log("Transaction updated to paid:", data.id);
      } else {
        console.log("No pending transaction found for ref:", partnerReff);
      }
    } else {
      console.log(`Callback type: ${callbackType}, status: ${status} — no update needed`);
    }

    // LinkQu expects {"response": "OK"} as acknowledgement
    return new Response(JSON.stringify({ response: "OK" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    // Still return OK to prevent LinkQu from retrying
    return new Response(JSON.stringify({ response: "OK" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
