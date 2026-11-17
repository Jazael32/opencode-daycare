import { Suspense } from "react";
import Link from "next/link";
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
            <Link
              href="/"
              className="flex flex-none items-center gap-2 rounded-[14px] px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,0.7)]"
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
              Agregar niño
            </Link>
          </div>

          {/* Search box, room separator, cards */}
          <Suspense fallback={<KidsGridSkeleton />}>
            <KidsGrid kids={kids}>
              <div className="mb-[14px] flex items-center gap-3">
                <span className="text-[12.5px] font-extrabold tracking-[0.8px] text-ink">
                  SALA SOLES
                </span>
                <span className="text-[13px] text-muted">{kids.length} niños</span>
                <span className="h-px flex-1 bg-separator" />
              </div>
            </KidsGrid>
          </Suspense>
        </div>
      </main>

      <BottomNav active="kids" />
    </div>
  );
}
