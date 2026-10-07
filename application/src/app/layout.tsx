import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import NavbarWrapper from "@/components/NavbarWrapper";

export const metadata = {
  title: "Application Tracker",
  description: "Track your job applications easily",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AuthProvider>
            <NavbarWrapper/>
            <main className="app-shell">{children}</main>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
