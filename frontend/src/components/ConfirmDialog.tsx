import React from "react";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Yes",
  cancelText = "No",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
        <div className="text-lg font-extrabold text-slate-900">{title}</div>
        {description && <div className="mt-1 text-sm text-slate-600">{description}</div>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
