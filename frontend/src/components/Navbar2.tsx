"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Navbar2 = () => {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/login", label: "Login" },
    { href: "/signup", label: "signup" },
    // { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-semibold text-blue-600">
          Application Tracker
        </Link>
        <div className="space-x-4">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium ${
                pathname === href
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-blue-500"
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
