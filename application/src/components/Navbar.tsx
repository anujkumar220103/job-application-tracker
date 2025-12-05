"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Navbar = () => {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/jobs", label: "Jobs" },
    { href: "/add-job", label: "Add Job" },
    { href: "/dashboard", label: "Dashboard" },
  ];
  const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user"); // if you store user info
  window.location.href = "/"; // redirect to login page
};


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
        <button onClick={logout} className="bg-white text-blue-600 px-4 py-1 rounded hover:bg-gray-200 transition hover:text-blue-500 cursor-pointer">Logout</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
