"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getKidBySlug } from "@/app/lib/mock-kids";
import { getStoredKidBySlug } from "@/app/lib/kid-storage";
import {
  activateParentLink,
  findPendingByCode,
  hasParentLinks,
  type ParentLink,
} from "@/app/lib/parent-links";

export default function ActivarCuentaPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [matchedLink, setMatchedLink] = useState<ParentLink | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Resolve the invited kid (mock or stored) to drive the invitation box.
  const matchedKid = matchedLink
    ? (getKidBySlug(matchedLink.kidSlug) ?? getStoredKidBySlug(matchedLink.kidSlug))
    : undefined;

  // The box follows the typed code; without a match it keeps the SPEC 03 text.
  const invitationName = matchedKid
    ? `${matchedKid.name.split(" ")[0]} · Sala ${matchedKid.room}`
    : "Mateo · Sala Soles";
  const invitationInitial = matchedKid?.initial ?? "M";
  const invitationColors = matchedKid?.avatarColors ?? {
    bg: "#A9D9E8",
    fg: "#1F7A93",
  };

  function handleCodeChange(value: string) {
    setCode(value);
    setFormError(null);

    const match = findPendingByCode(value);
    setMatchedLink(match ?? null);
    if (match) {
      setEmail(match.email);
    }
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    setFormError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (activateParentLink(code, email)) {
      router.push("/");
      return;
    }

    // No invitations at all: stay exactly on the SPEC 03 behavior (CTA → /).
    if (!hasParentLinks()) {
      router.push("/");
      return;
    }

    setFormError("El código y el email no coinciden, o la invitación venció.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF4EC] p-10">
      <div className="w-full max-w-[440px]">
        {/* Logo */}
        <div className="mb-[22px] flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-[linear-gradient(155deg,#F8C3A8,#F2937A)] shadow-[0_12px_26px_-10px_rgba(238,129,100,0.65)]">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </div>

        <h1 className="m-0 mb-2 font-heading text-[32px] leading-[1.15] font-semibold text-ink">
          Bienvenida a OpenDayCare
        </h1>
        <p className="m-0 mb-[26px] text-[15.5px] leading-[1.55] text-[#94887B]">
          Te invitaron a seguir el día de tu hijo. Creá tu contraseña para
          activar la cuenta.
        </p>

        <form noValidate onSubmit={handleSubmit}>
          {/* Invitation box: stored invitation when the code matches, else the
              static SPEC 03 display text. */}
          <div className="mb-[22px] flex items-center gap-[14px] rounded-[16px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px]">
            <div
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full font-heading text-[19px] font-semibold"
              style={{
                background: invitationColors.bg,
                color: invitationColors.fg,
              }}
            >
              {invitationInitial}
            </div>
            <div>
              <div className="text-[13px] text-[#94887B]">
                Te invitaron a seguir a
              </div>
              <div className="font-heading text-[17px] font-semibold text-ink">
                {invitationName}
              </div>
            </div>
          </div>

          <label
            htmlFor="code"
            className="mb-2 block text-[12px] font-bold tracking-[0.7px] text-[#94887B]"
          >
            CÓDIGO DE INVITACIÓN
          </label>
          <input
            id="code"
            name="code"
            type="text"
            value={code}
            onChange={(event) => handleCodeChange(event.target.value)}
            placeholder="7K4P9"
            aria-invalid={Boolean(formError)}
            className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] font-heading text-[18px] font-bold tracking-[3px] text-ink placeholder:text-[#B6A99B] focus:outline-none"
          />

          <label
            htmlFor="email"
            className="mb-2 block text-[12px] font-bold tracking-[0.7px] text-[#94887B]"
          >
            EMAIL
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => handleEmailChange(event.target.value)}
            placeholder="tu@email.com"
            aria-invalid={Boolean(formError)}
            className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:outline-none"
          />

          <label
            htmlFor="password"
            className="mb-2 block text-[12px] font-bold tracking-[0.7px] text-[#94887B]"
          >
            CREAR CONTRASEÑA
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:outline-none"
          />

          {/* Authorization checkbox */}
          <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-[14px] bg-[#FBF1D6] px-4 py-[14px]">
            <button
              type="button"
              role="checkbox"
              aria-checked={authorized}
              aria-label="Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro de la app."
              onClick={() => setAuthorized((value) => !value)}
              className={`mt-px flex h-6 w-6 flex-none items-center justify-center rounded-lg transition-colors ${
                authorized ? "bg-[#5FB97E]" : "border-[1.5px] border-[#E5D9B8] bg-white"
              }`}
            >
              {authorized && (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            <span className="text-[14px] leading-[1.45] text-[#8A7234]">
              Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro
              de la app.
            </span>
          </label>

          {formError && (
            <p
              role="alert"
              className="mb-4 text-center text-[13.5px] font-bold text-[#C5413A]"
            >
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="block w-full rounded-[15px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] py-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,0.7)]"
          >
            Activar mi cuenta
          </button>
        </form>

        <p className="m-0 mt-[22px] text-center text-[14.5px] text-[#94887B]">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-extrabold text-brand-strong">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
