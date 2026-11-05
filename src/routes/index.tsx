import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { signIn, signUp, confirmSignUp, getCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — LegalEase" },
      {
        name: "description",
        content:
          "Sign in to LegalEase to upload a lease, NDA, or contract and read it clause by clause in plain language.",
      },
      { property: "og:title", content: "Sign in — LegalEase" },
      {
        property: "og:description",
        content: "Read any legal document clause by clause, in plain language.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  // If already signed in, redirect to dashboard
  beforeLoad: async () => {
    if (typeof window === "undefined") return; // skip auth check during SSR
    const user = await getCurrentUser();
    if (user) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "confirm">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "in") {
        await signIn(email, password);
        navigate({ to: "/dashboard" });
      } else if (mode === "up") {
        if (password !== confirmPassword) {
          setError("Passwords do not match. Please try again.");
          setLoading(false);
          return;
        }
        await signUp(email, password, name);
        // After sign-up, Cognito sends a verification code
        setMode("confirm");
      } else if (mode === "confirm") {
        await confirmSignUp(email, confirmCode);
        // After confirmation, sign in automatically
        await signIn(email, password);
        navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-lg font-semibold tracking-tight">
          LegalEase
        </h1>
        <form
          className="mt-6 rounded-md border border-rule bg-paper-raised p-6"
          onSubmit={handleSubmit}
        >
          <p className="font-mono text-2xs uppercase tracking-wide text-muted-foreground">
            {mode === "in"
              ? "Sign in"
              : mode === "up"
                ? "Create account"
                : "Verify your email"}
          </p>

          {mode === "confirm" ? (
            <>
              <p className="mt-3 text-xs text-muted-foreground">
                We sent a verification code to <strong>{email}</strong>. Enter
                it below.
              </p>
              <label
                className="mt-5 block text-xs font-medium"
                htmlFor="confirm-code"
              >
                Verification code
              </label>
              <input
                id="confirm-code"
                type="text"
                required
                autoComplete="one-time-code"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-rule bg-paper px-3 py-2 text-xs"
              />
            </>
          ) : (
            <>
              {mode === "up" && (
                <>
                  <label
                    className="mt-5 block text-xs font-medium"
                    htmlFor="name"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    maxLength={100}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-rule bg-paper px-3 py-2 text-xs"
                  />
                </>
              )}

              <label className="mt-5 block text-xs font-medium" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                maxLength={255}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-rule bg-paper px-3 py-2 text-xs"
              />

              <label
                className="mt-4 block text-xs font-medium"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                maxLength={128}
                autoComplete={
                  mode === "in" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="mt-1.5 w-full rounded-md border border-rule bg-paper px-3 py-2 text-xs"
              />

              {mode === "up" && (
                <>
                  <label
                    className="mt-4 block text-xs font-medium"
                    htmlFor="confirm-password"
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={6}
                    maxLength={128}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                    }}
                    className="mt-1.5 w-full rounded-md border border-rule bg-paper px-3 py-2 text-xs"
                  />
                </>
              )}
            </>
          )}

          {error && (
            <p role="alert" className="mt-3 font-mono text-2xs text-flag">
              × {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-md bg-ink px-4 py-2.5 text-xs font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-50"
          >
            {loading
              ? "Please wait…"
              : mode === "in"
                ? "Sign in"
                : mode === "up"
                  ? "Create account"
                  : "Verify & sign in"}
          </button>

          {mode !== "confirm" && (
            <button
              type="button"
              onClick={() => {
                setMode(mode === "in" ? "up" : "in");
                setError("");
                setConfirmPassword("");
              }}
              className="mt-4 w-full font-mono text-2xs text-muted-foreground underline decoration-rule underline-offset-4 hover:text-ink"
            >
              {mode === "in"
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          )}
        </form>
      </div>
    </main>
  );
}
