export function AttendanceBadge({ attending }: { attending: boolean }) {
  return <span className={`badge ${attending ? "badge-positive" : "badge-negative"}`}>{attending ? "Attending" : "Not attending"}</span>;
}
