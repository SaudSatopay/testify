import { Eye } from "lucide-react";

import { MONITORING_NOTICE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Required visible notice while assessment monitoring is active. */
export function MonitoringBanner({ eventCount, className }: { eventCount?: number; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-warning/35 bg-warning/10 px-3 py-2 text-xs leading-relaxed text-warning",
        className,
      )}
      role="status"
    >
      <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {MONITORING_NOTICE}
        {typeof eventCount === "number" && eventCount > 0 && (
          <span className="ml-1 font-semibold">({eventCount} events recorded)</span>
        )}
      </span>
    </div>
  );
}
