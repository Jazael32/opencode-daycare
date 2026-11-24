import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav } from "@/app/components/bottom-nav";
import { Sidebar } from "@/app/components/sidebar";
import { KidProfile } from "@/app/components/kid-profile";
import { ProfileSkeleton } from "@/app/components/kid-profile-view";
import { StoredKidProfile } from "@/app/components/stored-kid-profile";
import { getCurrentUserProfile } from "@/app/lib/auth";
import { getKidBySlug, kids } from "@/app/lib/mock-kids";

// The known slugs prerender as static pages; unknown ones render on demand
// and stream the client lookup, which redirects to /kids when the slug is
// neither mock nor stored (never a 404).
export function generateStaticParams() {
  return kids.map((kid) => ({ slug: kid.slug }));
}

// This route reads the slug before rendering, so it opts out of instant
// validation. Redirecting inside a Suspense boundary would fail mid-stream.
export const instant = false;

export default async function KidProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Hybrid lookup: mock kids render on the server; kids saved in localStorage
  // fall back to the client component below.
  const kid = getKidBySlug(slug);

  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar active="kids" user={user} />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[820px] px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-[34px] lg:pb-20">
          {/* Back link */}
          <Link
            href="/kids"
            className="mb-5 flex items-center gap-[7px] text-[14px] font-bold text-[#94887B]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Volver a Niños
          </Link>

          <Suspense fallback={<ProfileSkeleton />}>
            {kid ? <KidProfile kid={kid} /> : <StoredKidProfile slug={slug} />}
          </Suspense>
        </div>
      </main>

      <BottomNav active="kids" />
    </div>
  );
}
