import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Create a Supabase client that reads/writes auth cookies from the request.
 * Returns both the client and response headers (to forward Set-Cookie).
 */
export function createSupabaseServerClient(request: Request) {
  const url = requireEnv("SUPABASE_URL", supabaseUrl);
  const anonKey = requireEnv("SUPABASE_ANON_KEY", supabaseAnonKey);

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
  const url = requireEnv("SUPABASE_URL", supabaseUrl);
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", supabaseServiceKey);
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
