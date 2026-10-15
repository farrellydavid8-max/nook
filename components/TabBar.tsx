"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { CompassIcon, HomeIcon, PhotoIcon, PlusIcon, UserIcon } from "./Icons";

const TABS = [
  { href: "/", label: "Feed", Icon: HomeIcon },
  { href: "/explore", label: "Explore", Icon: CompassIcon, match: "/explore" },
  { href: "/log", label: "Log something", Icon: PlusIcon, plus: true },
  { href: "/post", label: "Post photos", Icon: PhotoIcon },
  { href: "/profile", label: "Profile", Icon: UserIcon },
];

// On phones this is the bottom tab bar; on wider screens CSS turns it into a left sidebar.
export default function TabBar() {
  const path = usePathname();
  const { user, profile } = useStore();
  // On phones the log, photo and login screens are full-screen sheets, so the bar hides there.
  const sheet = path === "/log" || path === "/post" || path === "/login";

  return (
    <nav className={`tabbar${sheet ? " on-sheet" : ""}`} aria-label="Main">
      <Link href="/" className="side-brand">
        Nook<span className="dot">.</span>
      </Link>
      {TABS.map(({ href, label, Icon, plus, match }) => {
        const active = match ? path.startsWith(match) : path === href;
        return (
          <Link
            key={label}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`tab${plus ? " plus" : ""}`}
          >
            <Icon size={24} strokeWidth={plus ? 2.2 : 1.8} />
            <span className="tab-label">{label}</span>
          </Link>
        );
      })}
      <div className="side-foot">
        {user && profile ? (
          <span>
            Signed in as <strong>{profile.username}</strong>
          </span>
        ) : (
          <Link href="/login" className="btn primary" style={{ width: "100%" }}>
            Log in or sign up
          </Link>
        )}
      </div>
    </nav>
  );
}
