"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { logoutAction } from "@/src/auth/actions";
import type { SessionUser } from "@/src/auth/session";

const BASE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/acc", label: "ACC" },
  { href: "/directory", label: "Directory" },
  { href: "/lots", label: "Lots" },
  { href: "/documents", label: "Documents" },
  { href: "/chat", label: "Assistant" },
];

const ADMIN_DROPDOWN = [
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/announcements", label: "Announcements" },
];

interface NavProps {
  user: SessionUser | null;
}

function AdminDropdown({ isActive }: { isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`text-sm font-medium transition-opacity hover:opacity-100 cursor-pointer flex items-center gap-1 ${
          isActive ? "opacity-100 underline underline-offset-4" : "opacity-75"
        }`}
      >
        Admin
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded shadow-lg border border-gray-200 py-1 z-50 min-w-36">
          {ADMIN_DROPDOWN.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Nav({ user }: NavProps) {
  const pathname = usePathname();
  const isAdmin = user?.permissions.includes("admin") ?? false;

  return (
    <nav
      style={{ backgroundColor: "var(--hoa-green)" }}
      className="text-white shadow-md"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-8">
        <span className="font-bold text-lg tracking-tight">
          East Meadows HOA
        </span>
        <div className="flex gap-6 flex-1 items-center">
          {BASE_LINKS.map((link) => (
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
          {isAdmin && (
            <AdminDropdown isActive={pathname === "/admin" || pathname.startsWith("/admin/")} />
          )}
          {user?.permissions.includes("homeowner") && (
            <Link
              href="/portal"
              className={`text-sm font-medium transition-opacity hover:opacity-100 ${
                pathname === "/portal" || pathname.startsWith("/portal/")
                  ? "opacity-100 underline underline-offset-4"
                  : "opacity-75"
              }`}
            >
              My Account
            </Link>
          )}
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
