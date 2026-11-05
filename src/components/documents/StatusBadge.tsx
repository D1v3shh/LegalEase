export type DocStatus = "complete" | "processing" | "failed";

const map: Record<DocStatus, { label: string; icon: string; className: string }> = {
  complete: {
    label: "Complete",
    icon: "✓",
    className: "bg-highlighter-dim text-ink border-highlighter",
  },
  processing: {
    label: "Processing",
    icon: "⋯",
    className: "bg-secondary text-muted-foreground border-rule",
  },
  failed: {
    label: "Failed",
    icon: "⚠",
    className: "bg-paper text-flag border-flag",
  },
};

export function StatusBadge({ status }: { status: DocStatus }) {
  const s = map[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-2xs ${s.className}`}
    >
      <span aria-hidden="true">{s.icon}</span>
      {s.label}
    </span>
  );
}
