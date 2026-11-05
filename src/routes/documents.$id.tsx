import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { ErrorState } from "@/components/layout/ErrorState";
import { ProcessingStatus } from "@/components/upload/ProcessingStatus";
import { ClauseCard, ClausePair } from "@/components/reader/ClauseRow";
import { getDocument, getClauses } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { ClauseResponse, DocumentDetail } from "@/lib/api";

export const Route = createFileRoute("/documents/$id")({
  head: () => ({
    meta: [
      { title: "Document reader — LegalEase" },
      {
        name: "description",
        content:
          "Read the original clause and its plain-language translation side by side, linked clause by clause.",
      },
      { property: "og:title", content: "Document reader — LegalEase" },
      {
        property: "og:description",
        content: "Original clause on the left, plain language on the right.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  // Protect: redirect to sign-in if not authenticated
  beforeLoad: async () => {
    if (typeof window === "undefined") return; // skip auth check during SSR
    const user = await getCurrentUser();
    if (!user) {
      throw redirect({ to: "/" });
    }
  },
  component: Reader,
});

/**
 * Map backend ClauseResponse to the shape the ClauseRow components expect.
 */
function mapClause(c: ClauseResponse) {
  return {
    ref: `§${c.sequence_number.toString()}`,
    heading: `Clause ${c.sequence_number.toString()}`,
    original: c.original_text,
    simplified: c.simplified_text,
  };
}

/**
 * Map backend status string to stage number for the ProcessingStatus component.
 * Backend statuses: PENDING, SEGMENTING, SIMPLIFYING, AGGREGATING, COMPLETE, FAILED
 */
function statusToStage(status: string): number {
  switch (status.toUpperCase()) {
    case "PENDING":
      return 0;
    case "SEGMENTING":
      return 1;
    case "SIMPLIFYING":
      return 2;
    case "AGGREGATING":
      return 2;
    case "COMPLETE":
      return 3;
    default:
      return 0;
  }
}

/**
 * Map backend status to the simplified status type the UI components use.
 */
function mapStatus(status: string): "complete" | "processing" | "failed" {
  const upper = status.toUpperCase();
  if (upper === "COMPLETE") return "complete";
  if (upper === "FAILED") return "failed";
  return "processing";
}

function Reader() {
  const { id } = Route.useParams();
  const [activeRef, setActiveRef] = useState<string | null>(null);

  // Fetch document metadata
  const {
    data: doc,
    isLoading: docLoading,
    error: docError,
  } = useQuery<DocumentDetail>({
    queryKey: ["document", id],
    queryFn: () => getDocument(id),
    // Poll while processing to pick up status changes
    refetchInterval: (query) => {
      const status = query.state.data?.status?.toUpperCase();
      if (status && status !== "COMPLETE" && status !== "FAILED") {
        return 5_000; // poll every 5s while processing
      }
      return false;
    },
  });

  // Fetch clauses only when the document is complete
  const isComplete = doc?.status?.toUpperCase() === "COMPLETE";
  const { data: rawClauses } = useQuery<ClauseResponse[]>({
    queryKey: ["clauses", id],
    queryFn: () => getClauses(id),
    enabled: isComplete,
  });

  const clauses = rawClauses?.map(mapClause) ?? [];

  if (docLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-2xl px-5 py-10">
          <div className="rounded-md border border-rule bg-paper-raised p-10 text-center">
            <p className="font-mono text-2xs text-muted-foreground">
              Loading document…
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (docError || !doc) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-2xl px-5 py-10">
          <ErrorState
            filename="Unknown document"
            reason="This document isn't in your list anymore. It may have been removed — upload it again to read the simplified version."
          />
        </main>
      </div>
    );
  }

  const uiStatus = mapStatus(doc.status);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-10">
        {uiStatus === "failed" ? (
          <ErrorState
            filename={doc.original_filename}
            reason={
              doc.error_reason ??
              "Processing failed. Please try uploading again."
            }
          />
        ) : uiStatus === "processing" ? (
          <ProcessingStatus
            doc={{
              id: doc.id,
              filename: doc.original_filename,
              pages: 0, // backend doesn't track pages
              uploadedAt: doc.created_at,
              status: "processing",
              stage: statusToStage(doc.status),
              clauses: [],
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight">
                  {doc.original_filename}
                </h1>
                <p className="mt-0.5 font-mono text-2xs text-muted-foreground">
                  {clauses.length} clauses simplified
                </p>
              </div>
              <Link
                to="/dashboard"
                className="shrink-0 rounded-md border border-rule px-3 py-2 font-mono text-2xs hover:bg-secondary"
              >
                All documents
              </Link>
            </div>

            <div className="mt-8 hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-0 md:grid">
              <p className="px-5 font-mono text-2xs uppercase tracking-wide text-muted-foreground">
                Original
              </p>
              <span className="w-10" />
              <p className="px-5 font-mono text-2xs uppercase tracking-wide text-muted-foreground">
                Simplified
              </p>
            </div>

            <div className="mt-2 space-y-2 md:rounded-md md:border md:border-rule md:bg-paper-raised md:p-3">
              {clauses.map((clause) => (
                <div key={clause.ref}>
                  <ClausePair
                    clause={clause}
                    active={activeRef === clause.ref}
                    onActivate={() => setActiveRef(clause.ref)}
                  />
                  <ClauseCard clause={clause} />
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
