import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/app/components/navigation/bottom-nav";
import { Sidebar } from "@/app/components/navigation/sidebar";
import { KidProfileView } from "@/app/components/kids/kid-profile-view";
import { LinkedParents, type LinkedParentRow } from "@/app/components/kids/linked-parents";
import { getCurrentUserProfile } from "@/app/lib/auth";
import {
  avatarColorsForId,
  formatEnrolledDate,
  type ChildProfileRow,
} from "@/app/lib/kids-db";
import { formatBirthDate, getAge } from "@/app/lib/mock-kids";
import { createClient } from "@/utils/supabase/server";

// The profile read needs request cookies, so the page blocks on the server.
export const instant = false;

type InvitationRow = {
  id: string;
  full_name: string;
  relationship: string;
  status: string;
};

type ParentChildRow = {
  id: string;
  relationship: string;
  users: { full_name: string } | null;
};

function buildLinkedParentRows(
  invitations: InvitationRow[],
  links: ParentChildRow[],
): LinkedParentRow[] {
  // ACTIVA first (accepted links), then PENDIENTE, then VENCIDA.
  const active = links.map((link) => ({
    key: `link-${link.id}`,
    name: link.users?.full_name ?? "",
    relationship: link.relationship,
    status: "accepted" as const,
  }));

  const pending = invitations
    .filter((invitation) => invitation.status === "pending")
    .map((invitation) => ({
      key: `inv-${invitation.id}`,
      name: invitation.full_name,
      relationship: invitation.relationship,
      status: "pending" as const,
    }));

  const expired = invitations
    .filter((invitation) => invitation.status === "expired")
    .map((invitation) => ({
      key: `inv-${invitation.id}`,
      name: invitation.full_name,
      relationship: invitation.relationship,
      status: "expired" as const,
    }));

  return [...active, ...pending, ...expired];
}

export default async function KidProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // The page is request-bound from the very top: reading the session
  // (supabase.auth.getClaims checks JWT expiry against the clock) and the
  // age must never run during prerendering.
  await connection();

  const user = await getCurrentUserProfile();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // RLS returns nothing when the id is unknown or belongs to another daycare.
  const { data: child } = await supabase
    .from("children")
    .select("id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, rooms(name)")
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<ChildProfileRow, { merge: false }>();

  if (!child) {
    redirect("/kids");
  }

  // Invitations of this child (staff sees them via RLS). Accepted ones are
  // rendered from parent_children instead, so only pending/expired matter.
  const [{ data: invitations }, { data: links }] = await Promise.all([
    supabase
      .from("invitations")
      .select("id, full_name, relationship, status")
      .eq("child_id", id)
      .in("status", ["pending", "expired"])
      .overrideTypes<InvitationRow[], { merge: false }>(),
    supabase
      .from("parent_children")
      .select("id, relationship, users(full_name)")
      .eq("child_id", id)
      .overrideTypes<ParentChildRow[], { merge: false }>(),
  ]);

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

          <KidProfileView
            kid={{
              name: child.full_name,
              initial: child.full_name.charAt(0).toLocaleUpperCase("es"),
              avatarColors: avatarColorsForId(child.id),
              age: getAge(child.birth_date),
              roomName: child.rooms?.name ?? "",
              birthDateLabel: formatBirthDate(child.birth_date),
              enrolledLabel: formatEnrolledDate(child.enrolled_at),
              allergyTags: child.allergy_tags,
              medicalNotes: child.medical_notes,
            }}
            linkedParents={
              <LinkedParents
                childId={child.id}
                childName={child.full_name}
                rows={buildLinkedParentRows(invitations ?? [], links ?? [])}
              />
            }
          />
        </div>
      </main>

      <BottomNav active="kids" />
    </div>
  );
}
