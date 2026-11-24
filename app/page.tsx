import { redirect } from "next/navigation";
import { BottomNav } from "@/app/components/bottom-nav";
import { FeedList } from "@/app/components/feed-list";
import { NewPostButton } from "@/app/components/new-post-button";
import { Sidebar } from "@/app/components/sidebar";
import { getCurrentUserProfile } from "@/app/lib/auth";

// Reading the profile needs request cookies, so the page blocks on the server
// instead of prerendering a static shell without identity.
export const instant = false;

export default async function HomePage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  const firstName = profile.fullName.trim().split(/\s+/)[0];

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar user={profile} />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[760px] px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-[34px] lg:pb-20">
          {/* Header */}
          <div className="mb-6">
            <div className="mb-1 text-[12.5px] font-extrabold tracking-[0.8px] text-brand uppercase">
              {profile.daycareName}
            </div>
            <h1 className="m-0 font-heading text-[30px] font-semibold text-ink">
              Buenas, {firstName}
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
