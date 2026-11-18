"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAge, ROOMS, type Kid } from "@/app/lib/mock-kids";
import { getStoredKids, KIDS_UPDATED_EVENT } from "@/app/lib/kid-storage";

// Card pill colors from the mockup: background / text.
const allergyPillColors = { background: "#FBD8CC", text: "#D9684A" };
const linkPillColors = { background: "#F9D2DE", text: "#C56486" };

// Case- and accent-insensitive matching so "sofia" finds "Sofía".
function normalizeQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

// "3 años · 2 padres vinculados" / "1 padre vinculado" / "sin padres vinculados"
function cardSubtitle(kid: Kid): string {
  const count = kid.parents.length;
  const parentsLabel =
    count === 0
      ? "sin padres vinculados"
      : count === 1
        ? "1 padre vinculado"
        : `${count} padres vinculados`;
  return `${getAge(kid.birthDate)} años · ${parentsLabel}`;
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

export function KidsGrid({ kids }: { kids: Kid[] }) {
  // Starts mock-only so the first render matches the server prerender; the
  // stored kids mix in after mount (and on every save) to avoid hydration
  // mismatches.
  const [mixedKids, setMixedKids] = useState(kids);
  useEffect(() => {
    const remix = () => {
      const stored = getStoredKids();
      setMixedKids(stored.length > 0 ? [...kids, ...stored] : kids);
    };
    remix();
    window.addEventListener(KIDS_UPDATED_EVENT, remix);
    return () => window.removeEventListener(KIDS_UPDATED_EVENT, remix);
  }, [kids]);

  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeQuery(query.trim());
  const visibleKids = normalizedQuery
    ? mixedKids.filter((kid) => normalizeQuery(kid.name).includes(normalizedQuery))
    : mixedKids;

  // Group by room, keeping the mockup order (Soles → Lunas → Estrellas) and
  // skipping rooms without kids.
  const kidsByRoom = new Map<string, Kid[]>();
  for (const kid of visibleKids) {
    const group = kidsByRoom.get(kid.room);
    if (group) {
      group.push(kid);
    } else {
      kidsByRoom.set(kid.room, [kid]);
    }
  }
  const roomGroups = ROOMS.filter((room) => kidsByRoom.has(room)).map((room) => ({
    room,
    kids: kidsByRoom.get(room) ?? [],
  }));

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
          <section key={room} className={index === roomGroups.length - 1 ? "" : "mb-[18px]"}>
            <RoomSeparator room={room} count={roomKids.length} />
            <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
              {roomKids.map((kid) => (
                <Link
                  key={kid.slug}
                  href={`/kids/${kid.slug}`}
                  className="group flex min-w-0 items-center gap-[14px] rounded-[18px] border border-border bg-surface p-4 shadow-[0_4px_14px_-12px_rgba(120,90,60,0.5)] transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-[#F2A78E]"
                >
                  <span
                    className="flex h-12 w-12 flex-none items-center justify-center rounded-full font-heading text-[19px] font-semibold"
                    style={{ background: kid.avatarColors.bg, color: kid.avatarColors.fg }}
                  >
                    {kid.initial}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-heading text-[16px] font-semibold text-ink">
                      {kid.name}
                    </span>
                    <span className="block text-[13px] text-muted">{cardSubtitle(kid)}</span>
                  </span>
                  {kid.allergy ? (
                    <span
                      className="flex-none rounded-full px-[9px] py-[5px] text-[11px] font-extrabold"
                      style={{
                        background: allergyPillColors.background,
                        color: allergyPillColors.text,
                      }}
                    >
                      {kid.allergy.label}
                    </span>
                  ) : kid.parents.length === 0 ? (
                    <span
                      className="flex-none rounded-full px-[9px] py-[5px] text-[11px] font-extrabold"
                      style={{
                        background: linkPillColors.background,
                        color: linkPillColors.text,
                      }}
                    >
                      VINCULAR
                    </span>
                  ) : (
                    <Chevron />
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
