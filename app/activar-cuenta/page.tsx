import { ActivationForm } from "@/app/components/login/activation-form";
import { normalizeCode } from "@/app/lib/invitation-code";

// The email link (?code=...) must preload the code field, so the page is
// request-bound from the very top.
export const instant = false;

export default async function ActivarCuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const initialCode = normalizeCode(code ?? "").slice(0, 5);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF4EC] p-10">
      <ActivationForm initialCode={initialCode} />
    </div>
  );
}
