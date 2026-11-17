export type ParentStatus = "active" | "pending";

// Spanish labels for display; the UI renders these, never the raw value.
export const parentStatusLabels: Record<ParentStatus, string> = {
  active: "activa",
  pending: "invitación enviada",
};

// Parent link status pill colors, taken from the mockup: background / text.
export const parentStatusColors: Record<ParentStatus, { background: string; text: string }> = {
  active: { background: "#CFEBD8", text: "#3E9B6C" },
  pending: { background: "#F7E7A6", text: "#9A7B1E" },
};

export interface Parent {
  name: string; // "Lucía Fernández"
  initial: string; // "L" — circular avatar with a letter
  relation: string; // "Mamá" | "Papá"
  status: ParentStatus;
  avatarColors: { bg: string; fg: string }; // e.g. #C9B6E8 / #fff
}

export interface Kid {
  slug: string; // "mateo-fernandez" — kebab-case of the name
  name: string; // "Mateo Fernández"
  initial: string; // "M"
  birthDate: string; // ISO "2023-03-12" — age is computed, never stored
  room: string; // "Soles"
  enrolled: string; // "feb 2025" — display string
  allergy?: { label: string; notes: string }; // { label: "MANÍ", notes: "Alergia al maní…" }
  avatarColors: { bg: string; fg: string }; // e.g. #A9D9E8 / #1F7A93
  parents: Parent[];
}

export function getKidBySlug(slug: string): Kid | undefined {
  return kids.find((kid) => kid.slug === slug);
}

// Completed years between an ISO birth date ("2023-03-12") and today.
// Parsed manually (not via `new Date(iso)`) to avoid timezone off-by-one days.
export function getAge(birthDate: string): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  const today = new Date();
  const age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day);
  return beforeBirthday ? age - 1 : age;
}

// Format an ISO birth date as "12 mar 2023" for display.
export function formatBirthDate(birthDate: string): string {
  const [year, month, day] = birthDate.split("-").map(Number);
  const formatted = new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
  return `${formatted} ${year}`;
}

export const kids: Kid[] = [
  {
    slug: "mateo-fernandez",
    name: "Mateo Fernández",
    initial: "M",
    birthDate: "2023-03-12",
    room: "Soles",
    enrolled: "feb 2025",
    allergy: {
      label: "MANÍ",
      notes: "Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila.",
    },
    avatarColors: { bg: "#A9D9E8", fg: "#1F7A93" },
    parents: [
      {
        name: "Lucía Fernández",
        initial: "L",
        relation: "Mamá",
        status: "active",
        avatarColors: { bg: "#C9B6E8", fg: "#FFFFFF" },
      },
      {
        name: "Diego Fernández",
        initial: "D",
        relation: "Papá",
        status: "pending",
        avatarColors: { bg: "#A9C7E8", fg: "#FFFFFF" },
      },
    ],
  },
  {
    slug: "sofia-mendez",
    name: "Sofía Méndez",
    initial: "S",
    birthDate: "2024-04-18",
    room: "Soles",
    enrolled: "mar 2025",
    avatarColors: { bg: "#F4B8CC", fg: "#C44A7A" },
    parents: [
      {
        name: "Carla Méndez",
        initial: "C",
        relation: "Mamá",
        status: "active",
        avatarColors: { bg: "#F4B8CC", fg: "#FFFFFF" },
      },
    ],
  },
  {
    slug: "benjamin-ruiz",
    name: "Benjamín Ruiz",
    initial: "B",
    birthDate: "2023-07-08",
    room: "Soles",
    enrolled: "ago 2024",
    avatarColors: { bg: "#B9DEC4", fg: "#3E8B62" },
    parents: [
      {
        name: "Valeria Ruiz",
        initial: "V",
        relation: "Mamá",
        status: "active",
        avatarColors: { bg: "#B9DEC4", fg: "#FFFFFF" },
      },
      {
        name: "Andrés Ruiz",
        initial: "A",
        relation: "Papá",
        status: "active",
        avatarColors: { bg: "#A9D9E8", fg: "#FFFFFF" },
      },
    ],
  },
  {
    slug: "valentina-soto",
    name: "Valentina Soto",
    initial: "V",
    birthDate: "2024-08-02",
    room: "Soles",
    enrolled: "sep 2025",
    avatarColors: { bg: "#F4DC8E", fg: "#9A7B1E" },
    parents: [],
  },
  {
    slug: "tomas-diaz",
    name: "Tomás Díaz",
    initial: "T",
    birthDate: "2023-01-25",
    room: "Soles",
    enrolled: "feb 2024",
    allergy: {
      label: "LACTOSA",
      notes: "Intolerante a la lactosa. Le servimos derivados sin lactosa y su mamá envía la leche de reemplazo.",
    },
    avatarColors: { bg: "#C9B6E8", fg: "#7B5FC0" },
    parents: [
      {
        name: "Martín Díaz",
        initial: "M",
        relation: "Papá",
        status: "active",
        avatarColors: { bg: "#C9B6E8", fg: "#FFFFFF" },
      },
    ],
  },
  {
    slug: "emma-castro",
    name: "Emma Castro",
    initial: "E",
    birthDate: "2024-02-14",
    room: "Soles",
    enrolled: "jul 2025",
    avatarColors: { bg: "#F4B8CC", fg: "#C44A7A" },
    parents: [
      {
        name: "Paula Castro",
        initial: "P",
        relation: "Mamá",
        status: "active",
        avatarColors: { bg: "#F4DC8E", fg: "#FFFFFF" },
      },
    ],
  },
  {
    slug: "lucas-romero",
    name: "Lucas Romero",
    initial: "L",
    birthDate: "2023-09-30",
    room: "Soles",
    enrolled: "ene 2025",
    avatarColors: { bg: "#A9D9E8", fg: "#1F7A93" },
    parents: [
      {
        name: "Javier Romero",
        initial: "J",
        relation: "Papá",
        status: "active",
        avatarColors: { bg: "#A9C7E8", fg: "#FFFFFF" },
      },
    ],
  },
  {
    slug: "olivia-vega",
    name: "Olivia Vega",
    initial: "O",
    birthDate: "2024-06-21",
    room: "Soles",
    enrolled: "abr 2025",
    avatarColors: { bg: "#B9DEC4", fg: "#3E8B62" },
    parents: [
      {
        name: "Mariana Vega",
        initial: "M",
        relation: "Mamá",
        status: "active",
        avatarColors: { bg: "#B9DEC4", fg: "#FFFFFF" },
      },
    ],
  },
];
