"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { acceptInvitation } from "@/app/activar-cuenta/actions";
import { avatarColorsForId } from "@/app/lib/kids-db";
import { normalizeCode } from "@/app/lib/invitation-code";
import { createClient } from "@/utils/supabase/client";

type FieldErrors = {
  code?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  authorized?: string;
};

// Shape of a `signup_lookup` row (public RPC, SPEC 11).
type SignupLookupRow = {
  daycare_id: string;
  daycare_name: string;
  room_name: string;
  child_name: string;
  full_name: string;
  relationship: string;
};

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Static box shown before the code + email match an invitation (SPEC 03 copy).
const STATIC_BOX = {
  label: "Mateo · Sala Soles",
  colors: { bg: "#A9D9E8", fg: "#1F7A93" },
};

function useSignupLookup(code: string, email: string) {
  const [supabase] = useState(createClient);
  const [lookup, setLookup] = useState<SignupLookupRow | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // Debounced lookup: the box follows code + email, matching an invitation
  // only when both belong together (the RPC itself enforces this server-side).
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const trimmedCode = normalizeCode(code);
      const trimmedEmail = email.trim().toLocaleLowerCase("es");

      if (!trimmedCode || !trimmedEmail) {
        if (!cancelled) setLookup(null);
        return;
      }

      if (!cancelled) setLookingUp(true);
      const { data } = await supabase.rpc("signup_lookup", {
        p_code: trimmedCode,
        p_email: trimmedEmail,
      });
      if (cancelled) return;
      const rows = (data ?? []) as SignupLookupRow[];
      setLookup(rows[0] ?? null);
      setLookingUp(false);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, email, supabase]);

  return { lookup, lookingUp };
}

