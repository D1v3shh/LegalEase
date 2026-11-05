import { useEffect, useState } from "react";

export type DocStatus = "complete" | "processing" | "failed";

export type Clause = {
  ref: string;
  heading: string;
  original: string;
  simplified: string;
};

export type Doc = {
  id: string;
  filename: string;
  pages: number;
  uploadedAt: string;
  status: DocStatus;
  stage: number; // 0 Uploaded, 1 Reading document, 2 Simplifying clauses, 3 Done
  errorReason?: string;
  clauses: Clause[];
};

export const STAGES = ["Uploaded", "Reading document", "Simplifying clauses", "Done"] as const;

let docs: Doc[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getDocs() {
  return docs;
}

export function getDoc(id: string) {
  return docs.find((d) => d.id === id);
}

export function addDoc(filename: string, pages: number) {
  const id = `doc-${Date.now()}`;
  docs = [
    {
      id,
      filename,
      pages,
      uploadedAt: "Just now",
      status: "processing",
      stage: 0,
      clauses: [],
    },
    ...docs,
  ];
  emit();
  return id;
}

export function advance(id: string) {
  docs = docs.map((d) => {
    if (d.id !== id || d.status !== "processing") return d;
    const stage = Math.min(3, d.stage + 1);
    return { ...d, stage, status: stage === 3 ? "complete" : "processing" };
  });
  emit();
}

export function useDocs() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return docs;
}
