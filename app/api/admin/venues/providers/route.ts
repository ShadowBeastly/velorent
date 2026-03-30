// app/api/admin/venues/providers/route.ts
// Server-side admin mutations: add or remove a venue-provider link.
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

// POST /api/admin/venues/providers — add a provider to a venue
// Body: { hotel_id: string, organization_id: string, distance_km?: number }
export async function POST(req: NextRequest) {
  const supabase = await getSuperadminClient();
  if (!(await verifySuperadmin(supabase))) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { hotel_id, organization_id, distance_km } = body;

  if (!hotel_id || !organization_id) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase.from("venue_providers").upsert(
    {
      hotel_id,
      organization_id,
      distance_km: distance_km ? parseFloat(distance_km) : null,
      is_active: true,
    },
    { onConflict: "hotel_id,organization_id" }
  );

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

// DELETE /api/admin/venues/providers — remove a venue-provider link
// Body: { link_id: string }
export async function DELETE(req: NextRequest) {
  const supabase = await getSuperadminClient();
  if (!(await verifySuperadmin(supabase))) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { link_id } = body;

  if (!link_id) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase
    .from("venue_providers")
    .delete()
    .eq("id", link_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
