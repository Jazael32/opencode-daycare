export type Badge =
  | "achievement"
  | "activity"
  | "announcement"
  | "comida"
  | "siesta"
  | "animo"
  | "foto";

// Spanish labels for display; the UI renders these, never the raw value.
export const badgeLabels: Record<Badge, string> = {
  achievement: "LOGRO",
  activity: "ACTIVIDAD",
  announcement: "ANUNCIO",
  comida: "COMIDA",
  siesta: "SIESTA",
  animo: "ÁNIMO",
  foto: "FOTO",
};

// Pill colors per badge, taken from the mockup: background / text.
export const badgeColors: Record<Badge, { background: string; text: string }> = {
  achievement: { background: "#CFEBD8", text: "#3E9B6C" },
  activity: { background: "#C7E7F1", text: "#2E89A6" },
  announcement: { background: "#CCD8F4", text: "#4E72C8" },
  comida: { background: "#F7E7A6", text: "#9A7B1E" },
  siesta: { background: "#E7DCF6", text: "#7B5FC0" },
  animo: { background: "#F9D2DE", text: "#C56486" },
  foto: { background: "#FBD8CC", text: "#D9684A" },
};

export interface FeedPost {
  id: string;
  author: string; // "Mateo" | "Anuncio general"
  initial: string; // "M" — circular avatar with a letter
  time: string; // "14:20" | "09:40" | "07:50"
  publishedBy: string; // "publicado por vos"
  badge: Badge;
  audience: string; // "Para: familia de Mateo" | "Para: toda la sala"
  body: string;
  photoCaption?: string; // "Foto · pintando con témperas" (activity only)
  avatarColors?: { bg: string; fg: string }; // kid avatar; without it, bg-avatar-sky
  likes: number; // 3 | 5 | 8
  comments: number; // 1 | 2 | 0
}

export const user = {
  name: "Caro Giménez",
  initial: "C",
  role: "Maestra · Soles",
};

export const feedPosts: FeedPost[] = [
  {
    id: "post-logro",
    author: "Mateo",
    initial: "M",
    time: "14:20",
    publishedBy: "publicado por vos",
    badge: "achievement",
    audience: "Para: familia de Mateo",
    body: "¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.",
    likes: 3,
    comments: 1,
  },
  {
    id: "post-actividad",
    author: "Mateo",
    initial: "M",
    time: "09:40",
    publishedBy: "publicado por vos",
    badge: "activity",
    audience: "Para: familia de Mateo",
    body: "Pintamos con témperas esta mañana. Mateo eligió el azul para todo y se concentró un montón mezclando colores.",
    photoCaption: "Foto · pintando con témperas",
    likes: 5,
    comments: 2,
  },
  {
    id: "post-anuncio",
    author: "Anuncio general",
    initial: "A",
    time: "07:50",
    publishedBy: "publicado por vos",
    badge: "announcement",
    audience: "Para: toda la sala",
    body: "El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.",
    likes: 8,
    comments: 0,
  },
];
