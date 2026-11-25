"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { buildInvitationEmail } from "@/app/lib/invitation-email";
import { getResendClient } from "@/app/lib/resend";
import { CODE_ALPHABET, CODE_LENGTH } from "@/app/lib/invitation-code";
import type { Relationship } from "@/app/lib/relationship";
import { createClient } from "@/utils/supabase/server";

type CreateChildField = "name" | "birthDate" | "roomId";

export type CreateChildResult =
  | { ok: true; childId: string }
  | {
      ok: false;
      fieldErrors?: Partial<Record<CreateChildField, string>>;
      error?: string;
    };

type CreateChildInput = {
  fullName: string;
  birthDate: string; // dd/mm/aaaa — parsed here, never trusted from the client
  roomId: string; // uuid of public.rooms
  allergies: string; // free text, split by commas into allergy_tags
  medicalNotes: string;
};

// Parse "dd/mm/aaaa" into "aaaa-mm-dd". Returns null when the format, the
// calendar date or the past-only rule fails.
function parseBirthDate(input: string): string | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!isRealDate) {
    return null;
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (date.getTime() > todayUtc) {
    return null;
  }

  return `${yearText}-${monthText}-${dayText}`;
}

// Same day the database would return for current_date (UTC).
function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Inserts a child into `public.children` under RLS. The database only accepts
 * inserts from staff/admin of the room's daycare; permission failures are
 * returned as a general error, not as field errors.
 */
export async function createChild(input: CreateChildInput): Promise<CreateChildResult> {
  const fullName = input.fullName.trim();
  const roomId = input.roomId.trim();
  const fieldErrors: Partial<Record<CreateChildField, string>> = {};

  if (!fullName) {
    fieldErrors.name = "Ingresa el nombre completo.";
  }

  const birthDateInput = input.birthDate.trim();
  const birthDate = /^\d{2}\/\d{2}\/\d{4}$/.test(birthDateInput)
    ? parseBirthDate(birthDateInput)
    : null;

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(birthDateInput)) {
    fieldErrors.birthDate = "Usa el formato dd/mm/aaaa.";
  } else if (!birthDate) {
    fieldErrors.birthDate = "Ingresa una fecha real y no futura.";
  }

  if (!roomId) {
    fieldErrors.roomId = "Selecciona una sala.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // Defensive narrowing: the checks above already guarantee these values.
  if (!birthDate || !fullName || !roomId) {
    return { ok: false, fieldErrors };
  }

  const allergyTags = input.allergies
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const medicalNotes = input.medicalNotes.trim();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("children")
    .insert({
      room_id: roomId,
      full_name: fullName,
      birth_date: birthDate,
      enrolled_at: todayIsoDate(),
      medical_notes: medicalNotes || null,
      allergy_tags: allergyTags,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return { ok: false, error: "No pudimos guardar el niño. Intenta de nuevo." };
  }

  revalidatePath("/kids");

  return { ok: true, childId: data.id };
}

type CreateInvitationField = "name" | "email";

export type CreateInvitationResult =
  | { ok: true; code: string; emailSent: boolean }
  | {
      ok: false;
      fieldErrors?: Partial<Record<CreateInvitationField, string>>;
      error?: string;
    };

type CreateInvitationInput = {
  childId: string;
  fullName: string;
  email: string;
  relation: Relationship;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 5 chars, uppercase, alphabet without ambiguous glyphs (no 0/O/1/I).
function generateCode(): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function sevenDaysFromNow(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Creates an invitation for a parent/tutor to link with a child and sends it
 * by email through Resend. Only staff/admin of the child's daycare can create
 * invitations (enforced by RLS).
 *
 * When Resend fails (or is not configured) the invitation still persists and
 * `emailSent: false` tells the modal to offer the code manually.
 */
export async function createInvitation(
  input: CreateInvitationInput,
): Promise<CreateInvitationResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLocaleLowerCase("es");
  const childId = input.childId.trim();
  const fieldErrors: Partial<Record<CreateInvitationField, string>> = {};

  if (!fullName) {
    fieldErrors.name = "Ingresa el nombre completo.";
  }

  if (!email) {
    fieldErrors.email = "Ingresa el email.";
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Ingresa un email válido.";
  }

  if (Object.keys(fieldErrors).length > 0 || !childId) {
    return { ok: false, fieldErrors };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Validated session: getClaims verifies the JWT signature. The profile row
  // is resolved fresh (never trust user_metadata) and must be staff/admin.
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) {
    return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, daycares(name)")
    .eq("id", userId)
    .maybeSingle<{ role: string; daycares: { name: string } | null }>();

  if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
    return { ok: false, error: "Solo el personal puede vincular padres." };
  }
  const daycareName = profile.daycares?.name ?? "open-daycare";

  // Reject emails that already have a Supabase Auth account (staff-only RPC).
  const { data: emailExists, error: emailExistsError } = await supabase.rpc(
    "auth_email_exists",
    { p_email: email },
  );
  if (emailExistsError) {
    return { ok: false, error: "No pudimos validar el email. Intenta de nuevo." };
  }
  if (emailExists) {
    return {
      ok: false,
      fieldErrors: {
        email: "Este email ya tiene una cuenta. Iniciá sesión para vincular.",
      },
    };
  }

  // Reject emails with a pending/accepted invitation for this child. The
  // partial unique index backs this rule in the database as well.
  const { data: duplicates } = await supabase
    .from("invitations")
    .select("id")
    .eq("child_id", childId)
    .eq("email", email)
    .in("status", ["pending", "accepted"])
    .limit(1);

  if (duplicates && duplicates.length > 0) {
    return {
      ok: false,
      fieldErrors: {
        email: "Este email ya tiene una invitación para este niño.",
      },
    };
  }

  // Insert with retry on code collision (unique on code and upper(code)).
  let invitationId: string | null = null;
  let code = "";
  for (let attempt = 0; attempt < 5 && !invitationId; attempt += 1) {
    code = generateCode();
    const { data, error } = await supabase
      .from("invitations")
      .insert({
        child_id: childId,
        invited_by: userId,
        full_name: fullName,
        email,
        relationship: input.relation,
        code,
        expires_at: sevenDaysFromNow(),
      })
      .select("id")
      .single<{ id: string }>();

    if (!error && data) {
      invitationId = data.id;
    } else if (error?.code !== "23505") {
      return { ok: false, error: "No pudimos crear la invitación. Intenta de nuevo." };
    }
  }

  if (!invitationId) {
    return { ok: false, error: "No pudimos crear la invitación. Intenta de nuevo." };
  }

  // The child's name for the email subject/body (RLS: staff reads its daycare).
  const { data: child } = await supabase
    .from("children")
    .select("full_name")
    .eq("id", childId)
    .maybeSingle<{ full_name: string }>();
  const childName = child?.full_name ?? "tu hijo";

  let emailSent = false;
  const resend = getResendClient();
  if (resend) {
    const message = buildInvitationEmail({
      daycareName,
      childName,
      parentName: fullName,
      relationship: input.relation,
      code,
    });
    const { error: sendError } = await resend.emails.send({
      from: message.from,
      to: email,
      subject: message.subject,
      html: message.html,
    });
    emailSent = !sendError;
  }

  revalidatePath(`/kids/${childId}`);

  return { ok: true, code, emailSent };
}
