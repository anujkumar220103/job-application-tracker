"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ensure pathname is a string (safety for environments where it could be undefined/null)
  const currentPath = typeof pathname === "string" ? pathname : "/";

  const links = [
    { href: "/", label: "Home" },
    { href: "/jobs", label: "Jobs" },
    { href: "/add-job", label: "Add Job" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  const logout = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch (e) {
        // ignore storage errors
        // console.warn("Failed to clear localStorage", e);
      }
      // use next/link navigation alternative if needed — for simplicity use location
      window.location.href = "/"; // redirect to login/home
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50" aria-label="Main navigation">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-semibold text-blue-600">
            Application Tracker
          </Link>
          {/* small helper - visible on md and up */}
          <span className="hidden md:inline-block text-sm text-gray-500">Keep track of your applications</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-4" role="menubar">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium px-2 py-1 rounded-md transition-colors ${
                currentPath === href ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-blue-500 hover:bg-gray-50"
              }`}
              aria-current={currentPath === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}

          <button
            onClick={logout}
            className="text-sm font-medium px-3 py-1 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((s) => !s)}
            className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {/* Hamburger / X icon */}
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

      {/* Mobile menu panel - slide down */}
      <div
        className={`md:hidden transition-all duration-200 overflow-hidden bg-white border-t ${open ? "max-h-[400px]" : "max-h-0"}`}
      >
        <div className="px-4 py-3 flex flex-col gap-2">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`block text-sm font-medium px-2 py-2 rounded-md ${
                currentPath === href ? "text-blue-600 bg-blue-50" : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              }`}
              aria-current={currentPath === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}

          <button
            onClick={logout}
            className="w-full text-left text-sm font-medium px-2 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
