"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CompassIcon, HomeIcon, PhotoIcon, PlusIcon, UserIcon } from "./Icons";

const TABS = [
  { href: "/", label: "Feed", Icon: HomeIcon },
  { href: "/title/dune-part-two", label: "Explore", Icon: CompassIcon, match: "/title" },
  { href: "/log", label: "Log something", Icon: PlusIcon, plus: true },
  { href: "/post", label: "Post photos", Icon: PhotoIcon },
  { href: "/profile", label: "Profile", Icon: UserIcon },
];

export default function TabBar() {
  const path = usePathname();
  // The log and photo screens are full-screen sheets, so they hide the tab bar.
  if (path === "/log" || path === "/post") return null;

  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ href, label, Icon, plus, match }) => {
        const active = match ? path.startsWith(match) : path === href;
        return (
          <Link
            key={label}
            href={href}
            aria-label={label}
            aria-current={active && !plus ? "page" : undefined}
            className={`tab${plus ? " plus" : ""}`}
          >
            <Icon size={24} strokeWidth={plus ? 2.2 : 1.8} />
          </Link>
        );
      })}
    </nav>
  );
}
