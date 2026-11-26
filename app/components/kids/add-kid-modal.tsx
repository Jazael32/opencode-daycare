"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { createChild } from "@/app/kids/actions";
import type { RoomRow } from "@/app/lib/kids-db";

// Per-field validation messages, shown inline below each field.
type FieldErrors = {
  name?: string;
  birthDate?: string;
  room?: string;
};

// Input colors taken verbatim from agregar-nino.dc.html.
const inputClasses =
  "w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[13px] text-[15px] text-ink outline-none placeholder:text-[#B6A99B]";
const labelClasses =
  "mb-2 block text-[12px] font-extrabold tracking-[0.7px] text-[#94887B]";

function ChevronDown() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B0A290"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function AddKidModal({
  rooms,
  onClose,
  onSaved,
}: {
  rooms: RoomRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [allergies, setAllergies] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const selectedRoom = rooms.find((room) => room.id === roomId);

  // Autofocus on the first field when the modal opens.
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Esc closes the room menu first, then the modal.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (roomMenuOpen) {
        setRoomMenuOpen(false);
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [roomMenuOpen, onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }

    setErrors({});
    setFormError(null);

    // The action validates every field; the client only renders its answer.
    // isPending stays true until the whole transition (including the await) ends.
    startTransition(async () => {
      const result = await createChild({
        fullName: name,
        birthDate,
        roomId: roomId ?? "",
        allergies,
        medicalNotes,
      });

      if (!result.ok) {
        // State updates after an await must be wrapped again to be Transitions.
        startTransition(() => {
          if (result.fieldErrors) {
            setErrors({
              name: result.fieldErrors.name,
              birthDate: result.fieldErrors.birthDate,
              room: result.fieldErrors.roomId,
            });
          }
          if (result.error) {
            setFormError(result.error);
          }
        });
        return;
      }

      onSaved();
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
        aria-labelledby="add-kid-title"
        className="w-full max-w-[520px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,0.35)]"
      >
        {/* Header: Cancelar / title / Guardar */}
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-[26px] py-5">
          <button
            type="button"
            onClick={onClose}
            className="text-[15px] font-bold text-[#94887B]"
          >
            Cancelar
          </button>
          <span
            id="add-kid-title"
            className="font-heading text-[18px] font-semibold text-ink"
          >
            Agregar niño
          </span>
          <button
            type="submit"
            form="add-kid-form"
            disabled={isPending}
            className="text-[15px] font-extrabold text-[#D9583C] disabled:opacity-60"
          >
            {isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>

        <form id="add-kid-form" onSubmit={handleSubmit} className="px-[26px] py-6">
          {formError && (
            <p
              role="alert"
              className="mb-[18px] rounded-[12px] bg-[#FBDAD6] px-4 py-3 text-[13px] font-bold text-[#C5413A]"
            >
              {formError}
            </p>
          )}

          {/* NOMBRE COMPLETO */}
          <div className={labelClasses}>NOMBRE COMPLETO</div>
          <input
            ref={nameInputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Martina López"
            aria-invalid={Boolean(errors.name)}
            className={`${inputClasses} mb-[18px]`}
          />
          {errors.name && (
            <p className="-mt-[14px] mb-[14px] text-[12.5px] font-bold text-[#C5413A]">
              {errors.name}
            </p>
          )}

          {/* FECHA DE NACIMIENTO + SALA */}
          <div className="mb-[18px] flex gap-[14px]">
            <div className="min-w-0 flex-1">
              <div className={labelClasses}>FECHA DE NACIMIENTO</div>
              <input
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                placeholder="dd/mm/aaaa"
                inputMode="numeric"
                aria-invalid={Boolean(errors.birthDate)}
                className={inputClasses}
              />
              {errors.birthDate && (
                <p className="mt-[6px] text-[12.5px] font-bold text-[#C5413A]">
                  {errors.birthDate}
                </p>
              )}
            </div>

            <div className="relative min-w-0 flex-1">
              <div className={labelClasses}>SALA</div>
              <button
                type="button"
                onClick={() => setRoomMenuOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={roomMenuOpen}
                className={`${inputClasses} flex items-center gap-2 text-left ${
                  selectedRoom ? "font-bold" : ""
                }`}
              >
                <span className={selectedRoom ? "" : "text-[#B6A99B]"}>
                  {selectedRoom?.name ?? "Seleccionar sala"}
                </span>
                <span className="flex-1" />
                <ChevronDown />
              </button>
              {errors.room && (
                <p className="mt-[6px] text-[12.5px] font-bold text-[#C5413A]">
                  {errors.room}
                </p>
              )}

              {roomMenuOpen && (
                <>
                  {/* Invisible layer that closes the menu on outside clicks. */}
                  <button
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={() => setRoomMenuOpen(false)}
                    className="fixed inset-0 cursor-default"
                  />
                  <div
                    role="listbox"
                    className="absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-[14px] border border-[#EADFD0] bg-white shadow-[0_14px_34px_-18px_rgba(63,54,46,0.4)]"
                  >
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      role="option"
                      aria-selected={roomId === room.id}
                      onClick={() => {
                        setRoomId(room.id);
                        setRoomMenuOpen(false);
                      }}
                      className={`block w-full px-4 py-[11px] text-left text-[15px] ${
                        roomId === room.id
                          ? "bg-[#F6ECDF] font-bold text-ink"
                          : "text-ink hover:bg-[#F6ECDF]"
                      }`}
                    >
                      {room.name}
                    </button>
                  ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ALERGIAS (ETIQUETAS) */}
          <div className={labelClasses}>ALERGIAS (ETIQUETAS)</div>
          <input
            value={allergies}
            onChange={(event) => setAllergies(event.target.value)}
            placeholder="Ej. Maní, Lactosa"
            className={`${inputClasses} mb-[18px]`}
          />

          {/* NOTAS MÉDICAS */}
          <div className={labelClasses}>NOTAS MÉDICAS</div>
          <textarea
            value={medicalNotes}
            onChange={(event) => setMedicalNotes(event.target.value)}
            placeholder="Indicaciones, medicación, contactos…"
            className={`${inputClasses} min-h-[90px] resize-y leading-[1.5]`}
          />
        </form>
      </div>
    </div>
  );
}
