import { Resend } from "resend";

/**
 * Resend client for Server Actions only. `RESEND_API_KEY` is a secret and
 * must never be exposed to the client bundle (no NEXT_PUBLIC_ prefix).
 *
 * Returns `null` when the key is not configured so callers can fall back to
 * sharing the invitation code manually instead of failing the whole flow.
 */
let client: Resend | null = null;

export const getResendClient = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  client ??= new Resend(apiKey);
  return client;
};
