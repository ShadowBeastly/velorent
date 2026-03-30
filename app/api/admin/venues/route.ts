// app/api/admin/venues/route.ts
// Server-side admin mutation: deactivate a venue.
// Requires authenticated superadmin — verified via server-side Supabase session + profiles table.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

async function getSuperadminClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

async function verifySuperadmin(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "superadmin";
}

// PATCH /api/admin/venues — deactivate a venue
// Body: { venue_id: string, action: "deactivate" }
export async function PATCH(req: NextRequest) {
  const supabase = await getSuperadminClient();
  if (!(await verifySuperadmin(supabase))) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { venue_id, action } = body;

  if (!venue_id || action !== "deactivate") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase
    .from("venues")
    .update({ is_active: false })
    .eq("id", venue_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
