import Link from "next/link";
import { LogoutButton } from "@/app/components/logout-button";
import { NewPostButton } from "@/app/components/new-post-button";
import type { UserProfile, UserRole } from "@/app/lib/auth";

// Sections that can be highlighted as the current one; defaults to Feed.
export type ActiveNav = "feed" | "kids" | "avisos" | "cuenta";

// Roles persist in English (SPEC 08); the UI shows them in Spanish.
const roleLabels: Record<UserRole, string> = {
  staff: "Maestra",
  parent: "Familia",
  admin: "Admin",
};

const navItems = [
  {
    key: "feed",
    label: "Feed",
    href: "/",
    icon: (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    key: "kids",
    label: "Niños",
    href: "/kids",
    icon: (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="7" r="3" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 20a5 5 0 0 1 5.5-4.9" />
      </svg>
    ),
  },
  {
    key: "avisos",
    label: "Avisos",
    href: "/",
    icon: (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
    ),
  },
  {
    key: "cuenta",
    label: "Mi cuenta",
    href: "/",
    icon: (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function Sidebar({
  active = "feed",
  user,
}: {
  active?: ActiveNav;
  user: UserProfile;
}) {
  const initial = user.fullName.trim().charAt(0).toUpperCase() || "?";
  const roleAndDaycare = [roleLabels[user.role], user.daycareName]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] flex-none flex-col bg-surface px-4 py-6 lg:flex lg:border-r lg:border-border">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-[11px] px-2 pt-1 pb-[22px]">
        <span
          className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(155deg, #F8C3A8, #F2937A)" }}
        >
          <svg
            width="21"
            height="21"
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
        <span>
          <span className="block font-heading text-[17px] leading-none font-semibold text-ink">
            OpenDayCare
          </span>
          <span className="mt-0.5 block text-[11.5px] text-muted">
            {user.daycareName}
          </span>
        </span>
      </Link>

      {/* New post button */}
      <NewPostButton variant="sidebar" />

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={item.key === active ? "page" : undefined}
            className={
              item.key === active
                ? "flex items-center gap-3 rounded-xl bg-brand-soft px-3 py-[11px] text-[14.5px] font-extrabold text-brand"
                : "flex items-center gap-3 rounded-xl px-3 py-[11px] text-[14.5px] font-semibold text-[#6E6359]"
            }
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User card */}
      <div className="mt-[10px] border-t border-border pt-[14px]">
        <div className="flex items-center gap-[11px] px-2 py-1.5">
          <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-avatar font-heading text-[16px] font-semibold text-white">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-extrabold text-ink">
              {user.fullName}
            </span>
            <span className="block text-[12px] text-muted">{roleAndDaycare}</span>
          </span>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
