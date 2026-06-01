import { useEffect } from "react";
import { X } from "lucide-react";

export function AppBtn({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-8">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
