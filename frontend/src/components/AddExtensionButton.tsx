"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Modal from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";

// Public store listing for the Job Tracker extension. Used as a safe fallback
// so the install flow works in every environment (including production) even
// when NEXT_PUBLIC_CHROME_EXTENSION_INSTALL_URL is not configured. This is a
// public URL, not a secret, so hardcoding a default here is safe. Set the env
// var to override (e.g. to point at a Chrome Web Store listing instead).
const DEFAULT_INSTALL_URL =
  "https://microsoftedge.microsoft.com/addons/detail/joamfpimcnbpejkadfjcnkcdephfeoej";

const INSTALL_URL =
  process.env.NEXT_PUBLIC_CHROME_EXTENSION_INSTALL_URL?.trim() || DEFAULT_INSTALL_URL;
const INTENT_KEY = "jobtracker:installIntent";

// Which onboarding step the modal is showing.
type Step = "auth" | "install" | "guidance";

function BrowserPuzzleIcon() {
  // Simple inline icon (no new dependency) — an extension/puzzle glyph.
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 3a2 2 0 0 1 4 0v1h3a1 1 0 0 1 1 1v3h1a2 2 0 1 1 0 4h-1v4a1 1 0 0 1-1 1h-4v-1a2 2 0 1 0-4 0v1H5a1 1 0 0 1-1-1v-4H3a2 2 0 1 1 0-4h1V5a1 1 0 0 1 1-1h5V3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function AddExtensionButton() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("install");

  const openForState = useCallback(() => {
    setStep(isAuthenticated ? "install" : "auth");
    setOpen(true);
  }, [isAuthenticated]);

  // After returning from login/signup with the install intent preserved,
  // auto-open the modal at the install step. Uses a query flag set by the
  // auth pages plus a sessionStorage fallback. No fake install state is stored.
  useEffect(() => {
    if (loading) return;
    const hasQueryFlag = searchParams.get("install") === "1";
    let hasIntent = false;
    try {
      hasIntent = sessionStorage.getItem(INTENT_KEY) === "1";
    } catch {
      hasIntent = false;
    }

    if ((hasQueryFlag || hasIntent) && isAuthenticated) {
      // Synchronizing modal state from an external signal (URL / sessionStorage
      // install intent), consistent with the data-loading effects elsewhere.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("install");
      setOpen(true);
      try {
        sessionStorage.removeItem(INTENT_KEY);
      } catch {
        /* ignore */
      }
      if (hasQueryFlag) {
        // Clean the URL so a refresh doesn't reopen the modal.
        router.replace(pathname);
      }
    }
  }, [loading, isAuthenticated, searchParams, pathname, router]);

  const goToAuth = (target: "/login" | "/signup") => {
    try {
      sessionStorage.setItem(INTENT_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    router.push(`${target}?next=install`);
  };

  return (
    <>
      <button
        type="button"
        onClick={openForState}
        aria-label="Add Job Tracker Extension"
        title="Add Job Tracker Extension"
        className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-3 font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2"
      >
        <BrowserPuzzleIcon />
        <span className="hidden text-sm sm:inline">Add Extension</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledById="add-extension-title">
        {step === "auth" && (
          <>
            <p className="eyebrow">Browser extension</p>
            <h2 id="add-extension-title" className="page-title mt-2 text-2xl">Add Job Tracker Extension</h2>
            <p className="page-copy mt-2">Sign in to connect the extension with your Job Tracker.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="button-primary" onClick={() => goToAuth("/login")}>Sign In</button>
              <button type="button" className="button-secondary" onClick={() => goToAuth("/signup")}>Create Account</button>
            </div>
          </>
        )}

        {step === "install" && (
          <>
            <p className="eyebrow">Browser extension</p>
            <h2 id="add-extension-title" className="page-title mt-2 text-2xl">Add Job Tracker Extension</h2>
            <p className="page-copy mt-2">
              Save jobs directly from supported job websites (LinkedIn, Unstop, Internshala) to your tracker.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="button-primary"
                onClick={() => setStep("guidance")}
              >
                Add Extension
              </a>
              <button type="button" className="button-secondary" onClick={() => setOpen(false)}>Not now</button>
            </div>
          </>
        )}

        {step === "guidance" && (
          <>
            <p className="eyebrow">Finish setup</p>
            <h2 id="add-extension-title" className="page-title mt-2 text-2xl">Finish Setup</h2>
            {INSTALL_URL ? (
              <p className="page-copy mt-2">
                Chrome will open the extension page. Click “Add to Chrome”, then return here. After installing,
                start browsing jobs on LinkedIn, Unstop, or Internshala to save them.
              </p>
            ) : (
              <p className="page-copy mt-2">
                The extension isn’t published to the Chrome Web Store yet. Once a listing is available it will open
                here automatically. In the meantime, the extension can be loaded manually from the project’s
                <span className="font-semibold"> /extension </span> folder via Chrome → Extensions → Developer mode → Load unpacked.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {INSTALL_URL && (
                <a
                  href={INSTALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-primary"
                >
                  Open Extension Page
                </a>
              )}
              <button type="button" className="button-secondary" onClick={() => setOpen(false)}>Done</button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
