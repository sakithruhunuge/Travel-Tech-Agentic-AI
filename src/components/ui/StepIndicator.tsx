import React from "react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full py-4">
      {/* Visual Step Progress Bar */}
      <div className="flex items-center justify-between relative max-w-xl mx-auto">
        {/* Progress Line Background */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full" />
        
        {/* Active Progress Line */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-primary -z-10 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;

          return (
            <div key={idx} className="flex flex-col items-center relative">
              {/* Step Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm border-2 transition-all duration-300 shadow-md ${
                  isCompleted
                    ? "bg-brand-primary border-brand-primary text-white scale-100"
                    : isActive
                    ? "bg-white border-brand-primary text-brand-primary scale-110 ring-4 ring-brand-primary/20"
                    : "bg-white border-slate-200 text-slate-400 scale-95"
                }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5 animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              {/* Step Label */}
              <span
                className={`absolute top-12 whitespace-nowrap text-xxs sm:text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                  isActive ? "text-brand-primary" : isCompleted ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-8" /> {/* Spacer for labels */}
    </div>
  );
}
