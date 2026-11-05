import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { StatusBadge } from "@/components/documents/StatusBadge";
import { listDocuments } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your documents — LegalEase" },
      {
        name: "description",
        content:
          "Every lease, NDA, and contract you've uploaded, with its simplification status.",
      },
      { property: "og:title", content: "Your documents — LegalEase" },
      {
        property: "og:description",
        content:
          "Track which of your documents are simplified, processing, or failed.",
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
  component: Dashboard,
});

function Dashboard() {
  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["documents"],
    queryFn: () => listDocuments(),
    // Poll every 10s to pick up status changes (processing → complete)
    refetchInterval: 10_000,
  });

  const docs = response?.items ?? [];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-lg font-semibold tracking-tight">Your documents</h1>

        {isLoading ? (
          <div className="mt-8 rounded-md border border-rule bg-paper-raised p-10 text-center">
            <p className="font-mono text-2xs text-muted-foreground">
              Loading your documents…
            </p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-md border border-rule bg-paper-raised p-10 text-center">
            <p className="text-sm text-flag">
              Failed to load documents. Please try again.
            </p>
          </div>
        ) : docs.length === 0 ? (
          <div className="mt-8 rounded-md border border-rule bg-paper-raised p-10 text-center">
            <h2 className="font-display text-base">
              Upload your first document to see it simplified.
            </h2>
            <Link
              to="/upload"
              className="mt-5 inline-block rounded-md bg-ink px-4 py-2 text-xs text-paper hover:bg-ink/90"
            >
              Upload a document
            </Link>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-rule overflow-hidden rounded-md border border-rule bg-paper-raised">
            {docs.map((doc) => (
              <li key={doc.id}>
                <Link
                  to="/documents/$id"
                  params={{ id: doc.id }}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-highlighter-dim/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{doc.original_filename}</p>
                    <p className="mt-0.5 font-mono text-2xs text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge
                      status={
                        doc.status as "complete" | "processing" | "failed"
                      }
                    />
                    <span aria-hidden="true" className="text-muted-foreground">
                      →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
