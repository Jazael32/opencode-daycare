import { Suspense } from "react";
import { AddKidButton } from "@/app/components/add-kid-button";
import { BottomNav } from "@/app/components/bottom-nav";
import { KidsGrid } from "@/app/components/kids-grid";
import { Sidebar } from "@/app/components/sidebar";
import { kids } from "@/app/lib/mock-kids";

// Stable placeholder for the prerendered shell; the real grid (which reads the
// current date to show each kid's age) streams in behind this boundary.
function KidsGridSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
      {Array.from({ length: kids.length }, (_, index) => (
        <div
          key={index}
          className="h-[80px] rounded-[18px] border border-border bg-surface p-4"
        />
      ))}
    </div>
  );
}

export default function KidsPage() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar active="kids" />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[880px] px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-[34px] lg:pb-20">
          {/* Header */}
          <div className="mb-[22px] flex items-end justify-between gap-4">
            <div>
              <div className="mb-1 text-[12.5px] font-extrabold tracking-[0.8px] text-brand">
                GESTIÓN
              </div>
              <h1 className="m-0 font-heading text-[30px] font-semibold text-ink">Niños</h1>
            </div>
            <AddKidButton />
          </div>

          {/* Search box, dynamic room separators, cards */}
          <Suspense fallback={<KidsGridSkeleton />}>
            <KidsGrid kids={kids} />
          </Suspense>
        </div>
      </main>

      <BottomNav active="kids" />
    </div>
  );
}
