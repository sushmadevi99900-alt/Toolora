import type { ToolStatus } from "@/types/tool";
import { Badge } from "../ui/Badge";

/** Consistent status + plan badges for cards and tool headers. Every tool is free. */
export function ToolStatusBadge({
  status,
  isFree,
  isPopular,
  isNew,
}: {
  status: ToolStatus;
  isFree: boolean;
  isPopular?: boolean;
  isNew?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isFree && <Badge tone="free">Free</Badge>}
      {status === "coming-soon" && (
        <Badge tone="warning">Coming soon</Badge>
      )}
      {isPopular && <Badge tone="popular">Popular</Badge>}
      {isNew && <Badge tone="new">New</Badge>}
    </div>
  );
}
