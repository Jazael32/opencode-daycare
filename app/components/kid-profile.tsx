import { connection } from "next/server";
import { getAge, type Kid } from "@/app/lib/mock-kids";
import { KidProfileView } from "@/app/components/kid-profile-view";

// The age is computed per visit, so this server component renders at request
// time behind the Suspense boundary in the page.
export async function KidProfile({ kid }: { kid: Kid }) {
  await connection();
  return <KidProfileView kid={kid} age={getAge(kid.birthDate)} />;
}
