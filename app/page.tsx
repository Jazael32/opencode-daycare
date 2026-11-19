import { BottomNav } from "@/app/components/bottom-nav";
import { FeedList } from "@/app/components/feed-list";
import { NewPostButton } from "@/app/components/new-post-button";
import { Sidebar } from "@/app/components/sidebar";
import { user } from "@/app/lib/mock-feed";

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
          <NewPostButton variant="composer" />

          {/* Separator */}
          <div className="mb-[14px] flex items-center gap-[14px]">
            <span className="text-[12.5px] font-extrabold tracking-[0.8px] text-[#8A7C6D]">
              PUBLICADO HOY
            </span>
            <span className="h-px flex-1 bg-separator" />
          </div>

          {/* Posts */}
          <FeedList />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
