"use client";

import Navbar1 from "./Navbar";
import Navbar2 from "./Navbar2";
import { useAuth } from "@/context/AuthContext";

export default function NavbarWrapper() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  return isAuthenticated ? <Navbar1 /> : <Navbar2 />;
}
