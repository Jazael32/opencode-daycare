"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { getAge, type Kid } from "@/app/lib/mock-kids";

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

export function KidsGrid({
  kids,
  children,
}: {
  kids: Kid[];
  children?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeQuery(query.trim());
  const visibleKids = normalizedQuery
    ? kids.filter((kid) => normalizeQuery(kid.name).includes(normalizedQuery))
    : kids;

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

      {children}

      {/* Cards */}
      {visibleKids.length === 0 ? (
        <div className="rounded-[18px] border border-border bg-surface px-6 py-10 text-center">
          <p className="m-0 font-heading text-[16px] font-semibold text-ink">
            Sin resultados
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
          {visibleKids.map((kid) => (
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
      )}
    </>
  );
}
