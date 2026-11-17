import Link from "next/link";
import { badgeColors, badgeLabels, type FeedPost } from "@/app/lib/mock-feed";

function MegaphoneAvatar() {
  return (
    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-badge-announcement text-badge-announcement-ink">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </svg>
    </span>
  );
}

export function PostCard({ post }: { post: FeedPost }) {
  const colors = badgeColors[post.badge];

  return (
    <article className="rounded-[20px] border border-border bg-surface px-[22px] py-5 shadow-[0_4px_16px_-12px_rgba(120,90,60,0.5)]">
      {/* Header */}
      <div className="mb-3.5 flex items-center gap-3">
        {post.badge === "announcement" ? (
          <MegaphoneAvatar />
        ) : (
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-avatar-sky font-heading text-[17px] font-semibold text-avatar-sky-ink">
            {post.initial}
          </span>
        )}
        <div className="flex-1">
          <div className="font-heading text-[16.5px] font-semibold text-ink">{post.author}</div>
          <div className="text-[12.5px] text-muted">
            {post.time} · {post.publishedBy}
          </div>
        </div>
        <div
          className="flex items-center gap-[7px] rounded-full px-3 py-1.5"
          style={{ background: colors.background }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: colors.text }} />
          <span
            className="text-[12px] font-extrabold tracking-[0.5px]"
            style={{ color: colors.text }}
          >
            {badgeLabels[post.badge]}
          </span>
        </div>
      </div>

      {/* Audience */}
      <div className="mb-2.5 text-[12.5px] text-muted">{post.audience}</div>

      {/* Body */}
      <p className="m-0 text-[15.5px] leading-[1.55] text-[#4A4038]">{post.body}</p>

      {/* Photo placeholder (activity with photo) */}
      {post.photoCaption ? (
        <Link
          href="/"
          className="mt-3.5 flex h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-photo-border bg-photo-bg text-photo-ink"
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21" />
          </svg>
          <span className="text-[13.5px]">{post.photoCaption}</span>
        </Link>
      ) : null}

      {/* Footer */}
      <div className="mt-4 flex items-center gap-[18px] border-t border-divider pt-[14px]">
        <span className="flex items-center gap-[7px] text-[14px] font-bold text-accent">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
          {post.likes}
        </span>
        <Link href="/" className="flex items-center gap-[7px] text-[14px] font-bold text-[#94887B]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
          </svg>
          {post.comments}
        </Link>
        <span className="flex-1" />
        <Link href="/" className="text-[14px] font-extrabold text-brand-strong">
          Editar
        </Link>
      </div>
    </article>
  );
}
