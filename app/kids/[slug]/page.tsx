import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/app/components/bottom-nav";
import { Sidebar } from "@/app/components/sidebar";
import {
  formatBirthDate,
  getAge,
  getKidBySlug,
  kids,
  parentStatusColors,
  parentStatusLabels,
  type Kid,
} from "@/app/lib/mock-kids";

// The known slugs prerender as static pages; unknown ones render on demand
// and hit the redirect inside KidProfile.
export function generateStaticParams() {
  return kids.map((kid) => ({ slug: kid.slug }));
}

// "3 años · Sala Soles" — the age is computed per visit, so this fragment
// renders at request time behind the Suspense boundary in the page.
async function KidAge({ kid }: { kid: Kid }) {
  await connection();
  return <>{getAge(kid.birthDate)} años · Sala {kid.room}</>;
}

// The profile body lives behind a Suspense boundary so the shared shell stays
// reusable across kid links and this part streams in.
function KidProfile({ kid }: { kid: Kid }) {
  return (
    <div className="flex flex-wrap items-start gap-[26px]">
      {/* Left column: header, allergy box, data card */}
      <div className="flex min-w-[300px] flex-1 flex-col gap-[18px]">
        <div className="flex items-center gap-[18px]">
          <span
            className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-full font-heading text-[34px] font-semibold"
            style={{ background: kid.avatarColors.bg, color: kid.avatarColors.fg }}
          >
            {kid.initial}
          </span>
          <span className="min-w-0 flex-1">
            <h1 className="m-0 font-heading text-[28px] font-semibold text-ink">
              {kid.name}
            </h1>
            <p className="mt-[3px] mb-0 text-[15px] text-[#94887B]">
              <Suspense fallback="…">
                <KidAge kid={kid} />
              </Suspense>
            </p>
          </span>
          <Link
            href="/"
            className="flex-none rounded-xl border-[1.5px] border-border bg-surface px-4 py-[9px] text-[14px] font-bold text-[#6E6359]"
          >
            Editar
          </Link>
        </div>

        {kid.allergy && (
          <div className="flex gap-[14px] rounded-2xl bg-[#FBDAD6] px-[18px] py-4">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-[#F4A8A0]">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
            </span>
            <span>
              <span className="mb-[2px] block text-[15px] font-extrabold text-[#C5413A]">
                Alergias y notas
              </span>
              <span className="block text-[14.5px] leading-[1.5] text-[#B25249]">
                {kid.allergy.notes}
              </span>
            </span>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex justify-between border-b border-divider px-[18px] py-[15px]">
            <span className="text-[14.5px] text-[#94887B]">Fecha de nacimiento</span>
            <span className="text-[14.5px] font-extrabold text-ink">
              {formatBirthDate(kid.birthDate)}
            </span>
          </div>
          <div className="flex justify-between border-b border-divider px-[18px] py-[15px]">
            <span className="text-[14.5px] text-[#94887B]">Sala</span>
            <span className="text-[14.5px] font-extrabold text-ink">{kid.room}</span>
          </div>
          <div className="flex justify-between px-[18px] py-[15px]">
            <span className="text-[14.5px] text-[#94887B]">Ingreso</span>
            <span className="text-[14.5px] font-extrabold text-ink">{kid.enrolled}</span>
          </div>
        </div>
      </div>

      {/* Right column: day summary and linked parents */}
      <div className="flex w-[300px] flex-none flex-col gap-[14px]">
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-[9px] rounded-[14px] bg-[#3F362E] py-[13px] text-[15px] font-extrabold text-white"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          Resumen del día
        </Link>

        <div className="rounded-2xl border border-border bg-surface px-[18px] py-4">
          <div className="mb-[14px] text-[12.5px] font-extrabold tracking-[0.8px] text-[#8A7C6D]">
            PADRES VINCULADOS
          </div>
          <div className="flex flex-col gap-[14px]">
            {kid.parents.map((parent) => (
              <div key={parent.name} className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-full font-heading text-[16px] font-semibold"
                  style={{ background: parent.avatarColors.bg, color: parent.avatarColors.fg }}
                >
                  {parent.initial}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-extrabold text-ink">
                    {parent.name}
                  </span>
                  <span className="block text-[12.5px] text-muted">
                    {parent.relation} · {parentStatusLabels[parent.status]}
                  </span>
                </span>
                <span
                  className="flex-none rounded-full px-[9px] py-[4px] text-[10.5px] font-extrabold"
                  style={{
                    background: parentStatusColors[parent.status].background,
                    color: parentStatusColors[parent.status].text,
                  }}
                >
                  {parent.status === "active" ? "ACTIVA" : "PENDIENTE"}
                </span>
              </div>
            ))}
            <Link href="/" className="flex items-center gap-3 pt-2">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#D8CBBA] text-[#B0A290]">
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
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="text-[14.5px] font-extrabold text-[#C5503A]">
                Vincular otro padre
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stable placeholder approximating the profile layout, shipped in the shell.
function ProfileSkeleton() {
  return (
    <div aria-hidden className="flex flex-wrap items-start gap-[26px]">
      <div className="flex min-w-[300px] flex-1 flex-col gap-[18px]">
        <div className="flex items-center gap-[18px]">
          <div className="h-[84px] w-[84px] flex-none rounded-full bg-surface" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-40 rounded bg-surface" />
            <div className="h-4 w-32 rounded bg-surface" />
          </div>
        </div>
        <div className="h-[150px] rounded-2xl border border-border bg-surface" />
      </div>
      <div className="flex w-[300px] flex-none flex-col gap-[14px]">
        <div className="h-[47px] rounded-[14px] bg-surface" />
        <div className="h-[180px] rounded-2xl border border-border bg-surface" />
      </div>
    </div>
  );
}

// This route reads the slug before rendering, so it opts out of instant
// validation: unknown slugs redirect to /kids before any streaming starts
// (never a 404). Redirecting inside a Suspense boundary would fail mid-stream.
export const instant = false;

export default async function KidProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const kid = getKidBySlug(slug);
  if (!kid) {
    redirect("/kids");
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar active="kids" />

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
            <KidProfile kid={kid} />
          </Suspense>
        </div>
      </main>

      <BottomNav active="kids" />
    </div>
  );
}
