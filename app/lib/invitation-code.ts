// Invitation codes: 5 chars from an alphabet without ambiguous glyphs
// (no 0/O/1/I), always uppercase. Shared by the server (code generation in
// app/kids/actions.ts) and any client-side validation.
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 5;

export const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

/** Uppercases, trims and strips characters outside the code alphabet. */
export function normalizeCode(input: string): string {
  return input
    .trim()
    .toLocaleUpperCase("es")
    .split("")
    .filter((character) => CODE_ALPHABET.includes(character))
    .join("");
}
