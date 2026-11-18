// Parent invitations, kept in localStorage so a mock kid (defined in code) and
// a stored kid (od-kids:v1) share the same persistence, keyed by kidSlug.
const STORAGE_KEY = "od-parent-links:v1";

// 7 days, counted from the moment the invitation is created.
const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// 5 chars from an alphabet without ambiguous glyphs (no 0/O/1/I).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;

export const RELATIONS = ["Mamá", "Papá", "Tutor/a"] as const;
export type Relation = (typeof RELATIONS)[number];

export type ParentLinkStatus = "pending" | "active";

export interface ParentLink {
  kidSlug: string; // "mateo-fernandez" — mock or stored kid
  name: string; // "Diego Fernández" — trimmed, never empty
  email: string; // lowercase, trimmed
  relation: Relation; // one of RELATIONS
  code: string; // "7K4P9" — unique among pending, unexpired links
  createdAt: string; // ISO — expires at createdAt + 7 days
  status: ParentLinkStatus;
}

// Raw modal fields; date and status are derived by saveParentLink. The modal
// shows a code before saving, so it can pass that code back to keep them equal.
export interface NewParentLinkDraft {
  name: string;
  email: string;
  relation: Relation;
  code?: string;
}

// Window event dispatched after each save or activation.
export const PARENT_LINKS_UPDATED_EVENT = "od-parent-links-updated";

export function notifyParentLinksUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PARENT_LINKS_UPDATED_EVENT));
  }
}

// Cached storage snapshot: keeps object identity stable between reads so it
// can back useSyncExternalStore without re-parsing on every call.
let snapshotRaw: string | null | undefined; // undefined = never read
let snapshotLinks: ParentLink[] = [];
const linksByKid = new Map<string, ParentLink[]>();

function readStorageSnapshot(): ParentLink[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === snapshotRaw) {
    return snapshotLinks;
  }

  let parsed: ParentLink[] = [];
  try {
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        parsed = data as ParentLink[];
      }
    }
  } catch {
    parsed = [];
  }

  snapshotRaw = raw;
  snapshotLinks = parsed;
  linksByKid.clear();
  return snapshotLinks;
}

// Read the invitations of one kid; [] when unavailable (SSR, disabled storage,
// bad data). The filtered array is cached per slug for useSyncExternalStore.
export function getParentLinks(kidSlug: string): ParentLink[] {
  readStorageSnapshot();

  let filtered = linksByKid.get(kidSlug);
  if (!filtered) {
    filtered = snapshotLinks.filter((link) => link.kidSlug === kidSlug);
    linksByKid.set(kidSlug, filtered);
  }
  return filtered;
}

// Subscribe the caller to invitation changes (saves in this tab and in others).
export function subscribeToParentLinks(callback: () => void): () => void {
  window.addEventListener(PARENT_LINKS_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PARENT_LINKS_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase("es");
}

function normalizeCode(code: string): string {
  return code.trim().toLocaleUpperCase("es");
}

// True when the invitation is past createdAt + 7 days. A corrupt date counts
// as expired so bad records never unlock an activation.
function isExpired(link: ParentLink, now: number): boolean {
  const createdAt = Date.parse(link.createdAt);
  if (Number.isNaN(createdAt)) {
    return true;
  }
  return now >= createdAt + LINK_TTL_MS;
}

function isPendingAndValid(link: ParentLink, now: number): boolean {
  return link.status === "pending" && !isExpired(link, now);
}

function randomCode(): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

// Pending codes must stay distinguishable because /activar-cuenta follows the
// typed code, so retry until the new one does not collide.
function generateUniqueCode(links: ParentLink[], now: number): string {
  const taken = new Set(
    links.filter((link) => isPendingAndValid(link, now)).map((link) => link.code),
  );

  let code = randomCode();
  while (taken.has(code)) {
    code = randomCode();
  }
  return code;
}

// Code shown in the modal; saveParentLink persists it unless it collided in
// the meantime (then it generates a fresh one).
export function generateParentLinkCode(): string {
  return generateUniqueCode(readStorageSnapshot(), Date.now());
}

function writeLinks(links: ParentLink[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch {
    // Persistence is best-effort: still return the link so the UI can react.
  }
}

// Validate, derive the code/date/status, persist and return the invitation.
// The modal validates before calling, but this guards against bad data too.
export function saveParentLink(kidSlug: string, draft: NewParentLinkDraft): ParentLink {
  const name = draft.name.trim();
  if (!name) {
    throw new Error("Parent name is required");
  }

  const email = normalizeEmail(draft.email);
  if (!email) {
    throw new Error("Parent email is required");
  }

  if (!(RELATIONS as readonly string[]).includes(draft.relation)) {
    throw new Error("Parent relation is invalid");
  }

  const links = readStorageSnapshot();
  const alreadyLinked = links.some(
    (link) => link.kidSlug === kidSlug && link.email === email,
  );
  if (alreadyLinked) {
    throw new Error("Parent email is already linked to this kid");
  }

  const now = Date.now();
  const takenCodes = new Set(
    links.filter((link) => isPendingAndValid(link, now)).map((link) => link.code),
  );
  const requestedCode = draft.code ? normalizeCode(draft.code) : "";
  const requestedCodeIsValid =
    requestedCode.length === CODE_LENGTH &&
    [...requestedCode].every((character) => CODE_ALPHABET.includes(character)) &&
    !takenCodes.has(requestedCode);

  const link: ParentLink = {
    kidSlug,
    name,
    email,
    relation: draft.relation,
    code: requestedCodeIsValid ? requestedCode : generateUniqueCode(links, now),
    createdAt: new Date(now).toISOString(),
    status: "pending",
  };

  writeLinks([...links, link]);
  notifyParentLinksUpdated();
  return link;
}

// Pending, unexpired invitation matching the typed code (case/space tolerant).
export function findPendingByCode(code: string): ParentLink | undefined {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return undefined;
  }

  const now = Date.now();
  return readStorageSnapshot().find(
    (link) => isPendingAndValid(link, now) && link.code === normalized,
  );
}

// Consume a pending invitation when code and email belong together and the
// code has not expired. Returns the activated link, or null when it does not
// match (wrong code, wrong email, expired or already consumed).
export function activateParentLink(code: string, email: string): ParentLink | null {
  const normalizedCode = normalizeCode(code);
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedCode || !normalizedEmail) {
    return null;
  }

  const links = readStorageSnapshot();
  const now = Date.now();
  const index = links.findIndex(
    (link) =>
      isPendingAndValid(link, now) &&
      link.code === normalizedCode &&
      link.email === normalizedEmail,
  );
  if (index === -1) {
    return null;
  }

  const activated: ParentLink = { ...links[index], status: "active" };
  const nextLinks = links.map((link, position) =>
    position === index ? activated : link,
  );

  writeLinks(nextLinks);
  notifyParentLinksUpdated();
  return activated;
}
