import { createSupabaseServerClient, createSupabaseAdminClient } from "./supabase.server";
import type { Profile } from "~/types";

export async function getProfile(
  request: Request,
  userId: string
): Promise<Profile | null> {
  const { supabase } = createSupabaseServerClient(request);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to load profile: ${error.message}`);
  }
  return data as Profile;
}

export async function listProfiles(request: Request): Promise<Profile[]> {
  const { supabase } = createSupabaseServerClient(request);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw new Error(`Failed to list profiles: ${error.message}`);
  return (data ?? []) as Profile[];
}

export async function upsertProfile(
  userId: string,
  email: string,
  updates: Partial<Pick<Profile, "full_name" | "avatar_url">> = {}
): Promise<Profile> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert profile: ${error.message}`);
  return data as Profile;
}
