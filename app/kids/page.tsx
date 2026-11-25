import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AddKidButton } from "@/app/components/kids/add-kid-button";
import { BottomNav } from "@/app/components/navigation/bottom-nav";
import { KidsGrid } from "@/app/components/kids/kids-grid";
import { Sidebar } from "@/app/components/navigation/sidebar";
import { getCurrentUserProfile } from "@/app/lib/auth";
import type { ChildRow, RoomRow } from "@/app/lib/kids-db";
import { createClient } from "@/utils/supabase/server";

// The profile and the kids list need request cookies, so the page blocks on
// the server.
export const instant = false;

export default async function KidsPage() {
  // The page is request-bound from the very top: reading the session
  // (supabase.auth.getClaims checks JWT expiry against the clock) and the
  // child ages must never run during prerendering.
  await connection();

  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: rooms }, { data: children }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name")
      .order("created_at", { ascending: true })
      .overrideTypes<RoomRow[], { merge: false }>(),
    supabase
      .from("children")
      .select("id, room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags")
      .order("created_at", { ascending: true })
      .overrideTypes<ChildRow[], { merge: false }>(),
  ]);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar active="kids" user={user} />

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
            <AddKidButton rooms={rooms ?? []} />
          </div>

          {/* Search box, room separators, cards */}
          <KidsGrid rooms={rooms ?? []} kids={children ?? []} />
        </div>
      </main>

      <BottomNav active="kids" />
    </div>
  );
}
