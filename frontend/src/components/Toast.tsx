import { useEffect } from "react";

export type ToastState = { open: boolean; message: string };

export default function Toast({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast.open) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [toast.open, onClose]);

  if (!toast.open) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-[60] w-[min(92vw,560px)] -translate-x-1/2">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg">
        Done {toast.message}
      </div>
    </div>
  );
}
