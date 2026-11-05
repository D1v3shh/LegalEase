import { Link } from "@tanstack/react-router";

/**
 * Processing stages displayed in the UI.
 * These map to backend statuses: PENDING → 0, SEGMENTING → 1, SIMPLIFYING → 2, COMPLETE → 3
 */
const STAGES = [
  "Uploaded",
  "Reading document",
  "Simplifying clauses",
  "Done",
] as const;

/** Props shape — the caller maps backend types to this. */
export interface ProcessingDoc {
  id: string;
  filename: string;
  pages: number;
  uploadedAt: string;
  status: "processing" | "complete" | "failed";
  stage: number; // 0–3, matches STAGES indices
  clauses: unknown[];
}

export function ProcessingStatus({ doc }: { doc: ProcessingDoc }) {
  const done = doc.status === "complete";

  return (
    <div className="mx-auto max-w-2xl rounded-md border border-rule bg-paper-raised p-8">
      <p className="font-mono text-2xs uppercase tracking-wide text-muted-foreground">
        {doc.filename}
      </p>
      <h1 className="mt-3 text-lg font-semibold">Simplifying your document</h1>

      <ol className="mt-6 space-y-0" aria-label="Processing stages">
        {STAGES.map((stage, i) => {
          const state =
            i < doc.stage ? "done" : i === doc.stage ? "active" : "pending";
          return (
            <li key={stage} className="flex items-start gap-3">
              <div className="flex flex-col items-center self-stretch">
                <span
                  aria-hidden="true"
                  className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[10px] transition-colors ${
                    state === "pending"
                      ? "border-rule text-muted-foreground"
                      : state === "active"
                        ? "border-highlighter bg-highlighter-dim text-ink"
                        : "border-highlighter bg-highlighter text-ink"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                {i < STAGES.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`w-px flex-1 ${i < doc.stage ? "bg-highlighter" : "bg-rule"}`}
                  />
                )}
              </div>
              <div className="pb-6">
                <p
                  className={`text-sm ${state === "pending" ? "text-muted-foreground" : "font-medium"}`}
                >
                  {stage}
                </p>
                {state === "active" && !done && (
                  <p className="mt-0.5 font-mono text-2xs text-muted-foreground">
                    In progress…
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p
        aria-live="polite"
        className="font-mono text-2xs text-muted-foreground"
      >
        {done
          ? "Done. Your simplified document is ready."
          : `Current stage: ${STAGES[doc.stage]}`}
      </p>

      {done && (
        <Link
          to="/documents/$id"
          params={{ id: doc.id }}
          className="mt-5 inline-block rounded-md bg-ink px-4 py-2 text-xs text-paper transition-colors hover:bg-ink/90"
        >
          Read simplified document
        </Link>
      )}
    </div>
  );
}
