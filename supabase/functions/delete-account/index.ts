// =====================================================
// RENTCORE - ACCOUNT DELETION (Art. 17 DSGVO)
// Supabase Edge Function
// =====================================================
//
// Löscht das eigene Konto inklusive Organisationsdaten.
// Erfordert eine aktive Supabase-Session (JWT im Authorization-Header).
//
// DEPLOY:
//   SUPABASE_ACCESS_TOKEN=xxx npx supabase functions deploy delete-account --project-ref <project-ref>
//

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
        // User-Client aus dem JWT der Anfrage
        const userClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
        );

        const { data: { user }, error: authError } = await userClient.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Admin-Client für die eigentliche Löschung
        const adminClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Lösche den Auth-User (Kaskade löscht via RLS/FK auch Org-Daten)
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
