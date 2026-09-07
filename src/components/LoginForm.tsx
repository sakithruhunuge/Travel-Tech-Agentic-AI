"use client";

import { useState } from "react";
import { signIn, SignInResponse } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";

/**
 * LoginForm
 *
 * Behavior summary for `restoreForm` flow:
 * - If `restoreForm=true` and a valid `callbackUrl` is provided, redirect there after login.
 * - If `restoreForm=true` and no valid `callbackUrl` is provided, redirect to a default
 *   form page (`/checkout` by default).
 * - If `restoreForm` is false or not present, attempt to redirect to `callbackUrl` (if valid),
 *   otherwise fallback to `/dashboard`.
 *
 * State preservation:
 * - Form pages which redirect users to login with `restoreForm=true` should save any necessary
 *   unsaved form state to `sessionStorage` under `pendingFormState` (JSON string). When the user
 *   returns after login, this component will append `formState` to the redirect URL if present.
 * - This avoids embedding potentially large or sensitive data in query strings; it's still the
 *   integrator's responsibility to implement the saving on the form page.
 */

export default function LoginForm(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Raw values from URL. Don't default early — we need to decide fallbacks based on restoreForm.
  const rawCallback = searchParams.get("callbackUrl");
  const restoreForm = searchParams.get("restoreForm") === "true";
  const rawFormState = searchParams.get("formState");
  const { addToast } = useToast();

  const DEFAULT_FORM_URL = "/plan-trip"; // default page to restore incomplete forms to
  const DEFAULT_FALLBACK = "/dashboard"; // fallback when not restoring a form

  // Only allow relative URLs to prevent open-redirect vulnerabilities. Adjust policy as needed.
  const isValidRedirectUrl = (u: string): boolean => {
    // Accept absolute same-origin URLs or relative paths that begin with '/'
    try {
      // If it starts with '/', treat as relative and valid
      if (u.startsWith("/")) return true;
      // Otherwise, attempt to parse and ensure it is same origin (optional)
      const parsed = new URL(u);
      // Replace with your app origin if you want to strictly allow same-origin only
      return parsed.origin === window.location.origin;
    } catch {
      return false;
    }
  };

  const buildRedirectUrl = (base: string, formState?: string | null) => {
    if (!formState) return base;
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}formState=${encodeURIComponent(formState)}`;
  };

  // Compute signup link preserving redirect params when appropriate
  const signupHref = (() => {
    const params: string[] = [];
    if (rawCallback && isValidRedirectUrl(rawCallback)) params.push(`callbackUrl=${encodeURIComponent(rawCallback)}`);
    if (restoreForm) params.push(`restoreForm=true`);
    if (rawFormState) params.push(`formState=${encodeURIComponent(rawFormState)}`);
    return `/signup${params.length ? `?${params.join("&")}` : ""}`;
  })();

  const handleCredentialsSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res: SignInResponse | undefined = (await signIn("credentials", {
        redirect: false,
        email,
        password,
      })) as SignInResponse | undefined;

      if (res?.error) {
        setError(res.error || "Invalid email or password");
        setIsLoading(false);
        return;
      }

      // Determine any preserved form state (from URL param or sessionStorage).
      // Integrations should write pending form state to sessionStorage under `pendingFormState`.
      const preservedFormState = rawFormState || sessionStorage.getItem("pendingFormState");

      // Decide redirect target according to restoreForm flag and callback validity.
      let callbackUrl = rawCallback && isValidRedirectUrl(rawCallback) ? rawCallback : null;
      if (restoreForm && (!callbackUrl || callbackUrl === "/dashboard" || callbackUrl === "/login" || callbackUrl === "/signup")) {
        callbackUrl = DEFAULT_FORM_URL;
      }

      let targetUrl: string;
      if (email.toLowerCase().trim() === "admin@travelcompany.com" && !rawCallback) {
        targetUrl = "/en/admin";
      } else if (restoreForm) {
        // When restoring a form, prefer the provided callbackUrl, else fall back to DEFAULT_FORM_URL
        targetUrl = buildRedirectUrl(callbackUrl || DEFAULT_FORM_URL, preservedFormState);
      } else {
        // Not restoring: go to callback if valid, otherwise dashboard
        targetUrl = callbackUrl ? buildRedirectUrl(callbackUrl, null) : DEFAULT_FALLBACK;
      }

      // Clean up any saved pending state after consuming it.
      if (sessionStorage.getItem("pendingFormState")) sessionStorage.removeItem("pendingFormState");

      router.push(targetUrl);
      router.refresh();
    } catch {
      addToast("error", "An unexpected error occurred. Please try again.");
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleCredentialsSignIn} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-600 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium rounded-lg transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </button>

      <div className="text-center">
        <a href={signupHref} className="text-sm text-brand-primary hover:text-brand-primary/80 font-medium">
          Don&apos;t have an account? Sign up
        </a>
      </div>
    </form>
  );
}
