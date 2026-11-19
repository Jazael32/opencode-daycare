"use client";

import { useState } from "react";
import { NewPostModal } from "@/app/components/new-post-modal";
import { user } from "@/app/lib/mock-feed";
import { saveNewPost, type NewPostDraft } from "@/app/lib/post-storage";

// Triggers the new-post modal from the sidebar or from the home composer.
// Saving notifies the feed through saveNewPost and closes the modal.
export function NewPostButton({ variant }: { variant: "sidebar" | "composer" }) {
  const [open, setOpen] = useState(false);

  function handlePublish(draft: NewPostDraft) {
    saveNewPost(draft);
    setOpen(false);
  }

  return (
    <>
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mb-[18px] flex w-full items-center justify-center gap-2 rounded-[14px] px-3 py-3 text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,0.75)]"
          style={{ background: "linear-gradient(180deg, #F4977E, #EE8164)" }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva publicación
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mb-6 flex w-full items-center gap-[14px] rounded-[18px] border border-border bg-surface px-[18px] py-[14px] text-left shadow-[0_4px_14px_-10px_rgba(120,90,60,0.4)]"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-avatar font-heading text-[16px] font-semibold text-white">
            {user.initial}
          </span>
          <span className="flex-1 text-[15px] text-muted">Compartí un momento…</span>
          <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl bg-brand-soft text-accent">
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
        </button>
      )}

      {open && (
        <NewPostModal onClose={() => setOpen(false)} onPublish={handlePublish} />
      )}
    </>
  );
}
