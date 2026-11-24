"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

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
