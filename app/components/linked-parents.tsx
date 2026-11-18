"use client";

import { useState, useSyncExternalStore } from "react";
import {
  AVATAR_PALETTE,
  parentStatusColors,
  parentStatusLabels,
  type Kid,
  type Parent,
} from "@/app/lib/mock-kids";
import {
  getParentLinks,
  subscribeToParentLinks,
  type ParentLink,
} from "@/app/lib/parent-links";
import { LinkParentModal } from "@/app/components/link-parent-modal";

// Stable empty snapshot so the server render and the hydration pass match the
// mock-only profile; stored invitations mix in after mount.
const EMPTY_LINKS: ParentLink[] = [];

function getServerLinks(): ParentLink[] {
  return EMPTY_LINKS;
}

// Stored invitation → the same shape the mock parents already use.
function toParent(link: ParentLink, index: number): Parent {
  return {
    name: link.name,
    initial: link.name.charAt(0).toLocaleUpperCase("es"),
    relation: link.relation,
    status: link.status,
    avatarColors: AVATAR_PALETTE[index % AVATAR_PALETTE.length],
  };
}

function ParentRow({ parent }: { parent: Parent }) {
  return (
    <div className="flex items-center gap-3">
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
  );
}

// Linked parents card: mock parents plus invitations stored in localStorage,
// with the button that opens the "Vincular padre" modal.
export function LinkedParents({ kid }: { kid: Kid }) {
  const [modalOpen, setModalOpen] = useState(false);
  const links = useSyncExternalStore(
    subscribeToParentLinks,
    () => getParentLinks(kid.slug),
    getServerLinks,
  );

  return (
    <>
      <div className="rounded-2xl border border-border bg-surface px-[18px] py-4">
        <div className="mb-[14px] text-[12.5px] font-extrabold tracking-[0.8px] text-[#8A7C6D]">
          PADRES VINCULADOS
        </div>
        <div className="flex flex-col gap-[14px]">
          {kid.parents.map((parent) => (
            <ParentRow key={`mock-${parent.name}`} parent={parent} />
          ))}
          {links.map((link, index) => (
            <ParentRow
              key={`link-${link.email}`}
              parent={toParent(link, index)}
            />
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
        <LinkParentModal kid={kid} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
