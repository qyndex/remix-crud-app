import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  await supabase.auth.signOut();
  return redirect("/auth/login", { headers });
}

// GET requests to /auth/logout also sign out (progressive enhancement)
export async function loader({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  await supabase.auth.signOut();
  return redirect("/auth/login", { headers });
}
