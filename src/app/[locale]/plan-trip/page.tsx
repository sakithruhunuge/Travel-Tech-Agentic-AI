"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTravelRequest } from "@/context/TravelRequestContext";
import TravelRequestAntD from "@/components/TravelRequestAntD";

function PlanTripContent() {
  const searchParams = useSearchParams();
  const pkgParam = searchParams.get("package");
  const { isDraftLoaded, formData, selectPackageById } = useTravelRequest();

  // 1. Prefill package if passed via query params
  useEffect(() => {
    if (isDraftLoaded && pkgParam && formData.packageId !== pkgParam) {
      selectPackageById(pkgParam);
    }
  }, [pkgParam, isDraftLoaded, formData.packageId, selectPackageById]);

  if (!isDraftLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-brand-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm font-semibold text-slate-500">Loading form state...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-tr from-sky-50 via-slate-50 to-indigo-50 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col justify-center">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-15%] w-[500px] h-[500px] bg-sky-100 rounded-full blur-3xl opacity-65 -z-10" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[600px] h-[600px] bg-indigo-50 rounded-full blur-3xl opacity-75 -z-10" />

      <div className="max-w-6xl mx-auto w-full space-y-8 bg-white/80 backdrop-blur-md p-6 sm:p-10 rounded-[32px] border border-white/50 shadow-xl relative z-10">
        <TravelRequestAntD isModal={false} />
      </div>
    </main>
  );
}

export default function PlanTripPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-brand-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm font-semibold text-slate-500">Loading travel planner...</p>
        </div>
      </div>
    }>
      <PlanTripContent />
    </Suspense>
  );
}
