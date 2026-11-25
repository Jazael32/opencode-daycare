"use server";

import { cookies } from "next/headers";

import { normalizeCode } from "@/app/lib/invitation-code";
import { createClient } from "@/utils/supabase/server";

export type AcceptInvitationResult = { ok: true } | { ok: false; error: string };

type InvitationRow = {
  id: string;
  child_id: string;
  relationship: string;
  status: string;
  expires_at: string;
};

/**
 * Marks the caller's invitation as accepted and creates the parent ↔ child
 * link. Runs right after signUp, already authenticated, so everything goes
 * through RLS: the invitation is only visible to its own email and the
 * parent_children insert requires the accepted invitation.
 *
 * A UNIQUE (parent_id, child_id) conflict counts as success (idempotent).
 */
export async function acceptInvitation(
  input: { code: string },
): Promise<AcceptInvitationResult> {
  const code = normalizeCode(input.code);
  if (!code) {
    return { ok: false, error: "Ingresa el código de invitación." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Session just created by signUp; getClaims verifies the JWT signature.
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) {
    return { ok: false, error: "Tu sesión no está activa. Intenta de nuevo." };
  }

  // RLS (own email) filters this to the caller's invitation; a code that
  // belongs to another email returns zero rows, which reads as "no match".
  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, child_id, relationship, status, expires_at")
    .eq("code", code)
    .maybeSingle<InvitationRow>();

  if (!invitation) {
    return {
      ok: false,
      error: "No encontramos una invitación para este código y email.",
    };
  }

  // Already accepted: do not re-validate, treat as done.
  if (invitation.status === "accepted") {
    return { ok: true };
  }

  if (invitation.status !== "pending") {
    return {
      ok: false,
      error: "Esta invitación ya no está disponible.",
    };
  }

  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: "Esta invitación venció. Pide una nueva." };
  }

  // The update policy only lets the invitation land on accepted + accepted_at.
  const { data: updated, error: updateError } = await supabase
    .from("invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invitation.id)
    .select("id");

  // Blocked updates (expired in the meantime, status moved) return 0 rows
  // silently under RLS, so `updated` empty is a failure signal.
  if (updateError || !updated || updated.length === 0) {
    return { ok: false, error: "No pudimos aceptar la invitación. Intenta de nuevo." };
  }

  // The insert policy requires an accepted invitation with the caller's email,
  // which the update above just created.
  const { error: linkError } = await supabase
    .from("parent_children")
    .insert({
      parent_id: userId,
      child_id: invitation.child_id,
      relationship: invitation.relationship as "mother" | "father" | "guardian",
    });

  // UNIQUE (parent_id, child_id) conflict = already linked = success.
  if (linkError && linkError.code !== "23505") {
    return {
      ok: false,
      error: "No pudimos crear el vínculo con tu hijo. Intenta de nuevo.",
    };
  }

  return { ok: true };
}
