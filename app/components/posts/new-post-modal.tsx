"use client";

import { useEffect, useState, type FormEvent } from "react";
import { kids as mockKids } from "@/app/lib/mock-kids";
import { getStoredKids } from "@/app/lib/kid-storage";
import type { Badge } from "@/app/lib/mock-feed";
import type { NewPostDraft } from "@/app/lib/post-storage";

// Per-section validation messages, shown inline below each section.
type FieldErrors = {
  recipient?: string;
  badge?: string;
  body?: string;
};

// Type pills taken verbatim from crear-publicacion.dc.html.
const TYPE_OPTIONS: {
  badge: Badge;
  label: string;
  background: string;
  text: string;
}[] = [
  { badge: "comida", label: "Comida", background: "#9A7B1E", text: "#FFFFFF" },
  { badge: "siesta", label: "Siesta", background: "#E7DCF6", text: "#7B5FC0" },
  { badge: "activity", label: "Actividad", background: "#2E89A6", text: "#FFFFFF" },
  { badge: "achievement", label: "Logro", background: "#CFEBD8", text: "#3E9B6C" },
  { badge: "animo", label: "Ánimo", background: "#F9D2DE", text: "#C56486" },
  { badge: "foto", label: "Foto", background: "#FBD8CC", text: "#D9684A" },
  { badge: "announcement", label: "Anuncio", background: "#CCD8F4", text: "#4E72C8" },
];

const labelClasses =
  "mb-[10px] text-[12px] font-extrabold tracking-[0.7px] text-[#94887B]";
const errorClasses = "text-[12.5px] font-bold text-[#C5413A]";

// Recipient pills share the mockup shape; active ones invert to dark ink.
function recipientPillClasses(isActive: boolean, hasAvatar: boolean): string {
  const shape = hasAvatar
    ? "gap-2 py-1.5 pr-[14px] pl-1.5"
    : "px-4 py-1.5";
  const colors = isActive
    ? "border-ink bg-ink text-white"
    : "border-[#ECE0D0] bg-[#FFFDF9] text-[#6E6359]";
  return `flex items-center rounded-full border-[1.5px] text-[14px] font-bold ${shape} ${colors}`;
}

export function NewPostModal({
  onClose,
  onPublish,
}: {
  onClose: () => void;
  onPublish: (draft: NewPostDraft) => void;
}) {
  const [recipient, setRecipient] = useState("");
  const [badge, setBadge] = useState<Badge | null>(null);
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  // The modal only mounts on user interaction, so reading localStorage here
  // cannot cause a hydration mismatch.
  const kids = [...mockKids, ...getStoredKids()];

  // Esc closes the modal without saving.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};
    if (!recipient) {
      nextErrors.recipient = "Seleccioná un destinatario.";
    }
    if (!badge) {
      nextErrors.badge = "Seleccioná un tipo de publicación.";
    }
    if (!body.trim()) {
      nextErrors.body = "Escribí una descripción.";
    }
    return nextErrors;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    // Unreachable thanks to validate(), but it narrows `badge` for the draft.
    if (!badge) {
      return;
    }

    onPublish({
      recipient,
      badge,
      body,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(63,54,46,0.45)] p-6 sm:py-10"
      onMouseDown={(event) => {
        // Click outside the card closes without saving.
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-post-title"
        className="w-full max-w-[580px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,0.35)]"
      >
        {/* Header: Cancelar / title / Publicar */}
        <div className="flex items-center justify-between gap-4 border-b border-[#ECE0D0] px-[26px] py-5">
          <button
            type="button"
            onClick={onClose}
            className="text-[15px] font-bold text-[#94887B]"
          >
            Cancelar
          </button>
          <span
            id="new-post-title"
            className="font-heading text-[18px] font-semibold text-ink"
          >
            Nueva publicación
          </span>
          <button
            type="submit"
            form="new-post-form"
            className="text-[15px] font-extrabold text-[#D9583C]"
          >
            Publicar
          </button>
        </div>

        <form id="new-post-form" noValidate onSubmit={handleSubmit} className="px-[26px] py-6">
          {/* PARA */}
          <div className={labelClasses}>PARA</div>
          <div
            className={`flex flex-wrap gap-[9px] ${errors.recipient ? "mb-[6px]" : "mb-[22px]"}`}
          >
            {kids.map((kid) => {
              const isActive = recipient === kid.slug;
              return (
                <button
                  key={kid.slug}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setRecipient(kid.slug)}
                  className={recipientPillClasses(isActive, true)}
                >
                  <span
                    className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full font-heading text-[13px] font-semibold"
                    style={{ background: kid.avatarColors.bg, color: kid.avatarColors.fg }}
                  >
                    {kid.initial}
                  </span>
                  {kid.name.split(" ")[0]}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={recipient === "room"}
              onClick={() => setRecipient("room")}
              className={recipientPillClasses(recipient === "room", false)}
            >
              Toda la sala
            </button>
          </div>
          {errors.recipient && (
            <p className={`${errorClasses} mb-4`}>{errors.recipient}</p>
          )}

          {/* TIPO */}
          <div className={labelClasses}>TIPO</div>
          <div
            className={`flex flex-wrap gap-[9px] ${errors.badge ? "mb-[6px]" : "mb-[22px]"}`}
          >
            {TYPE_OPTIONS.map((option) => {
              const isActive = badge === option.badge;
              return (
                <button
                  key={option.badge}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setBadge(option.badge)}
                  className={`rounded-full px-4 py-2 text-[13.5px] font-extrabold ${
                    isActive ? "ring-2 ring-ink ring-offset-2" : ""
                  }`}
                  style={{ background: option.background, color: option.text }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {errors.badge && <p className={`${errorClasses} mb-4`}>{errors.badge}</p>}

          {/* DESCRIPCIÓN */}
          <div className={labelClasses}>DESCRIPCIÓN</div>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Contá cómo le fue hoy…"
            aria-invalid={Boolean(errors.body)}
            className={`min-h-[120px] w-full resize-y rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] text-[15px] leading-[1.5] text-ink outline-none placeholder:text-[#B6A99B] ${
              errors.body ? "mb-[6px]" : "mb-[22px]"
            }`}
          />
          {errors.body && <p className={`${errorClasses} mb-4`}>{errors.body}</p>}

          {/* FOTOS (decorative) */}
          <div className={labelClasses}>FOTOS</div>
          <div className="flex gap-3">
            <div className="flex h-24 w-24 items-center justify-center rounded-[14px] border border-[#ECE0D0] bg-[#F4ECE1] text-[#CBB89F]">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21" />
              </svg>
            </div>
            <div className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1] text-[#B0A290]">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C5503A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-[12px]">Agregar</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
