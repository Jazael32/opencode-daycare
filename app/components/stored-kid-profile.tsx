"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { formatBirthDate, getAge } from "@/app/lib/mock-kids";
import { getStoredKidBySlug, subscribeToKids } from "@/app/lib/kid-storage";
import { KidProfileView } from "@/app/components/kid-profile-view";
import { LinkedParents } from "@/app/components/linked-parents";

// Client fallback for kids persisted in localStorage: shows their profile, or
// redirects to /kids when the slug is neither mock nor stored. The server
// snapshot is null, so stored kids only render after hydration.
export function StoredKidProfile({ slug }: { slug: string }) {
  const router = useRouter();
  const kid = useSyncExternalStore(
    subscribeToKids,
    () => getStoredKidBySlug(slug) ?? null,
    () => null,
  );

  // The redirect reads storage directly: the hook's value is still the null
  // server snapshot when this effect first runs.
  useEffect(() => {
    if (!getStoredKidBySlug(slug)) {
      router.replace("/kids");
    }
  }, [slug, router]);

  if (!kid) {
    return null;
  }

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
