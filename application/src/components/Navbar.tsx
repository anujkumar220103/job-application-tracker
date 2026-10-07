"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout: clearAuth } = useAuth();
  const [open, setOpen] = useState(false);

  const currentPath = typeof pathname === "string" ? pathname : "/";

  const links = [
    { href: "/", label: "Home" },
    { href: "/jobs", label: "Jobs" },
    { href: "/add-job", label: "Add Job" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <nav className="border-b border-[var(--border)] bg-white sticky top-0 z-50" aria-label="Main navigation">
      <div className="flex w-full items-center justify-between gap-6 px-4 py-3 sm:px-5">
        <div className="flex flex-col leading-tight">
          <Link href="/" className="font-bold tracking-tight text-[var(--foreground)]">Application Tracker</Link>
          <span className="mt-1 text-xs text-[var(--muted)]">Your job search, organized.</span>
        </div>

        <div className="hidden items-center gap-1 md:flex" role="menubar">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                currentPath === href ? "bg-[var(--brand-soft)] text-[var(--brand-dark)]" : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              }`}
              aria-current={currentPath === href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}

          <button
            onClick={logout}
            className="button-secondary ml-2 min-h-9 px-3 text-sm"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>

        <div className="md:hidden flex items-center">
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((s) => !s)}
            className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {open ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div
        className={`md:hidden transition-all duration-200 overflow-hidden bg-white border-t ${open ? "max-h-[400px]" : "max-h-0"}`}
      >
        <div className="flex flex-col gap-2 px-4 py-3">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`block rounded-md px-3 py-2 text-sm font-semibold ${
                currentPath === href ? "bg-[var(--brand-soft)] text-[var(--brand-dark)]" : "text-gray-700 hover:bg-gray-50 hover:text-[var(--brand-dark)]"
              }`}
              aria-current={currentPath === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}

          <button
            onClick={logout}
            className="button-secondary w-full justify-start text-left text-sm"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
