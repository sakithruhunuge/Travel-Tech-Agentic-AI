import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function Input({ label, error, id, className = "", ...props }: InputProps) {
  return (
    <div className="w-full text-left">
      <label htmlFor={id} className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        {label}
      </label>
      <input
        id={id}
        className={`w-full bg-white border ${
          error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500" : "border-slate-200 focus:border-brand-primary focus:ring-brand-primary"
        } rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-1 transition-all duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs font-semibold text-rose-500 flex items-center gap-1 animate-fade-in">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
