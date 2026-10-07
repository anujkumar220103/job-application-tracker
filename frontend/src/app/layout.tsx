import "./globals.css";
import { Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import NavbarWrapper from "@/components/NavbarWrapper";
import AddExtensionButton from "@/components/AddExtensionButton";

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
            {/* Global floating CTA. useSearchParams requires a Suspense boundary. */}
            <Suspense fallback={null}>
              <AddExtensionButton />
            </Suspense>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
