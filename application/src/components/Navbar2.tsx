"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Navbar2 = () => {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/login", label: "Login" },
    { href: "/signup", label: "Signup" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-white">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-5">
        <Link href="/" className="flex min-w-0 flex-col leading-tight text-[var(--foreground)]">
          <span className="font-bold tracking-tight">Application Tracker</span>
          <span className="mt-1 text-xs font-normal text-[var(--muted)]">Your job search, organized.</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                pathname === href
                  ? "bg-[var(--brand-soft)] text-[var(--brand-dark)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar2;
