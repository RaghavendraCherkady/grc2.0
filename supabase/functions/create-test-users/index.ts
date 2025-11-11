import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const users = [
      { email: "officer@compliance.com", password: "Officer123!", fullName: "John Officer", role: "loan_officer" },
      { email: "manager@compliance.com", password: "Manager123!", fullName: "Sarah Manager", role: "compliance_manager" },
      { email: "cco@compliance.com", password: "CCO123!", fullName: "Michael CCO", role: "cco" },
      { email: "auditor@compliance.com", password: "Auditor123!", fullName: "Lisa Auditor", role: "internal_auditor" },
      { email: "admin@compliance.com", password: "Admin123!", fullName: "David Admin", role: "system_admin" }
    ];

    const results = [];

    for (const user of users) {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      });

      if (authError) {
        results.push({ email: user.email, success: false, error: authError.message });
        continue;
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: authData.user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.role
        });

      if (profileError) {
        results.push({ email: user.email, success: false, error: profileError.message });
      } else {
        results.push({ email: user.email, success: true, role: user.role });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
