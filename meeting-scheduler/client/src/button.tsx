import React from "react";

export default function Button({
  open,
  title = "Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ margin: "8px 0" }}>
          {typeof message === "string" ? (
            <p className="muted">{message}</p>
          ) : (
            message
          )}
        </div>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            {cancelText}
          </button>
          <button className="btn" onClick={onConfirm} disabled={busy}>
            {busy ? "Processing…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
