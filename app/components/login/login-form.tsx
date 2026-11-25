"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createClient } from "@/utils/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || !email.trim() || !password) {
      return;
    }

    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setLoading(false);
      setError("Email o contraseña incorrectos. Revisá los datos y probá de nuevo.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-[392px]">
      <h2 className="m-0 mb-[6px] font-heading text-[30px] font-semibold text-ink">
        Iniciar sesión
      </h2>
      <p className="m-0 mb-[28px] text-[15px] text-[#94887B]">
        Ingresá para ver el día de hoy.
      </p>

      <form noValidate onSubmit={handleSubmit}>
        <label
          htmlFor="email"
          className="mb-[9px] block text-[12px] font-bold tracking-[0.7px] text-[#94887B]"
        >
          EMAIL
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
          disabled={loading}
          aria-invalid={Boolean(error)}
          className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:outline-none disabled:opacity-70"
        />

        <label
          htmlFor="password"
          className="mb-[8px] block text-[12px] font-bold tracking-[0.7px] text-[#94887B]"
        >
          CONTRASEÑA
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
          disabled={loading}
          aria-invalid={Boolean(error)}
          className="mb-[10px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:outline-none disabled:opacity-70"
        />

        <div className="mb-[20px] text-right">
          <span className="cursor-pointer text-[13.5px] font-bold text-brand-strong">
            ¿Olvidaste tu contraseña?
          </span>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 text-center text-[13.5px] font-bold text-[#C5413A]"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="block w-full rounded-[15px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] py-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,0.7)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </form>

      <p className="m-0 mt-6 text-center text-[14.5px] text-[#94887B]">
        ¿Te invitó la guardería?{" "}
        <Link href="/activar-cuenta" className="font-extrabold text-brand-strong">
          Activá tu cuenta
        </Link>
      </p>
    </div>
  );
}
