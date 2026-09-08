import React, { useState, useRef, useEffect } from "react";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export default function MultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "Select options...",
  error,
  disabled = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleOption = (value: string) => {
    if (disabled) return;
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleRemoveValue = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(selectedValues.filter((v) => v !== value));
  };

  return (
    <div className="w-full text-left" ref={containerRef}>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        {label}
      </label>
      
      <div className="relative">
        {/* Input trigger area */}
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`min-h-[46px] w-full bg-white border ${
            error
              ? "border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-500"
              : "border-slate-200 focus-within:border-brand-primary focus-within:ring-brand-primary"
          } rounded-xl px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-pointer transition-all duration-200 focus-within:ring-1 ${
            disabled ? "bg-slate-100 cursor-not-allowed opacity-75" : ""
          }`}
        >
          {selectedValues.length === 0 ? (
            <span className="text-sm text-slate-400 px-1">{placeholder}</span>
          ) : (
            selectedValues.map((val) => {
              const matchedOption = options.find((opt) => opt.value === val);
              const displayLabel = matchedOption ? matchedOption.label : val;
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors"
                >
                  {displayLabel}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveValue(e, val)}
                      className="text-slate-400 hover:text-rose-500 focus:outline-none transition-colors"
                    >
                      &times;
                    </button>
                  )}
                </span>
              );
            })
          )}

          {/* Indicator icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>

        {/* Dropdown Options */}
        {isOpen && !disabled && (
          <div className="absolute z-30 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {options.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => handleToggleOption(opt.value)}
                  className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-brand-primary/10 text-brand-primary font-bold"
                      : "hover:bg-slate-50 text-slate-700 font-medium"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
