"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { getAge } from "@/app/lib/mock-kids";
import { getStoredKidBySlug, subscribeToKids } from "@/app/lib/kid-storage";
import { KidProfileView } from "@/app/components/kid-profile-view";

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

  return <KidProfileView kid={kid} age={getAge(kid.birthDate)} />;
}
