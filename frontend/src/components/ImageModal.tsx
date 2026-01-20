// import React, { useEffect } from "react";
import { useEffect } from "react";
import { X } from "lucide-react";

export default function ImageModal(props: {
  open: boolean;
  src: string;
  title?: string;
  onClose: () => void;
}) {
  const { open, src, title = "Payment proof", onClose } = props;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 p-4 grid place-items-center"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-extrabold text-slate-900">{title}</div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Close"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bg-slate-50 p-4">
          <img
            src={src}
            alt={title}
            className="max-h-[70vh] w-full object-contain rounded-xl border border-slate-200 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
