"use client";

import Modal from "@/components/Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} labelledById="confirm-dialog-title">
      <h2 id="confirm-dialog-title" className="text-xl font-bold text-[var(--foreground)]">
        {title}
      </h2>
      <p className="mt-3 text-sm text-[var(--muted)]">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="button-secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? "button-danger" : "button-primary"}
          onClick={onConfirm}
          autoFocus
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
