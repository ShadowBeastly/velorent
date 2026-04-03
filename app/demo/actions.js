"use server";

import { createClient } from "@supabase/supabase-js";

export async function demoSignIn() {
  const email = process.env.DEMO_EMAIL || process.env.NEXT_PUBLIC_DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD || process.env.NEXT_PUBLIC_DEMO_PASSWORD;

  if (!email || !password) {
    return { error: "Demo-Account ist nicht konfiguriert." };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message.includes("Invalid login")
      ? "Demo-Account nicht gefunden."
      : "Demo-Login fehlgeschlagen." };
  }

  // Return session tokens so the client can set them
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    email,
  };
}
