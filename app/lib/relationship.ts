// Relationship types shared by the link-parent modal, the invitation email
// and the linked-parents card. Mirrors the DB enum `relationship_type`.
export const RELATIONSHIP_VALUES = ["mother", "father", "guardian"] as const;

export type Relationship = (typeof RELATIONSHIP_VALUES)[number];

/** UI labels, in the order the modal shows the pills. */
export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  mother: "Mamá",
  father: "Papá",
  guardian: "Tutor/a",
};

export const RELATIONSHIP_OPTIONS = RELATIONSHIP_VALUES.map((value) => ({
  value,
  label: RELATIONSHIP_LABELS[value],
}));

const isRelationship = (value: string): value is Relationship =>
  (RELATIONSHIP_VALUES as readonly string[]).includes(value);

/** Safe parse of a DB enum value; falls back to the generic label. */
export function relationshipLabel(value: string): string {
  return isRelationship(value) ? RELATIONSHIP_LABELS[value] : "Tutor/a";
}
