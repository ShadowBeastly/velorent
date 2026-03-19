// app/api/v1/_shared.js
// Shared helpers for v1 API routes.

import { createClient } from "@supabase/supabase-js";

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not configured");
  return createClient(url, key);
}

/** Standard success envelope */
export function ok(data, { pagination = null, meta = null, headers = {} } = {}) {
  const body = { data };
  if (pagination) body.pagination = pagination;
  if (meta) body.meta = meta;
  return Response.json(body, { headers });
}

/** Standard error envelope */
export function err(code, message, status = 400) {
  return Response.json({ error: { code, message } }, { status });
}

/** Parse cursor-based pagination params from a URL */
export function parsePagination(url) {
  const { searchParams } = new URL(url);
  const cursor = searchParams.get("cursor") ?? null;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  return { cursor, limit };
}

/** Build pagination response object */
export function buildPagination(rows, limit) {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;
  return { page, pagination: { cursor: nextCursor, has_more: hasMore } };
}
