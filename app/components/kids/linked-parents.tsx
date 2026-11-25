"use client";

import { useState } from "react";

import { LinkParentModal } from "@/app/components/kids/link-parent-modal";
import { AVATAR_PALETTE } from "@/app/lib/mock-kids";
import { relationshipLabel } from "@/app/lib/relationship";

// One row of the PADRES VINCULADOS card, computed on the server from
// `invitations` and accepted `parent_children` rows.
export type LinkedParentRow = {
  key: string;
  name: string;
  relationship: string; // DB enum relationship_type as text
  status: "pending" | "accepted" | "expired";
};

function ParentRow({ row, index }: { row: LinkedParentRow; index: number }) {
  const colors = AVATAR_PALETTE[index % AVATAR_PALETTE.length];

  const pill = {
    pending: { label: "PENDIENTE", background: "#FBF1D6", color: "#A88526" },
    accepted: { label: "ACTIVA", background: "#CFEBD8", color: "#3E9B6C" },
    expired: { label: "VENCIDA", background: "#FBDAD6", color: "#C5413A" },
  }[row.status];

  const subtitle =
    row.status === "pending"
      ? `${relationshipLabel(row.relationship)} · invitación enviada`
      : relationshipLabel(row.relationship);

  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full font-heading text-[16px] font-semibold"
        style={{ background: colors.bg, color: colors.fg }}
      >
        {row.name.charAt(0).toLocaleUpperCase("es")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-extrabold text-ink">{row.name}</span>
        <span className="block text-[12.5px] text-muted">{subtitle}</span>
      </span>
      <span
        className="flex-none rounded-full px-[9px] py-[4px] text-[10.5px] font-extrabold"
        style={{ background: pill.background, color: pill.color }}
      >
        {pill.label}
      </span>
    </div>
  );
}

// Linked parents card fed by the database, with the button that opens the
// "Vincular padre" modal. After a successful save the Server Action
// revalidates the profile path, so new rows show up without a manual reload.
export function LinkedParents({
  childId,
  childName,
  rows,
}: {
  childId: string;
  childName: string;
  rows: LinkedParentRow[];
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-border bg-surface px-[18px] py-4">
        <div className="mb-[14px] text-[12.5px] font-extrabold tracking-[0.8px] text-[#8A7C6D]">
          PADRES VINCULADOS
        </div>
        <div className="flex flex-col gap-[14px]">
          {rows.map((row, index) => (
            <ParentRow key={row.key} row={row} index={index} />
          ))}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-3 pt-2"
          >
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
          </button>
        </div>
      </div>

      {modalOpen && (
        <LinkParentModal
          childId={childId}
          childName={childName}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
