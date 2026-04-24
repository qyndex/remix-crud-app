import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.SUPABASE_URL || "http://localhost:54321";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "placeholder";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Create a Supabase client that reads/writes auth cookies from the request.
 * Returns both the client and response headers (to forward Set-Cookie).
 */
export function createSupabaseServerClient(request: Request) {
  const url = supabaseUrl;
  const anonKey = supabaseAnonKey;

  const headers = new Headers();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, options)
          );
        });
      },
    },
  });

  return { supabase, headers };
}

/**
 * Create a Supabase admin client (service role) — use only in server actions/loaders
 * that need to bypass RLS.
 */
export function createSupabaseAdminClient() {
  const url = supabaseUrl;
  const serviceKey = (supabaseServiceKey || supabaseAnonKey);
  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get the currently authenticated user from the request.
 * Returns null if not authenticated.
 */
export async function getUser(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, headers };
}

/**
 * Require authentication — throws a redirect to /auth/login if not signed in.
 */
export async function requireUser(request: Request) {
  const { user, headers } = await getUser(request);
  if (!user) {
    const url = new URL(request.url);
    throw new Response(null, {
      status: 302,
      headers: {
        ...Object.fromEntries(headers.entries()),
        Location: `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`,
      },
    });
  }
  return { user, headers };
}
