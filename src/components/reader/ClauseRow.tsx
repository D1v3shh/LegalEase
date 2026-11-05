import { useState } from "react";

/** Clause shape expected by the reader UI components. */
export type Clause = {
  ref: string;
  heading: string;
  original: string;
  simplified: string;
};

type Props = {
  clause: Clause;
  active: boolean;
  onActivate: () => void;
};

/** Desktop: side-by-side pair linked by the highlighter clause connector. */
export function ClausePair({ clause, active, onActivate }: Props) {
  return (
    <div
      className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-0 md:grid"
      onMouseEnter={onActivate}
      onFocus={onActivate}
    >
      <article
        tabIndex={0}
        aria-current={active ? "true" : undefined}
        className={`measure rounded-md border p-5 transition-colors ${
          active
            ? "border-highlighter bg-highlighter-dim"
            : "border-transparent bg-transparent"
        }`}
      >
        <p className="font-mono text-2xs text-muted-foreground">{clause.ref}</p>
        <h3 className="mt-1 text-sm font-semibold">{clause.heading}</h3>
        <p className="mt-2 text-xs leading-relaxed text-ink/90">
          {clause.original}
        </p>
      </article>

      <div className="flex w-10 items-center justify-center" aria-hidden="true">
        {active ? (
          <span className="connector-draw flex w-full items-center">
            <span className="size-1.5 rounded-full bg-highlighter" />
            <span className="h-0.5 flex-1 bg-highlighter" />
            <span className="size-1.5 rounded-full bg-highlighter" />
          </span>
        ) : (
          <span className="h-0.5 w-full bg-rule/60" />
        )}
      </div>

      <article
        tabIndex={0}
        aria-current={active ? "true" : undefined}
        className={`measure rounded-md border p-5 transition-colors ${
          active
            ? "border-highlighter bg-highlighter-dim"
            : "border-transparent bg-transparent"
        }`}
      >
        <p className="font-mono text-2xs text-muted-foreground">
          What this means
        </p>
        <h3 className="mt-1 text-sm font-semibold">{clause.heading}</h3>
        <p className="mt-2 text-sm leading-relaxed">{clause.simplified}</p>
      </article>
    </div>
  );
}

/** Mobile: single column with a per-clause Original/Simplified toggle. */
export function ClauseCard({ clause }: { clause: Clause }) {
  const [view, setView] = useState<"original" | "simplified">("simplified");

  return (
    <article className="rounded-md border border-rule bg-paper-raised p-5 md:hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="font-mono text-2xs text-muted-foreground">
            {clause.ref}
          </p>
          <h3 className="truncate text-sm font-semibold">{clause.heading}</h3>
        </div>
        <button
          type="button"
          onClick={() =>
            setView(view === "original" ? "simplified" : "original")
          }
          className="shrink-0 rounded-md border border-rule px-2.5 py-1.5 font-mono text-2xs hover:bg-secondary"
        >
          {view === "original" ? "Show simplified" : "Show original"}
        </button>
      </div>
      <p
        className={`mt-3 leading-relaxed ${
          view === "original"
            ? "text-xs text-ink/90"
            : "-mx-2 rounded-md bg-highlighter-dim px-2 py-2 text-sm"
        }`}
      >
        {view === "original" ? clause.original : clause.simplified}
      </p>
    </article>
  );
}
