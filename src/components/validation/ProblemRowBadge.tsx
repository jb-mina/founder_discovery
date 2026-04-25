import { Badge } from "@/components/ui/badge";
import type { ListStatus } from "@/lib/db/validation";

export function ProblemRowBadge({ status }: { status: ListStatus }) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={status.variant}>{status.label}</Badge>
      {status.shelvedCount > 0 && (
        <span className="text-xs text-subtle">보류 {status.shelvedCount}</span>
      )}
    </div>
  );
}
