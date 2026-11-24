import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";

export type UserRole = "staff" | "parent" | "admin";

export type UserProfile = {
  fullName: string;
  role: UserRole;
  daycareName: string;
};

type ProfileRow = {
  full_name: string;
  role: string;
  daycares: { name: string } | null;
};

const isUserRole = (value: string): value is UserRole =>
  value === "staff" || value === "parent" || value === "admin";

/**
 * Reads the profile of the authenticated user (own row via RLS) together
 * with the name of their daycare.
 *
 * Returns `null` when there is no valid session or the profile row cannot
 * be resolved.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // getClaims() verifies the JWT signature and refreshes the token when it is
  // close to expiring. Never use getSession() here: it reads the cookie
  // without validating it.
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("full_name, role, daycares(name)")
    .eq("id", claimsData.claims.sub)
    .maybeSingle<ProfileRow>();

  if (error || !data || !isUserRole(data.role)) {
    return null;
  }

  return {
    fullName: data.full_name,
    role: data.role,
    daycareName: data.daycares?.name ?? "",
  };
}
