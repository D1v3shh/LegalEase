/**
 * Typed API client for the LegalEase backend (FastAPI).
 *
 * Mirrors the backend's response types and attaches Cognito ID tokens
 * to every request. On 401 responses, signs out and redirects to "/".
 */

import { getIdToken, signOut } from "./auth";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * API base URL.
 *
 * In the browser, requests go through the Vite dev proxy at /api
 * (configured in vite.config.ts) to avoid CORS. The proxy forwards
 * /api/* → VITE_API_URL/* server-side.
 *
 * During SSR, the full URL is used instead.
 */
function resolveBaseUrl(): string {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return "/api";
  }
  const url = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  return url.replace(/\/+$/, "");
}

const API_BASE_URL = resolveBaseUrl();

// ---------------------------------------------------------------------------
// API Response Types — mirror backend/api/models/documents.py
// ---------------------------------------------------------------------------

/** Single item in the paginated document list. */
export interface DocumentSummary {
  id: string;
  original_filename: string;
  status: string;
  created_at: string;
}

/** Full document metadata returned by GET /documents/{id}. */
export interface DocumentDetail {
  id: string;
  original_filename: string;
  doc_type: string | null;
  status: string;
  error_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** Single clause in the GET /documents/{id}/clauses response. */
export interface ClauseResponse {
  id: string;
  sequence_number: number;
  original_text: string;
  simplified_text: string;
}

/** Paginated list response. */
export interface PaginatedDocuments {
  items: DocumentSummary[];
  total: number;
  limit: number;
  offset: number;
}

/** Response body for POST /documents (201 Created). */
export interface CreateDocumentResponse {
  document_id: string;
  upload_url: string;
}

// ---------------------------------------------------------------------------
// Error Types & Type Guards
// ---------------------------------------------------------------------------

/** Shape 1: ApiError subclasses from the backend exception handler. */
interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

/** Shape 2: FastAPI/Pydantic validation errors (422). */
interface ValidationDetailItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}

interface ValidationErrorBody {
  detail: ValidationDetailItem[];
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as ApiErrorBody).error === "object" &&
    (body as ApiErrorBody).error !== null &&
    typeof (body as ApiErrorBody).error.code === "string" &&
    typeof (body as ApiErrorBody).error.message === "string"
  );
}

function isValidationErrorBody(body: unknown): body is ValidationErrorBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "detail" in body &&
    Array.isArray((body as ValidationErrorBody).detail)
  );
}

// ---------------------------------------------------------------------------
// ApiClientError — the single error type callers catch
// ---------------------------------------------------------------------------

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

// ---------------------------------------------------------------------------
// Core: apiFetch<T>
// ---------------------------------------------------------------------------

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  skipContentType?: boolean;
}

/**
 * Central fetch wrapper for all API calls.
 *
 * - Prepends VITE_API_URL
 * - Attaches Authorization: Bearer <idToken>
 * - On 401: signs out + redirects to /
 * - On other errors: parses body, throws ApiClientError
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { method = "GET", body, skipContentType = false } = options;

  const token = await getIdToken();
  const headers: Record<string, string> = {};

  // No valid token → session expired
  if (!token) {
    await signOut();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    throw new ApiClientError(
      "Your session has expired. Please sign in again.",
      401,
      "Unauthenticated",
    );
  }

  headers["Authorization"] = `Bearer ${token}`;

  if (!skipContentType && body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : null,
  });

  // --- Handle errors ---
  if (!response.ok) {
    // 401 → sign out + redirect
    if (response.status === 401) {
      await signOut();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      throw new ApiClientError(
        "Your session has expired. Please sign in again.",
        401,
        "Unauthenticated",
      );
    }

    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      throw new ApiClientError(
        `Request failed (${response.status.toString()})`,
        response.status,
      );
    }

    if (isApiErrorBody(errorBody)) {
      throw new ApiClientError(
        errorBody.error.message,
        response.status,
        errorBody.error.code,
      );
    }

    if (isValidationErrorBody(errorBody)) {
      const messages = errorBody.detail.map((d) => d.msg);
      throw new ApiClientError(
        messages.join("; "),
        response.status,
        "ValidationError",
      );
    }

    throw new ApiClientError(
      `Request failed (${response.status.toString()})`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Typed wrapper functions
// ---------------------------------------------------------------------------

/** GET /documents — paginated list of the current user's documents. */
export async function listDocuments(
  limit = 20,
  offset = 0,
): Promise<PaginatedDocuments> {
  return apiFetch<PaginatedDocuments>(
    `/documents?limit=${limit.toString()}&offset=${offset.toString()}`,
  );
}

/** GET /documents/{id} — full document metadata and status. */
export async function getDocument(id: string): Promise<DocumentDetail> {
  return apiFetch<DocumentDetail>(`/documents/${id}`);
}

/** GET /documents/{id}/clauses — simplified clauses for a completed document. */
export async function getClauses(id: string): Promise<ClauseResponse[]> {
  return apiFetch<ClauseResponse[]>(`/documents/${id}/clauses`);
}

/** POST /documents — create a document record and get a presigned upload URL. */
export async function createDocument(
  originalFilename: string,
  contentType: string,
): Promise<CreateDocumentResponse> {
  return apiFetch<CreateDocumentResponse>("/documents", {
    method: "POST",
    body: {
      original_filename: originalFilename,
      content_type: contentType,
    },
  });
}

// ---------------------------------------------------------------------------
// S3 Upload (direct PUT to presigned URL — not routed through the API)
// ---------------------------------------------------------------------------

/**
 * Upload a file directly to S3 using the presigned PUT URL returned
 * by createDocument(). The file is sent as the raw request body with
 * the correct Content-Type — no multipart form encoding.
 */
export async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
  } catch (err: unknown) {
    // fetch only throws here when the browser blocked it (CORS) or the network failed
    console.error("S3 request blocked or failed:", err);
    throw new Error(
      "Could not reach S3 (likely a CORS or bucket setting). Check the browser console.",
    );
  }

  if (!response.ok) {
    const body = await response.text();
    console.error("S3 error response:", response.status, body);
    throw new Error(
      `S3 upload failed (${response.status.toString()}): ${body.slice(0, 200)}`,
    );
  }
}
