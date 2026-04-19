"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/src/auth/actions";
import type { SessionUser } from "@/src/auth/session";

const BASE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/acc", label: "ACC" },
  { href: "/directory", label: "Directory" },
  { href: "/lots", label: "Lots" },
  { href: "/chat", label: "Assistant" },
];

interface NavProps {
  user: SessionUser | null;
}

export default function Nav({ user }: NavProps) {
  const pathname = usePathname();

  const links = [
    ...BASE_LINKS,
    ...(user?.permissions.includes("admin") ? [{ href: "/groups", label: "Groups" }] : []),
  ];

  return (
    <nav
      style={{ backgroundColor: "var(--hoa-green)" }}
      className="text-white shadow-md"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-8">
        <span className="font-bold text-lg tracking-tight">
          East Meadows HOA
        </span>
        <div className="flex gap-6 flex-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-opacity hover:opacity-100 ${
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href + "/"))
                  ? "opacity-100 underline underline-offset-4"
                  : "opacity-75"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <Link href={`/directory/party-${user.partyId}`} className="text-sm opacity-80 hover:opacity-100 hover:underline underline-offset-4 transition-opacity">
              {user.name}
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-xs px-3 py-1 rounded border border-white/40 opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
              >
                Log out
              </button>
            </form>
          </div>
        )}
      </div>
    </nav>
  );
}
