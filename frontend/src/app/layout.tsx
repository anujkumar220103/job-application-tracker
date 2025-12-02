import Navbar2 from "@/components/Navbar2";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import NavbarWrapper from "@/components/NavbarWrapper";

export const metadata = {
  title: "Application Tracker",
  description: "Track your job applications easily",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {/* <Navbar/> */}
        {/* <Navbar2></Navbar2> */}
        <AuthProvider>
          <NavbarWrapper/>
          <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
