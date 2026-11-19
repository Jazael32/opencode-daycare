import { getStoredKids } from "@/app/lib/kid-storage";
import { kids as mockKids } from "@/app/lib/mock-kids";
import type { Badge, FeedPost } from "@/app/lib/mock-feed";

// Versioned key so a future schema change can migrate without breaking.
const STORAGE_KEY = "od-posts:v1";

// Window event dispatched after each save so the feed can re-read storage.
export const POSTS_UPDATED_EVENT = "od-posts-updated";

export interface StoredPost {
  id: string; // "post-1731920000000" — Date.now()
  recipient: string; // "mateo-fernandez" (kidSlug) | "room" (whole room)
  badge: Badge; // one of Badge (mock-feed.ts)
  body: string; // trimmed, non-empty
  createdAt: string; // ISO — orders the feed
}

export interface NewPostDraft {
  recipient: string; // "" when nothing is selected
  badge: Badge | null; // null when nothing is selected
  body: string; // not trimmed yet
}

// Cached storage snapshot: keeps object identity stable between reads so it
// can back useSyncExternalStore without re-parsing on every call.
let snapshotRaw: string | null | undefined; // undefined = never read
let snapshotPosts: StoredPost[] = [];

function readStorageSnapshot(): StoredPost[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === snapshotRaw) {
    return snapshotPosts;
  }

  let parsed: StoredPost[] = [];
  try {
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        parsed = (data as StoredPost[]).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      }
    }
  } catch {
    parsed = [];
  }

  snapshotRaw = raw;
  snapshotPosts = parsed;
  return snapshotPosts;
}

// Read the stored posts; [] when unavailable (SSR, disabled storage, bad data).
export function getStoredPosts(): StoredPost[] {
  return readStorageSnapshot();
}

export function notifyPostsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(POSTS_UPDATED_EVENT));
  }
}

// Subscribe the caller to post changes (saves in this tab and in others).
export function subscribeToPosts(callback: () => void): () => void {
  window.addEventListener(POSTS_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(POSTS_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// Persist a new post and notify the feed. The modal validates before calling,
// but this guards against bad data too.
export function saveNewPost(draft: NewPostDraft): StoredPost {
  const body = draft.body.trim();
  if (!draft.recipient) {
    throw new Error("Post recipient is required");
  }
  if (!draft.badge) {
    throw new Error("Post type is required");
  }
  if (!body) {
    throw new Error("Post body is required");
  }

  const post: StoredPost = {
    id: `post-${Date.now()}`,
    recipient: draft.recipient,
    badge: draft.badge,
    body,
    createdAt: new Date().toISOString(),
  };

  const stored = getStoredPosts();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...stored, post]));
  } catch {
    // Persistence is best-effort: still return the post so the UI can show it.
  }
  notifyPostsUpdated();
  return post;
}

// "14:20" — local 24-hour time of publication.
function formatPostTime(createdAt: string): string {
  const date = new Date(createdAt);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Resolve a stored post into the shape the feed renders; null when the
// recipient slug no longer exists.
export function toFeedPost(post: StoredPost): FeedPost | null {
  const base = {
    id: post.id,
    time: formatPostTime(post.createdAt),
    publishedBy: "publicado por vos",
    badge: post.badge,
    body: post.body,
    likes: 0,
    comments: 0,
  };

  if (post.recipient === "room") {
    return {
      ...base,
      author: "Anuncio general",
      initial: "A",
      audience: "Para: toda la sala",
    };
  }

  const kid =
    mockKids.find((candidate) => candidate.slug === post.recipient) ??
    getStoredKids().find((candidate) => candidate.slug === post.recipient);
  if (!kid) {
    return null;
  }

  const firstName = kid.name.split(" ")[0];
  return {
    ...base,
    author: firstName,
    initial: kid.initial,
    audience: `Para: familia de ${firstName}`,
    avatarColors: kid.avatarColors,
  };
}
