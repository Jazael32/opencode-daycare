import {
  AVATAR_PALETTE,
  kids as mockKids,
  ROOMS,
  type Kid,
  type Room,
} from "@/app/lib/mock-kids";

// Versioned key so a future schema change can migrate without breaking.
const STORAGE_KEY = "od-kids:v1";

// Raw modal fields, already trimmed by the caller; "" when the field is empty.
export interface NewKidDraft {
  name: string; // "Martina López"
  birthDate: string; // ISO "2023-03-12" — parsed from dd/mm/aaaa
  room: Room; // one of ROOMS
  allergies: string; // "Maní, Lactosa" — raw input, "" when empty
  medicalNotes: string; // raw textarea, "" when empty
}

// Parse "dd/mm/aaaa" into an ISO birth date ("2023-03-12").
// Returns null when the format, the calendar date or the past-only rule fails.
export function parseBirthDate(input: string): string | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!isRealDate) {
    return null;
  }

  const today = new Date();
  const isPastOrToday =
    year < today.getFullYear() ||
    (year === today.getFullYear() &&
      (month - 1 < today.getMonth() ||
        (month - 1 === today.getMonth() && day <= today.getDate())));
  if (!isPastOrToday) {
    return null;
  }

  return `${yearText}-${monthText}-${dayText}`;
}

// Window event dispatched after each save so the grid can re-read storage.
export const KIDS_UPDATED_EVENT = "od-kids-updated";

export function notifyKidsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(KIDS_UPDATED_EVENT));
  }
}

// Cached storage snapshot: keeps object identity stable between reads so it
// can back useSyncExternalStore without re-parsing on every call.
let snapshotRaw: string | null | undefined; // undefined = never read
let snapshotKids: Kid[] = [];

function readStorageSnapshot(): Kid[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === snapshotRaw) {
    return snapshotKids;
  }

  let parsed: Kid[] = [];
  try {
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        parsed = data as Kid[];
      }
    }
  } catch {
    parsed = [];
  }

  snapshotRaw = raw;
  snapshotKids = parsed;
  return snapshotKids;
}

// Read the stored kids; [] when unavailable (SSR, disabled storage, bad data).
export function getStoredKids(): Kid[] {
  return readStorageSnapshot();
}

export function getStoredKidBySlug(slug: string): Kid | undefined {
  return readStorageSnapshot().find((kid) => kid.slug === slug);
}

// Subscribe the caller to kid-list changes (saves in this tab and in others).
export function subscribeToKids(callback: () => void): () => void {
  window.addEventListener(KIDS_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(KIDS_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// "Martina López" → "martina-lopez"; accents dropped, other chars to dashes.
function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "martina-lopez", "martina-lopez-2", "martina-lopez-3"… on collision.
function uniqueSlug(name: string, takenSlugs: Set<string>): string {
  const base = slugify(name);
  if (!takenSlugs.has(base)) {
    return base;
  }
  let suffix = 2;
  while (takenSlugs.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

// Format the current month as the mock does ("nov 2026").
function currentEnrolled(): string {
  const now = new Date();
  const month = new Intl.DateTimeFormat("es", { month: "short" }).format(now);
  return `${month} ${now.getFullYear()}`;
}

// Derive the full Kid from the draft, persist it and return it.
// The modal validates before calling, but this guards against bad data too.
export function saveNewKid(draft: NewKidDraft): Kid {
  const name = draft.name.trim();
  if (!name) {
    throw new Error("Kid name is required");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate)) {
    throw new Error("Kid birth date must be an ISO date");
  }
  if (!ROOMS.includes(draft.room)) {
    throw new Error("Kid room is invalid");
  }

  const stored = getStoredKids();
  const takenSlugs = new Set([...mockKids, ...stored].map((kid) => kid.slug));

  const allergyTags = draft.allergies
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const kid: Kid = {
    slug: uniqueSlug(name, takenSlugs),
    name,
    initial: name.charAt(0).toLocaleUpperCase("es"),
    birthDate: draft.birthDate,
    room: draft.room,
    enrolled: currentEnrolled(),
    allergy:
      allergyTags.length > 0
        ? {
            label: allergyTags.map((tag) => tag.toLocaleUpperCase("es")).join(", "),
            notes: draft.medicalNotes,
          }
        : undefined,
    avatarColors: AVATAR_PALETTE[stored.length % AVATAR_PALETTE.length],
    parents: [],
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...stored, kid]));
  } catch {
    // Persistence is best-effort: still return the kid so the UI can show it.
  }

  return kid;
}
