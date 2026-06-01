import { STATUS } from "../lib/app";
import { cn } from "../lib/utils";

export function StatusPill({ status, className }) {
  const meta = STATUS[status];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
      meta.tokenClass, className
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}
