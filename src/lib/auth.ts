/**
 * Cognito auth wrapper using AWS Amplify v6 (modular imports).
 *
 * Configures Amplify for the Cognito User Pool defined by VITE_
 * environment variables. All auth state is managed by Amplify internally;
 * this module exposes typed wrapper functions for the rest of the app.
 *
 * The configure() call runs at module load time (i.e., once at app
 * startup), which is the recommended pattern for Amplify v6.
 */

import { Amplify } from "aws-amplify";
import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  signOut as amplifySignOut,
  confirmSignUp as amplifyConfirmSignUp,
  fetchAuthSession,
  getCurrentUser as amplifyGetCurrentUser,
} from "aws-amplify/auth";

// ---------------------------------------------------------------------------
// Amplify configuration — runs once at module import time.
// Uses VITE_ env vars so they're available client-side in Vite.
//
// Only configure in the browser — Amplify relies on localStorage which
// doesn't exist during SSR. Calling configure() on the server is harmless
// but auth functions will always return "unauthenticated", which
// incorrectly triggers route guards during server-side rendering.
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? "",
        userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? "",
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Typed wrapper functions
// ---------------------------------------------------------------------------

/** Sign in with email + password (SRP flow, no client secret). */
export async function signIn(email: string, password: string): Promise<void> {
  await amplifySignIn({ username: email, password });
}

/** Create a new account. Cognito sends a verification code to the email. */
export async function signUp(
  email: string,
  password: string,
  name: string,
): Promise<void> {
  await amplifySignUp({
    username: email,
    password,
    options: { userAttributes: { email, name } },
  });
}

/** Confirm sign-up with the verification code sent to the user's email. */
export async function confirmSignUp(
  email: string,
  code: string,
): Promise<void> {
  await amplifyConfirmSignUp({
    username: email,
    confirmationCode: code,
  });
}

/** Sign out the current user (clears local session). */
export async function signOut(): Promise<void> {
  await amplifySignOut();
}

/**
 * Get the current valid ID token string, or null if unauthenticated.
 *
 * This is what lib/api.ts calls to attach the Authorization header.
 * Amplify handles token refresh automatically when the session is
 * retrieved via fetchAuthSession().
 *
 * Returns null during SSR — tokens are only available in the browser.
 */
export async function getIdToken(): Promise<string | null> {
  // No localStorage on the server → no tokens to retrieve
  if (typeof window === "undefined") return null;

  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

/**
 * Check whether a user is currently signed in.
 * Returns the user's username/sub if signed in, or null otherwise.
 *
 * Returns null during SSR — auth state is only available in the browser.
 */
export async function getCurrentUser(): Promise<string | null> {
  // No localStorage on the server → can't check auth state
  if (typeof window === "undefined") return null;

  try {
    const user = await amplifyGetCurrentUser();
    return user.username;
  } catch {
    return null;
  }
}
