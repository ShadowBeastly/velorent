// src/utils/apiAuth.js
// Authenticates incoming API requests via Bearer token.
// Hashes the raw token with SHA-256 and looks it up in api_keys.

import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not configured");
  return createClient(url, key);
}

/**
 * Hash a raw API key string with SHA-256.
 * @param {string} raw
 * @returns {Promise<string>} hex digest
 */
export async function hashKey(raw) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(raw));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Authenticate an incoming API request.
 * Reads the Bearer token from the Authorization header, hashes it, and
 * looks it up in api_keys. Updates last_used_at on success.
 *
 * @param {Request} request
 * @returns {Promise<{ orgId: string, permissions: string[] }>}
 * @throws {Response} 401 on auth failure
 */
export async function authenticateApiKey(request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    throw Response.json(
      { error: { code: "UNAUTHORIZED", message: "Bearer token required" } },
      { status: 401 }
    );
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    throw Response.json(
      { error: { code: "UNAUTHORIZED", message: "Empty token" } },
      { status: 401 }
    );
  }

  const keyHash = await hashKey(rawKey);
  const supabase = getServiceClient();

  const { data: apiKey, error } = await supabase
    .from("api_keys")
    .select("id, organization_id, permissions, expires_at, is_active")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw Response.json(
      { error: { code: "SERVER_ERROR", message: "Auth lookup failed" } },
      { status: 500 }
    );
  }

  if (!apiKey) {
    throw Response.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid or inactive API key" } },
      { status: 401 }
    );
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    throw Response.json(
      { error: { code: "UNAUTHORIZED", message: "API key expired" } },
      { status: 401 }
    );
  }

  // Fire-and-forget — don't block response on this
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {});

  return {
    orgId: apiKey.organization_id,
    permissions: apiKey.permissions ?? [],
  };
}

/**
 * Check if the authenticated context has a required permission.
 * @param {string[]} permissions
 * @param {string} required  e.g. "bikes:write"
 * @throws {Response} 403 if missing
 */
export function requirePermission(permissions, required) {
  if (!permissions.includes(required)) {
    throw Response.json(
      { error: { code: "FORBIDDEN", message: `Permission required: ${required}` } },
      { status: 403 }
    );
  }
}
