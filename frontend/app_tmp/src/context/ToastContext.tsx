"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastContextType = {
  notify: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextType>({
  notify: () => {},
  success: () => {},
  error: () => {},
});

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = ++counter;
      setToasts((current) => [...current, { id, kind, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const success = useCallback((message: string) => notify(message, "success"), [notify]);
  const error = useCallback((message: string) => notify(message, "error"), [notify]);

  return (
    <ToastContext.Provider value={{ notify, success, error }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className={`surface flex items-start justify-between gap-3 p-3 text-sm shadow-lg ${
              toast.kind === "error"
                ? "border-l-4 border-l-[var(--danger)]"
                : toast.kind === "success"
                  ? "border-l-4 border-l-[var(--brand)]"
                  : ""
            }`}
          >
            <span className="font-semibold text-[var(--foreground)]">{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
              onClick={() => remove(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
