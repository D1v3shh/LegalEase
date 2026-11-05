import { useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { createDocument, uploadToS3 } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload a document — LegalEase" },
      {
        name: "description",
        content:
          "Drop in a lease, NDA, or contract PDF and we'll explain it clause by clause.",
      },
      { property: "og:title", content: "Upload a document — LegalEase" },
      {
        property: "og:description",
        content: "Drag and drop your PDF, then start simplifying it.",
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
  component: Upload,
});

function Upload() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function select(f: File) {
    setError("");
    // Only accept PDFs
    if (f.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setError("");
    setUploading(true);

    try {
      // Step 1: Create document record in backend → get presigned S3 URL
      const { document_id, upload_url } = await createDocument(
        file.name,
        file.type
      );

      // Step 2: Upload the file directly to S3 via presigned PUT
      await uploadToS3(upload_url, file);

      // Step 3: Navigate to the document detail page
      navigate({ to: "/documents/$id", params: { id: document_id } });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Upload failed. Please try again.";
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar showUpload={false} />
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-lg font-semibold tracking-tight">
          Upload your document
        </h1>
        <p className="measure mt-2 text-xs text-muted-foreground">
          PDF leases, NDAs, contracts, and terms of service. We read it, then
          explain each clause in plain language.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) select(f);
          }}
          className={`mt-6 rounded-md border-2 border-dashed p-12 text-center transition-colors ${
            dragging
              ? "border-highlighter bg-highlighter-dim"
              : "border-rule bg-paper-raised"
          }`}
        >
          <p className="font-display text-base">Drag your PDF here</p>
          <p className="mt-1 font-mono text-2xs text-muted-foreground">or</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-3 rounded-md border border-rule px-4 py-2 text-xs hover:bg-secondary"
          >
            Browse files
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) select(f);
            }}
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 font-mono text-2xs text-flag">
            × {error}
          </p>
        )}

        {file && (
          <div className="mt-6 rounded-md border border-rule bg-paper-raised p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm">{file.name}</p>
                <p className="mt-0.5 font-mono text-2xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB · ready to process
                </p>
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={handleUpload}
                className="shrink-0 rounded-md bg-ink px-4 py-2 text-xs text-paper hover:bg-ink/90 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload & Process"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
