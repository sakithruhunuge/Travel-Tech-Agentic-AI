"use client";

import React, { Suspense } from "react";
import ItineraryGenerator from "@/components/ItineraryGenerator";

export default function PlanPage() {
  return (
    <main className="min-h-screen bg-gradient-to-tr from-sky-50 via-slate-50 to-indigo-50 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col justify-center">
      {/* Ambient backgrounds */}
      <div className="absolute top-[-10%] left-[-15%] w-[500px] h-[500px] bg-sky-100 rounded-full blur-3xl opacity-60 -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[600px] h-[600px] bg-indigo-100 rounded-full blur-3xl opacity-60 -z-10 pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full relative z-10">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12 text-slate-500 font-medium">
              Loading AI Travel Planner...
            </div>
          }
        >
          <ItineraryGenerator />
        </Suspense>
      </div>
    </main>
  );
}
