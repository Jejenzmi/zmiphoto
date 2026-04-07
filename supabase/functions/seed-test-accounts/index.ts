import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const results: any[] = [];

    // 1. Create two demo venues
    const venueConfigs = [
      { name: "Demo Cafe & Resto", type: "cafe", address: "Jl. Sudirman No. 123, Jakarta", contact_email: "demo@zmiphotobox.com", contact_phone: "08123456789" },
      { name: "Grand Mall Photobox", type: "mall", address: "Jl. Thamrin No. 456, Jakarta", contact_email: "mall@zmiphotobox.com", contact_phone: "08198765432" },
    ];

    const venueIds: string[] = [];
    for (const vc of venueConfigs) {
      const { data: existing } = await supabaseAdmin
        .from("venues")
        .select("id")
        .eq("name", vc.name)
        .maybeSingle();

      if (existing) {
        venueIds.push(existing.id);
      } else {
        const { data: newV } = await supabaseAdmin
          .from("venues")
          .insert({ ...vc, is_active: true })
          .select("id")
          .single();
        if (newV) venueIds.push(newV.id);
      }
    }
    results.push({ step: "venues", venueIds });

    // 2. Create demo kiosks
    const kioskConfigs = [
      { kiosk_code: "DEMO-001", location_name: "Demo Cafe - Lantai 1", venue_id: venueIds[0], status: "online" },
      { kiosk_code: "DEMO-002", location_name: "Grand Mall - Lobby", venue_id: venueIds[1], status: "online" },
    ];

    for (const kc of kioskConfigs) {
      const { data: existing } = await supabaseAdmin
        .from("kiosks").select("id").eq("kiosk_code", kc.kiosk_code).maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("kiosks").insert(kc);
      }
    }
    results.push({ step: "kiosks", codes: kioskConfigs.map(k => k.kiosk_code) });

    // 3. Create revenue splits for venues
    for (const venueId of venueIds) {
      const { data: existingSplits } = await supabaseAdmin
        .from("revenue_splits").select("id").eq("venue_id", venueId);
      if (!existingSplits || existingSplits.length === 0) {
        await supabaseAdmin.from("revenue_splits").insert([
          { venue_id: venueId, role_name: "superadmin", percentage: 10, cooperation_type: "revenue_share", ppn_mode: "exclude", notes: "PT ZMI" },
          { venue_id: venueId, role_name: "admin", percentage: 30, cooperation_type: "revenue_share", ppn_mode: "exclude", notes: "Pemilik Booth" },
          { venue_id: venueId, role_name: "venue", percentage: 40, cooperation_type: "revenue_share", ppn_mode: "exclude", notes: "Pemilik Lokasi" },
          { venue_id: venueId, role_name: "partner", percentage: 20, cooperation_type: "revenue_share", ppn_mode: "exclude", notes: "Partner/Investor" },
        ]);
      }
    }
    results.push({ step: "revenue_splits" });

    // 4. Create pricing packages
    const { data: existingPkg } = await supabaseAdmin.from("pricing_packages").select("id").limit(1);
    if (!existingPkg || existingPkg.length === 0) {
      await supabaseAdmin.from("pricing_packages").insert([
        { name: "Strip 3 Foto", grid_type: "strip-2x6", num_photos: 3, price: 15000, is_active: true },
        { name: "Grid 4 Foto", grid_type: "grid-2x2", num_photos: 4, price: 20000, is_active: true },
        { name: "Single Portrait", grid_type: "single-4x6", num_photos: 1, price: 10000, is_active: true },
      ]);
    }
    results.push({ step: "pricing_packages" });

    // 5. Create all 5 role accounts
    const testAccounts = [
      { email: "superadmin@zmiphotobox.com", password: "Super123!", role: "superadmin" as const, venueId: null },
      { email: "admin@zmiphotobox.com", password: "Admin123!", role: "admin" as const, venueId: null },
      { email: "operator@zmiphotobox.com", password: "Operator123!", role: "operator" as const, venueId: venueIds[0] || null },
      { email: "venue@zmiphotobox.com", password: "Venue123!", role: "venue" as const, venueId: venueIds[0] || null },
      { email: "partner@zmiphotobox.com", password: "Partner123!", role: "partner" as const, venueId: venueIds[0] || null },
    ];

    for (const account of testAccounts) {
      let userId: string | null = null;

      const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
      });

      if (createErr) {
        if (createErr.message?.includes("already been registered")) {
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
          const existing = users?.find(u => u.email === account.email);
          userId = existing?.id || null;
        } else {
          results.push({ step: account.role, error: createErr.message });
          continue;
        }
      } else {
        userId = userData.user?.id || null;
      }

      if (!userId) {
        results.push({ step: account.role, error: "Could not create or find user" });
        continue;
      }

      // Clear old role of same type, then insert
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", account.role);

      const insertData: any = { user_id: userId, role: account.role };
      if (account.venueId) insertData.venue_id = account.venueId;

      const { error: roleErr } = await supabaseAdmin.from("user_roles").insert(insertData);

      // For operator, also assign second venue
      if (account.role === "operator" && venueIds[1]) {
        await supabaseAdmin.from("user_roles").delete()
          .eq("user_id", userId).eq("role", "operator").eq("venue_id", venueIds[1]);
        await supabaseAdmin.from("user_roles").insert({
          user_id: userId, role: "operator", venue_id: venueIds[1],
        });
      }

      results.push({
        step: account.role,
        email: account.email,
        password: account.password,
        userId,
        roleAssigned: !roleErr,
        error: roleErr?.message || null,
      });
    }

    // 6. Create sample templates
    const { data: existingTpl } = await supabaseAdmin.from("templates").select("id").limit(1);
    if (!existingTpl || existingTpl.length === 0) {
      await supabaseAdmin.from("templates").insert([
        { name: "Strip Klasik", grid_type: "strip-2x6", num_photos: 3, orientation: "portrait", canvas_width: 600, canvas_height: 1800, grid_cols: 1, price: 15000, is_active: true },
        { name: "Grid Modern", grid_type: "grid-2x2", num_photos: 4, orientation: "portrait", canvas_width: 1200, canvas_height: 1200, grid_cols: 2, price: 20000, is_active: true },
        { name: "Portrait Elegan", grid_type: "single-4x6", num_photos: 1, orientation: "portrait", canvas_width: 1080, canvas_height: 1440, grid_cols: 1, price: 10000, is_active: true },
      ]);
    }
    results.push({ step: "templates" });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
