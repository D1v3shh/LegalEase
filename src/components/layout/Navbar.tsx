import { Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { signOut } from "@/lib/auth";

export function Navbar({ showUpload = true }: { showUpload?: boolean }) {
  async function handleSignOut() {
    await signOut();
    // Hard reload clears all in-memory state (Amplify session, React Query cache)
    window.location.href = "/";
  }

  return (
    <header className="border-b border-rule bg-paper-raised">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4">
        <Link to="/dashboard" className="min-w-0">
          <span className="truncate font-display text-base font-semibold tracking-tight">
            LegalEase
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-2">
          {showUpload && (
            <Link
              to="/upload"
              className="rounded-md bg-ink px-3.5 py-2 font-mono text-2xs uppercase tracking-wide text-paper transition-colors hover:bg-ink/90"
            >
              + Upload
            </Link>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-rule px-3 py-2 font-mono text-2xs uppercase tracking-wide text-muted-foreground hover:bg-secondary"
          >
            Sign out
          </button>
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full border border-rule bg-paper text-muted-foreground"
            title="Profile"
            aria-label="Profile"
          >
            <UserRound aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </span>
        </nav>
      </div>
    </header>
  );
}
