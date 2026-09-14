"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";

export default function GoogleButton() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const restoreForm = searchParams.get("restoreForm") === "true";
      let callbackUrl = searchParams.get("callbackUrl") || (restoreForm ? "/plan-trip" : "/dashboard");
      if (restoreForm && (callbackUrl === "/dashboard" || callbackUrl === "/login" || callbackUrl === "/signup")) {
        callbackUrl = "/plan-trip";
      }
      if (callbackUrl.startsWith("/")) {
        callbackUrl = `${window.location.origin}${callbackUrl}`;
      }

      // Check if we are on a subdomain to handle Google Redirect URI restrictions
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : "";
      const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || "travelcompany.com";
      
      const isLocalhostSubdomain = hostname.endsWith(".localhost");
      const isProdSubdomain = hostname !== mainDomain && hostname.endsWith("." + mainDomain);
      const isSubdomain = isLocalhostSubdomain || isProdSubdomain;

      if (isSubdomain) {
        // Resolve the base main domain URL (http://localhost:3000 or https://travelcompany.com)
        const targetBase = isLocalhostSubdomain
          ? `http://localhost${port}`
          : `https://${mainDomain}`;
        
        // NextAuth callback URL on the main domain points to the session-transfer page,
        // which will forward the token to the subdomain session-sync endpoint.
        const sessionTransferUrl = `${targetBase}/api/auth/session-transfer?target=${encodeURIComponent(callbackUrl)}`;
        
        // Redirect to the main domain's login page with triggerGoogle parameter
        window.location.href = `${targetBase}/login?callbackUrl=${encodeURIComponent(sessionTransferUrl)}&triggerGoogle=true`;
      } else {
        await signIn("google", { callbackUrl });
      }
    } catch {
      addToast("error", "Sign-in failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Connecting...
        </>
      ) : (
        <>
          <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </>
      )}
    </button>
  );
}