export function ActivationForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  // The email link (?code=...) preloads the code field.
  const [code, setCode] = useState(initialCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);
  const { lookup, lookingUp } = useSignupLookup(code, email);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Preloaded codes arrive complete; focus the email field in that case.
  useEffect(() => {
    if (initialCode) {
      document.getElementById("email")?.focus();
    } else {
      codeInputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const boxName = lookup
    ? `${lookup.child_name.split(" ")[0]} · Sala ${lookup.room_name}`
    : STATIC_BOX.label;
  const boxColors = lookup ? avatarColorsForId(lookup.daycare_id) : STATIC_BOX.colors;
  const boxInitial = lookup ? lookup.child_name.charAt(0).toLocaleUpperCase("es") : "M";

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};

    if (!normalizeCode(code)) {
      nextErrors.code = "Ingresa el código de invitación.";
    }

    const emailValue = email.trim();
    if (!emailValue) {
      nextErrors.email = "Ingresa el email.";
    } else if (!EMAIL_PATTERN.test(emailValue)) {
      nextErrors.email = "Ingresa un email válido.";
    }

    if (!password) {
      nextErrors.password = "Ingresa una contraseña.";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = "Debe tener al menos 8 caracteres.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirma la contraseña.";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    if (!authorized) {
      nextErrors.authorized = "Debés autorizar para crear la cuenta.";
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    setGeneralError("");
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);

    // Fresh lookup right before signing up: it also lazily expires an
    // invitation that ran out while the form was open.
    const trimmedCode = normalizeCode(code);
    const emailValue = email.trim().toLocaleLowerCase("es");
    const { data: lookupData } = await supabase.rpc("signup_lookup", {
      p_code: trimmedCode,
      p_email: emailValue,
    });
    const rows = (lookupData ?? []) as SignupLookupRow[];
    const current = rows[0];
    if (!current) {
      setLoading(false);
      setGeneralError(
        "El código o el email no corresponden a una invitación, o ya venció.",
      );
      return;
    }

    // The signup trigger (SPEC 08) requires the daycare in user metadata and
    // creates the parent profile with the invitation's name and daycare.
    const { error: signUpError } = await supabase.auth.signUp({
      email: emailValue,
      password,
      options: {
        data: {
          daycare_id: current.daycare_id,
          full_name: current.full_name,
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      setGeneralError(
        signUpError.message.toLowerCase().includes("already registered")
          ? "Ya tenés una cuenta con este email. Iniciá sesión."
          : "No pudimos crear la cuenta. Intenta de nuevo.",
      );
      return;
    }

    // Accept the invitation with the fresh session: marks it accepted and
    // creates the parent_children link, all under RLS.
    const result = await acceptInvitation({ code: trimmedCode });
    if (!result.ok) {
      setLoading(false);
      setGeneralError(result.error);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  const inputClasses =
    "mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:outline-none disabled:opacity-70";
  const labelClasses = "mb-2 block text-[12px] font-bold tracking-[0.7px] text-[#94887B]";
  const errorClasses = "-mt-[14px] mb-[14px] text-[12.5px] font-bold text-[#C5413A]";

  return (
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
        Te invitaron a seguir el día de tu hijo. Creá tu contraseña para activar
        la cuenta.
      </p>

      <form noValidate onSubmit={handleSubmit}>
        {/* Invitation box: code + email match → the invited child, else the
            static SPEC 03 display text. */}
        <div className="mb-[22px] flex items-center gap-[14px] rounded-[16px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px]">
          <div
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full font-heading text-[19px] font-semibold"
            style={{ background: boxColors.bg, color: boxColors.fg }}
          >
            {lookingUp ? "…" : boxInitial}
          </div>
          <div>
            <div className="text-[13px] text-[#94887B]">Te invitaron a seguir a</div>
            <div className="font-heading text-[17px] font-semibold text-ink">
              {boxName}
            </div>
          </div>
        </div>

        <label htmlFor="code" className={labelClasses}>
          CÓDIGO DE INVITACIÓN
        </label>
        <input
          ref={codeInputRef}
          id="code"
          name="code"
          type="text"
          value={code}
          onChange={(event) => setCode(normalizeCode(event.target.value).slice(0, 5))}
          placeholder="7K4P9"
          aria-invalid={Boolean(errors.code)}
          disabled={loading}
          className={`${inputClasses} font-heading text-[18px] font-bold tracking-[3px]`}
        />
        {errors.code && <p className={errorClasses}>{errors.code}</p>}

        <label htmlFor="email" className={labelClasses}>
          EMAIL
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
          aria-invalid={Boolean(errors.email)}
          disabled={loading}
          className={inputClasses}
        />
        {errors.email && <p className={errorClasses}>{errors.email}</p>}

        <label htmlFor="password" className={labelClasses}>
          CREAR CONTRASEÑA
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          aria-invalid={Boolean(errors.password)}
          disabled={loading}
          autoComplete="new-password"
          className={inputClasses}
        />
        {errors.password && <p className={errorClasses}>{errors.password}</p>}

        <label htmlFor="confirm-password" className={labelClasses}>
          CONFIRMAR CONTRASEÑA
        </label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="••••••••"
          aria-invalid={Boolean(errors.confirmPassword)}
          disabled={loading}
          autoComplete="new-password"
          className={inputClasses}
        />
        {errors.confirmPassword && (
          <p className={errorClasses}>{errors.confirmPassword}</p>
        )}

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
        {errors.authorized && (
          <p className="-mt-[18px] mb-[14px] text-[12.5px] font-bold text-[#C5413A]">
            {errors.authorized}
          </p>
        )}

        {generalError && (
          <p
            role="alert"
            className="mb-4 text-center text-[13.5px] font-bold text-[#C5413A]"
          >
            {generalError}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="block w-full rounded-[15px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] py-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,0.7)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Activando…" : "Activar mi cuenta"}
        </button>
      </form>

      <p className="m-0 mt-[22px] text-center text-[14.5px] text-[#94887B]">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-extrabold text-brand-strong">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
