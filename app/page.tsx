import Link from "next/link";
import { BottomNav } from "@/app/components/bottom-nav";
import { PostCard } from "@/app/components/post-card";
import { Sidebar } from "@/app/components/sidebar";
import { feedPosts, user } from "@/app/lib/mock-feed";

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[760px] px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-[34px] lg:pb-20">
          {/* Header */}
          <div className="mb-6">
            <div className="mb-1 text-[12.5px] font-extrabold tracking-[0.8px] text-brand">
              GUARDERÍA · SALA SOLES
            </div>
            <h1 className="m-0 font-heading text-[30px] font-semibold text-ink">
              Buenas, {user.name.split(" ")[0]}
            </h1>
            <p className="mt-[5px] mb-0 text-[14.5px] text-[#94887B]">12 niños · martes 17 jun</p>
          </div>

          {/* Composer */}
          <Link
            href="/"
            className="mb-6 flex items-center gap-[14px] rounded-[18px] border border-border bg-surface px-[18px] py-[14px] shadow-[0_4px_14px_-10px_rgba(120,90,60,0.4)]"
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
          </Link>

          {/* Separator */}
          <div className="mb-[14px] flex items-center gap-[14px]">
            <span className="text-[12.5px] font-extrabold tracking-[0.8px] text-[#8A7C6D]">
              PUBLICADO HOY
            </span>
            <span className="h-px flex-1 bg-separator" />
          </div>

          {/* Posts */}
          <div className="flex flex-col gap-4">
            {feedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
