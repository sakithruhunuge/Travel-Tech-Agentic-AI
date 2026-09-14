"use client";

import { useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SignupForm from "@/components/SignupForm";
import GoogleButton from "@/components/GoogleButton";

function SignupContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restoreForm = searchParams.get("restoreForm") === "true";

  let callbackUrl = searchParams.get("callbackUrl") || (restoreForm ? "/plan-trip" : "/dashboard");
  if (restoreForm && (callbackUrl === "/dashboard" || callbackUrl === "/login" || callbackUrl === "/signup")) {
    callbackUrl = "/plan-trip";
  }

  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-sky-100 via-slate-50 to-indigo-50">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-brand-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm font-semibold text-slate-500">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-stretch bg-white">
      <div className="w-full grid grid-cols-1 lg:grid-cols-2">
        {/* Left side - Mountain/Landscape Image */}
        <section className="hidden lg:flex relative overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/sigiriya.png"
              alt="Mountain landscape"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
          <div className="relative z-10 flex flex-col justify-end p-12 text-white h-full w-full">
            <h1 className="text-4xl font-bold mb-4">Explore Sri Lanka</h1>
            <p className="text-lg opacity-90 max-w-md">
              Discover ancient wonders, misty mountains, and pristine beaches. Your adventure begins here.
            </p>
          </div>
        </section>

        {/* Right side - Signup Form */}
        <section className="flex items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-md space-y-8">
            {status === "authenticated" ? (
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto text-brand-primary">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Already Signed In</h2>
                  <p className="text-sm text-slate-500">You have an active secure session.</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4 text-left">
                  {session?.user?.image ? (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border border-slate-200">
                      <Image
                        src={session.user.image}
                        alt={session.user.name || "User image"}
                        fill
                        className="object-cover"
                        sizes="48px"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-brand-primary/10 border border-slate-200 flex items-center justify-center font-bold text-brand-primary uppercase text-lg">
                      {session?.user?.name ? session.user.name[0] : "U"}
                    </div>
                  )}
                  <div>
                    <span className="block text-sm font-semibold text-slate-900">{session?.user?.name}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{session?.user?.email}</span>
                  </div>
                </div>

                <button
                  onClick={() => router.push(callbackUrl)}
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold rounded-lg transition-colors"
                >
                  Proceed
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-slate-900">Create Account</h1>
                  <p className="text-slate-500">Join us to plan your next adventure</p>
                </div>

                <SignupForm />

                <div className="flex items-center my-4">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="mx-4 text-sm text-slate-400">or</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <GoogleButton />

                <div className="text-center pt-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-primary transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to home page
                  </Link>
                </div>

                <div className="text-center pt-2">
                  <p className="text-sm text-slate-500">
                    Already have an account?{" "}
                    <Link
                      href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}${restoreForm ? "&restoreForm=true" : ""}`}
                      className="font-semibold text-brand-primary hover:text-brand-primary/90"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center space-y-4">
            <svg className="animate-spin h-10 w-10 text-brand-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm font-semibold text-slate-500">Loading...</p>
          </div>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
