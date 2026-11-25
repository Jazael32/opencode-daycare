"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";

import { createInvitation } from "@/app/kids/actions";
import { RELATIONSHIP_OPTIONS, type Relationship } from "@/app/lib/relationship";

// Per-field validation messages, shown inline below each field.
type FieldErrors = {
  name?: string;
  email?: string;
};

type SuccessState = {
  code: string;
  emailSent: boolean;
};

// Input colors taken verbatim from vincular-padre.dc.html.
const inputClasses =
  "w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[13px] text-[15px] text-ink outline-none placeholder:text-[#B6A99B]";
const labelClasses =
  "mb-2 block text-[12px] font-extrabold tracking-[0.7px] text-[#94887B]";

function InfoIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#4E72C8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-px flex-none"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

export function LinkParentModal({
  childId,
  childName,
  onClose,
}: {
  childId: string;
  childName: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState<Relationship>("mother");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Autofocus on the first field when the modal opens.
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

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
    if (!name.trim()) {
      nextErrors.name = "Ingresa el nombre completo.";
    }

    const emailValue = email.trim();
    if (!emailValue) {
      nextErrors.email = "Ingresa el email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      nextErrors.email = "Ingresa un email válido.";
    }

    return nextErrors;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setGeneralError("");
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    startTransition(async () => {
      const result = await createInvitation({
        childId,
        fullName: name,
        email,
        relation,
      });

      if (result.ok) {
        setSuccess({ code: result.code, emailSent: result.emailSent });
        return;
      }

      setErrors(result.fieldErrors ?? {});
      setGeneralError(result.error ?? "");
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
        aria-labelledby="link-parent-title"
        className="w-full max-w-[480px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,0.35)]"
      >
        {/* Header: title + kid name / close */}
        <div className="flex items-center justify-between gap-4 border-b border-[#ECE0D0] px-[26px] py-5">
          <div>
            <div
              id="link-parent-title"
              className="font-heading text-[18px] font-semibold text-ink"
            >
              Vincular padre
            </div>
            <div className="text-[13px] text-[#A89A8B]">a {childName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-[#F0E6D8] text-[#94887B]"
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
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          /* Success: server-generated code + email delivery status */
          <div className="px-[26px] py-[22px]">
            <div className="mb-5 rounded-[14px] bg-[#CFEBD8] px-4 py-[13px] text-[13.5px] font-extrabold text-[#3E9B6C]">
              ¡Invitación enviada!
            </div>

            <div className="mb-5 rounded-[16px] border-[1.5px] border-dashed border-[#E6D08A] bg-[#FBF1D6] p-[18px] text-center">
              <div className="mb-2 text-[12px] font-extrabold tracking-[0.7px] text-[#A88526]">
                CÓDIGO DE INVITACIÓN
              </div>
              <div className="font-heading text-[34px] font-semibold tracking-[7px] text-[#8A7234]">
                {success.code}
              </div>
              <div className="mt-[6px] text-[13px] text-[#A88526]">Vence en 7 días</div>
            </div>

            <p className="mb-5 text-[13.5px] leading-[1.5] text-[#6E6359]">
              {success.emailSent
                ? `Le enviamos el correo a ${email.trim()}. También te dejamos el código por si quiere usarlo directamente.`
                : `El correo no se pudo enviar — compartí el código ${success.code} manualmente.`}
            </p>

            <button
              type="button"
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-[14px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] py-[14px] text-[15.5px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,0.7)]"
            >
              Listo
            </button>
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit} className="px-[26px] py-[22px]">
            {/* Informative box */}
            <div className="mb-5 flex gap-[11px] rounded-[14px] bg-[#E3ECFB] px-4 py-[13px]">
              <InfoIcon />
              <span className="text-[13.5px] leading-[1.45] text-[#3F5694]">
                Le enviaremos un correo con un código para que active su cuenta.
                Solo verá el feed de {childName}.
              </span>
            </div>

            {/* NOMBRE DEL PADRE/MADRE */}
            <div className={labelClasses}>NOMBRE DEL PADRE/MADRE</div>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Diego Fernández"
              aria-invalid={Boolean(errors.name)}
              className={`${inputClasses} mb-[18px]`}
            />
            {errors.name && (
              <p className="-mt-[14px] mb-[14px] text-[12.5px] font-bold text-[#C5413A]">
                {errors.name}
              </p>
            )}

            {/* EMAIL */}
            <div className={labelClasses}>EMAIL</div>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@ejemplo.com"
              aria-invalid={Boolean(errors.email)}
              className={`${inputClasses} mb-[18px]`}
            />
            {errors.email && (
              <p className="-mt-[14px] mb-[14px] text-[12.5px] font-bold text-[#C5413A]">
                {errors.email}
              </p>
            )}

            {/* PARENTESCO */}
            <div className="mb-[10px] block text-[12px] font-extrabold tracking-[0.7px] text-[#94887B]">
              PARENTESCO
            </div>
            <div className="mb-5 flex gap-[9px]">
              {RELATIONSHIP_OPTIONS.map((option) => {
                const isActive = relation === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setRelation(option.value)}
                    className={`flex-1 rounded-full border-[1.5px] py-[11px] text-[14px] font-extrabold ${
                      isActive
                        ? "border-[#9FB8EC] bg-[#CCD8F4] text-[#4E72C8]"
                        : "border-[#ECE0D0] bg-[#FFFDF9] text-[#6E6359]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {generalError && (
              <p className="mb-[14px] text-[12.5px] font-bold text-[#C5413A]">
                {generalError}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-[9px] rounded-[14px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] py-[14px] text-[15.5px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,0.7)] disabled:opacity-70"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m22 2-7 20-4-9-9-4z" />
                <path d="M22 2 11 13" />
              </svg>
              {isPending ? "Enviando…" : "Enviar invitación"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
