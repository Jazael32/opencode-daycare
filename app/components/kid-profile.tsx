import { connection } from "next/server";
import { formatBirthDate, getAge, type Kid } from "@/app/lib/mock-kids";
import { KidProfileView } from "@/app/components/kid-profile-view";
import { LinkedParents } from "@/app/components/linked-parents";

// The age is computed per visit, so this server component renders at request
// time. Legacy mock flow: the database profile lives in app/kids/[id].
export async function KidProfile({ kid }: { kid: Kid }) {
  await connection();
  return (
    <KidProfileView
      kid={{
        name: kid.name,
        initial: kid.initial,
        avatarColors: kid.avatarColors,
        age: getAge(kid.birthDate),
        roomName: kid.room,
        birthDateLabel: formatBirthDate(kid.birthDate),
        enrolledLabel: kid.enrolled,
        allergyTags: kid.allergy ? [kid.allergy.label] : [],
        medicalNotes: kid.allergy?.notes ?? null,
      }}
      linkedParents={<LinkedParents kid={kid} />}
    />
  );
}
