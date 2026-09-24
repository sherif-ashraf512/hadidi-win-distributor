"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

/** Same illustration the staff dashboard's DeleteConfirmDialog uses. */
export const DEFAULT_DELETE_ILLUSTRATION_SRC = "/images/gif/delete.gif";

/**
 * Modal for destructive confirmations, mirroring the staff dashboard's
 * DeleteConfirmDialog (delete GIF on top, centred title/description, pill
 * buttons). `message` may be a string or JSX (e.g. a warning paragraph plus a
 * bullet list). While `pending` both buttons lock so a double click can't
 * fire the action twice, and Escape / backdrop click are ignored.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  pending = false,
  error = "",
  illustrationSrc = DEFAULT_DELETE_ILLUSTRATION_SRC,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape" && !pending) onCancel?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel?.();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/[0.06]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {illustrationSrc ? (
          <div className="mb-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={illustrationSrc}
              alt=""
              width={280}
              height={160}
              className="max-h-36 w-auto max-w-full object-contain"
              decoding="async"
            />
          </div>
        ) : null}
        <h2 id={titleId} className="text-center text-lg font-bold text-hadidi-primary">
          {title}
        </h2>
        <div className="mt-2 text-balance text-center text-sm leading-relaxed text-hadidi-subtle">{message}</div>
        {error ? <p className="mt-3 text-center text-sm text-red-700">{error}</p> : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="inline-flex min-w-[6.5rem] cursor-pointer items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
