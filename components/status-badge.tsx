import { CLAIMED, EXPIRED, OPEN, PICKED_UP, UNCOLLECTED } from "../lib/constants";

const statusClasses: Record<string, string> = {
  [OPEN]: "status-open",
  [CLAIMED]: "status-claimed",
  [PICKED_UP]: "status-picked-up",
  [EXPIRED]: "status-expired",
  [UNCOLLECTED]: "status-uncollected"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge ${statusClasses[status] ?? "status-expired"}`}>
      {status}
    </span>
  );
}
