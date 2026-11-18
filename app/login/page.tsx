import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-[#FBF4EC] lg:grid-cols-[1.05fr_1fr]">
      {/* Coral panel (hidden below lg) */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:bg-[linear-gradient(155deg,#F6A98E_0%,#F2937A_45%,#EC7E62_100%)] lg:p-[60px] lg:pt-14 lg:pb-14 lg:pl-[60px] lg:text-white">
        <div className="absolute -top-[140px] -right-[120px] h-[420px] w-[420px] rounded-full bg-white/12" />
        <div className="absolute -bottom-[110px] -left-[80px] h-[300px] w-[300px] rounded-full bg-white/10" />

        {/* Branding */}
        <div className="relative flex items-center gap-[13px]">
          <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-white/22">
            <svg
              width="26"
              height="26"
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
          </span>
          <span className="font-heading text-[21px] font-semibold tracking-[0.5px]">
            OpenDayCare
          </span>
        </div>

        {/* Tagline */}
        <div className="relative">
          <h1 className="m-0 mb-[18px] font-heading text-[42px] leading-[1.12] font-semibold">
            El día de cada niño,
            <br />
            compartido con su familia.
          </h1>
          <p className="m-0 max-w-[430px] text-[17px] leading-[1.6] text-white/92">
            Publicá momentos, gestioná las salas y mantené a las familias cerca,
            desde un solo lugar.
          </p>
        </div>

        {/* Footer */}
        <div className="relative text-[14px] text-white/90">
          🌿 Guardería Sala Soles
        </div>
      </div>

      {/* Form column */}
      <div className="flex items-center justify-center p-10">
        <div className="w-full max-w-[392px]">
          <h2 className="m-0 mb-[6px] font-heading text-[30px] font-semibold text-ink">
            Iniciar sesión
          </h2>
          <p className="m-0 mb-[28px] text-[15px] text-[#94887B]">
            Ingresá para ver el día de hoy.
          </p>

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
            placeholder="tu@email.com"
            className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:outline-none"
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
            placeholder="••••••••"
            className="mb-[10px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:outline-none"
          />

          <div className="mb-[20px] text-right">
            <span className="cursor-pointer text-[13.5px] font-bold text-brand-strong">
              ¿Olvidaste tu contraseña?
            </span>
          </div>

          <Link
            href="/"
            className="block w-full rounded-[15px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] py-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,0.7)]"
          >
            Iniciar sesión
          </Link>

          <p className="m-0 mt-6 text-center text-[14.5px] text-[#94887B]">
            ¿Te invitó la guardería?{" "}
            <Link href="/activar-cuenta" className="font-extrabold text-brand-strong">
              Activá tu cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
