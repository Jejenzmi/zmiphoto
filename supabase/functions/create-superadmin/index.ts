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

    // Verify caller is authenticated and is admin/superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create user with admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      // User might already exist
      if (createError.message?.includes("already been registered")) {
        // Find existing user
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email === email);
        if (existingUser) {
          // Assign superadmin role if not already
          const { data: existingRole } = await supabaseAdmin
            .from("user_roles")
            .select("id")
            .eq("user_id", existingUser.id)
            .eq("role", "superadmin")
            .maybeSingle();

          if (!existingRole) {
            await supabaseAdmin.from("user_roles").insert({
              user_id: existingUser.id,
              role: "superadmin",
            });
          }

          return new Response(JSON.stringify({ success: true, message: "User exists, superadmin role assigned", userId: existingUser.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      throw createError;
    }

    // Assign superadmin role
    if (userData.user) {
      await supabaseAdmin.from("user_roles").insert({
        user_id: userData.user.id,
        role: "superadmin",
      });
    }

    return new Response(JSON.stringify({ success: true, userId: userData.user?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
