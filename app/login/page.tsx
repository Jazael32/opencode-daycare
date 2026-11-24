import { LoginForm } from "@/app/components/login-form";

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
        <LoginForm />
      </div>
    </div>
  );
}
