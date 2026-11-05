import { Link } from "@tanstack/react-router";

export function ErrorState({
  filename,
  reason,
}: {
  filename: string;
  reason: string;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-md border border-flag/40 bg-paper-raised p-8">
      <p className="font-mono text-2xs uppercase tracking-wide text-flag">
        <span aria-hidden="true">⚠ </span>Failed
      </p>
      <h1 className="mt-3 text-lg font-semibold">
        We couldn't simplify this document
      </h1>
      <p className="mt-1 font-mono text-2xs text-muted-foreground">
        {filename}
      </p>
      <p className="measure mt-4 text-sm leading-relaxed">{reason}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          to="/upload"
          className="rounded-md bg-ink px-4 py-2 text-xs text-paper transition-colors hover:bg-ink/90"
        >
          Upload a better scan
        </Link>
        <Link
          to="/dashboard"
          className="rounded-md border border-rule px-4 py-2 text-xs hover:bg-secondary"
        >
          Back to documents
        </Link>
      </div>
    </div>
  );
}
