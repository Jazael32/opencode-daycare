"use client";

import Link from "next/link";
import { useState } from "react";
import { AVATAR_PALETTE, getAge } from "@/app/lib/mock-kids";
import type { ChildRow, RoomRow } from "@/app/lib/kids-db";

// Card pill colors from the mockup: background / text.
const allergyPillColors = { background: "#FBD8CC", text: "#D9684A" };

// Case- and accent-insensitive matching so "sofia" finds "Sofía".
function normalizeQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function Chevron() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#CBB89F"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// "SALA SOLES" separator from the mockup: label, count, hairline.
function RoomSeparator({ room, count }: { room: string; count: number }) {
  return (
    <div className="mb-[14px] flex items-center gap-3">
      <span className="text-[12.5px] font-extrabold tracking-[0.8px] text-ink">
        SALA {room.toLocaleUpperCase("es")}
      </span>
      <span className="text-[13px] text-muted">
        {count} {count === 1 ? "niño" : "niños"}
      </span>
      <span className="h-px flex-1 bg-separator" />
    </div>
  );
}

export function KidsGrid({ rooms, kids }: { rooms: RoomRow[]; kids: ChildRow[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeQuery(query.trim());
  const visibleKids = normalizedQuery
    ? kids.filter((kid) => normalizeQuery(kid.full_name).includes(normalizedQuery))
    : kids;

  // Colors stay stable while searching: the index comes from the full list.
  const avatarIndexById = new Map(kids.map((kid, index) => [kid.id, index]));

  // Group by room, keeping the room order from the database and skipping
  // rooms without kids.
  const roomGroups = rooms
    .map((room) => ({
      room,
      kids: visibleKids.filter((kid) => kid.room_id === room.id),
    }))
    .filter((group) => group.kids.length > 0);

  return (
    <>
      {/* Search box */}
      <div className="mb-[22px] flex items-center gap-[11px] rounded-[14px] border border-border bg-surface px-4 py-3">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#B0A290"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar niño…"
          aria-label="Buscar niño"
          className="w-full border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-[#B6A99B]"
        />
      </div>

      {/* Room sections */}
      {visibleKids.length === 0 ? (
        <div className="rounded-[18px] border border-border bg-surface px-6 py-10 text-center">
          <p className="m-0 font-heading text-[16px] font-semibold text-ink">
            Sin resultados
          </p>
        </div>
      ) : (
        roomGroups.map(({ room, kids: roomKids }, index) => (
          <section key={room.id} className={index === roomGroups.length - 1 ? "" : "mb-[18px]"}>
            <RoomSeparator room={room.name} count={roomKids.length} />
            <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
              {roomKids.map((kid) => {
                const avatar =
                  AVATAR_PALETTE[(avatarIndexById.get(kid.id) ?? 0) % AVATAR_PALETTE.length];

                return (
                  <Link
                    key={kid.id}
                    href={`/kids/${kid.id}`}
                    className="group flex min-w-0 items-center gap-[14px] rounded-[18px] border border-border bg-surface p-4 shadow-[0_4px_14px_-12px_rgba(120,90,60,0.5)] transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-[#F2A78E]"
                  >
                    <span
                      className="flex h-12 w-12 flex-none items-center justify-center rounded-full font-heading text-[19px] font-semibold"
                      style={{ background: avatar.bg, color: avatar.fg }}
                    >
                      {kid.full_name.charAt(0).toLocaleUpperCase("es")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-heading text-[16px] font-semibold text-ink">
                        {kid.full_name}
                      </span>
                      <span className="block text-[13px] text-muted">
                        {getAge(kid.birth_date)} años
                      </span>
                    </span>
                    {kid.allergy_tags.length > 0 ? (
                      <span
                        className="flex-none rounded-full px-[9px] py-[5px] text-[11px] font-extrabold"
                        style={{
                          background: allergyPillColors.background,
                          color: allergyPillColors.text,
                        }}
                      >
                        {kid.allergy_tags
                          .map((tag) => tag.toLocaleUpperCase("es"))
                          .join(", ")}
                      </span>
                    ) : (
                      <Chevron />
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </>
  );
}
