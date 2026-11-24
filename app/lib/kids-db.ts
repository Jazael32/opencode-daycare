import { AVATAR_PALETTE } from "@/app/lib/mock-kids";

// Shapes of the rows read from `public.rooms` and `public.children` (SPEC 10).
export type RoomRow = {
  id: string;
  name: string;
};

export type ChildRow = {
  id: string;
  room_id: string;
  full_name: string;
  birth_date: string;
  enrolled_at: string;
  medical_notes: string | null;
  allergy_tags: string[];
};

// Profile select: the child plus the name of its room.
export type ChildProfileRow = {
  id: string;
  full_name: string;
  birth_date: string;
  enrolled_at: string;
  medical_notes: string | null;
  allergy_tags: string[];
  rooms: { name: string } | null;
};

// "2025-02-01" → "feb 2025", the format the mockup shows for the enrollment.
export function formatEnrolledDate(enrolledAt: string): string {
  const [year, month] = enrolledAt.split("-").map(Number);
  const formatted = new Intl.DateTimeFormat("es", { month: "short" }).format(
    new Date(year, month - 1, 1),
  );
  return `${formatted} ${year}`;
}

// Stable avatar colors for a child without one stored: the id is hashed into
// the same palette the mock uses, so the color never changes between visits.
export function avatarColorsForId(id: string): { bg: string; fg: string } {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index)) % AVATAR_PALETTE.length;
  }
  return AVATAR_PALETTE[hash];
}
