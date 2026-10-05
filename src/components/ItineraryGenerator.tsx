"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface FormData {
  destination: string;
  travelDates: string;
  durationDays: number;
  budgetUsd: number;
  partySize: number;
  interests: string[];
  customVibe: string;
}

interface ItineraryResponse {
  itinerary: string;
  hotels: Array<Record<string, any>>;
  pois: Array<Record<string, any>>;
  estimated_total_usd: number;
  budget_warning: boolean;
  reasoning: Record<string, any>;
  agent_timings: Record<string, number>;
}

const INTEREST_OPTIONS = [
  "Historical 🏛️",
  "Nature 🌿",
  "Beach 🏖️",
  "Adventure 🧗",
  "Urban 🌆",
  "Food 🍜",
  "Photography 📷",
];

const AGENT_STEPS = [
  { step: 1, label: "🧠 Analyzing your preferences...", agent: "Agent 1 — NLP Triage" },
  { step: 2, label: "🔍 Searching Sri Lanka database...", agent: "Agent 2 — IR Search" },
  { step: 3, label: "⚖️ Personalizing for your budget...", agent: "Agent 3 — Curator" },
  { step: 4, label: "✍️ Crafting your itinerary...", agent: "Agent 4 — Guide" },
];

export default function ItineraryGenerator() {
  const { data: session, status } = useSession();

  const [formData, setFormData] = useState<FormData>({
    destination: "Galle",
    travelDates: "December 10-15, 2026",
    durationDays: 5,
    budgetUsd: 500,
    partySize: 2,
    interests: ["Beach 🏖️", "Historical 🏛️"],
    customVibe: "Quiet boutique hotel near the beach with pool, authentic seafood, minimal walking",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<ItineraryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Interval timer for 4-step progress animation
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      setCurrentStep(1);
      stepTimerRef.current = setInterval(() => {
        setCurrentStep((prev) => (prev < 4 ? prev + 1 : 4));
      }, 3000);
    } else {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
        stepTimerRef.current = null;
      }
    }
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, [isLoading]);

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(interest);
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((i) => i !== interest)
          : [...prev.interests, interest],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSaveStatus("idle");
    setSaveMessage(null);

    if (status === "unauthenticated") {
      signIn();
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        destination: formData.destination,
        travel_dates: formData.travelDates,
        duration_days: formData.durationDays,
        budget_usd: formData.budgetUsd,
        party_size: formData.partySize,
        interests: formData.interests,
        custom_vibe: formData.customVibe,
      };

      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.detail || "Failed to generate itinerary.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItinerary = async () => {
    if (!result || !session?.user) return;
    setSaveStatus("saving");

    try {
      const user = session.user as any;
      const agentApiUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";
      const saveEndpoint = `${agentApiUrl.replace(/\/+$/, "")}/api/v1/save-itinerary`;

      const payload = {
        user_id: user.id || user.email || "guest",
        itinerary: result.itinerary,
        destination: formData.destination,
        duration_days: formData.durationDays,
        estimated_total_usd: result.estimated_total_usd,
        hotels: result.hotels || [],
        pois: result.pois || [],
      };

      const res = await fetch(saveEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to save itinerary to database.");
      }

      setSaveStatus("saved");
      setSaveMessage("Itinerary saved successfully to your travel dashboard!");
    } catch (err: any) {
      setSaveStatus("error");
      setSaveMessage(err.message || "Unable to save itinerary.");
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-300/30 text-sky-800 text-xs font-semibold tracking-wide">
          ✨ Powered by 4 Autonomous AI Agents
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
          Personalized Sri Lanka <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">Travel Planner</span>
        </h1>
        <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
          Our intelligent multi-agent system combs through geospatial Sri Lankan data to curate custom lodging, curated activities, and tailored schedules fitted to your budget.
        </p>
      </div>

      {/* Main Form Box */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-3xl p-6 sm:p-10 transition-all">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Destination */}
            <div>
              <label htmlFor="destination-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Destination in Sri Lanka
              </label>
              <input
                id="destination-input"
                type="text"
                required
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="Galle, Kandy, Ella, Sigiriya..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800 text-sm shadow-sm transition"
              />
            </div>

            {/* Travel Dates */}
            <div>
              <label htmlFor="travel-dates-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Travel Dates
              </label>
              <input
                id="travel-dates-input"
                type="text"
                required
                value={formData.travelDates}
                onChange={(e) => setFormData({ ...formData, travelDates: e.target.value })}
                placeholder="December 10-15, 2026"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800 text-sm shadow-sm transition"
              />
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="duration-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Duration (Days: 1 – 30)
              </label>
              <input
                id="duration-input"
                type="number"
                min={1}
                max={30}
                required
                value={formData.durationDays}
                onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800 text-sm shadow-sm transition"
              />
            </div>

            {/* Party Size */}
            <div>
              <label htmlFor="party-size-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Party Size (1 – 20 Travelers)
              </label>
              <input
                id="party-size-input"
                type="number"
                min={1}
                max={20}
                required
                value={formData.partySize}
                onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800 text-sm shadow-sm transition"
              />
            </div>
          </div>

          {/* Budget Range Slider */}
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="budget-slider" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Total Budget (USD)
              </label>
              <span className="text-lg font-bold text-sky-600">
                ${formData.budgetUsd}
              </span>
            </div>
            <input
              id="budget-slider"
              type="range"
              min={100}
              max={3000}
              step={25}
              value={formData.budgetUsd}
              onChange={(e) => setFormData({ ...formData, budgetUsd: parseInt(e.target.value) || 100 })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-medium">
              <span>$100 (Backpacker)</span>
              <span>$1,500 (Comfort)</span>
              <span>$3,000+ (Luxury)</span>
            </div>
          </div>

          {/* Interests Checkbox Grid */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Interests & Themes
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {INTEREST_OPTIONS.map((interest) => {
                const checked = formData.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => handleInterestToggle(interest)}
                    className={`flex items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                      checked
                        ? "bg-sky-50 border-sky-400 text-sky-800 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{interest}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Vibe */}
          <div>
            <label htmlFor="custom-vibe-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Custom Vibe & Special Requests
            </label>
            <textarea
              id="custom-vibe-input"
              rows={3}
              value={formData.customVibe}
              onChange={(e) => setFormData({ ...formData, customVibe: e.target.value })}
              placeholder="Describe your ideal trip... e.g. quiet boutique hotel near the beach with pool, authentic seafood, minimal walking"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800 text-sm shadow-sm transition"
            />
          </div>

          {/* Submit Button */}
          <button
            id="generate-itinerary-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-600/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isLoading ? "🤖 Multi-Agent Pipeline Running..." : "🚀 Generate My Custom Itinerary"}
          </button>
        </form>
      </div>

      {/* Progress Indicator Card */}
      {isLoading && (
        <div className="bg-white/95 backdrop-blur-xl border border-sky-100 rounded-3xl p-8 shadow-xl space-y-6 animate-pulse">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-slate-800">
              Autonomous Agent Orchestration in Progress
            </h3>
            <p className="text-xs text-slate-500">
              Coordinating NLP extraction, MongoDB geospatial query, budget scoring, and Markdown synthesis...
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AGENT_STEPS.map((s) => {
              const isActive = currentStep === s.step;
              const isDone = currentStep > s.step;
              return (
                <div
                  key={s.step}
                  className={`p-4 rounded-2xl border transition-all duration-300 ${
                    isActive
                      ? "bg-sky-50/80 border-sky-400 shadow-md ring-2 ring-sky-300/50"
                      : isDone
                      ? "bg-emerald-50/60 border-emerald-300 opacity-90"
                      : "bg-slate-50/60 border-slate-200 opacity-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Step {s.step}
                    </span>
                    <span>
                      {isDone ? "✅" : isActive ? "⚡" : "⏳"}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">
                    {s.agent}
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Card */}
      {error && !isLoading && (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 shadow-sm space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>⚠️</span> Generation Encountered An Error
          </div>
          <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Result Display */}
      {result && !isLoading && (
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          {/* Agent Timing Breakdown */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">⚡ Execution Telemetry:</span>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              {result.agent_timings && Object.entries(result.agent_timings).map(([key, val]) => (
                <span key={key} className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">
                  {key.replace("_s", "")}: <strong className="text-sky-700">{val}s</strong>
                </span>
              ))}
            </div>
          </div>

          {/* Budget Warning Banner if cost exceeds budget */}
          {result.budget_warning && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-sm">
              <span className="text-xl">⚠️</span>
              <div className="space-y-1 text-xs">
                <strong className="block text-sm font-semibold">Budget Notice</strong>
                The selected hotels and high-demand activities slightly exceed your target budget (${formData.budgetUsd}). The total estimated cost is ${Math.round(result.estimated_total_usd)}. Review the daily options below for budget alternatives.
              </div>
            </div>
          )}

          {/* Top Recommendations Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100">
              <span className="text-xs text-sky-700 font-semibold block">Estimated Total</span>
              <span className="text-2xl font-extrabold text-sky-900">
                ${Math.round(result.estimated_total_usd)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
              <span className="text-xs text-indigo-700 font-semibold block">Curated Hotels</span>
              <span className="text-2xl font-extrabold text-indigo-900">
                {result.hotels?.length || 0} Recommended
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-xs text-emerald-700 font-semibold block">Tailored POIs</span>
              <span className="text-2xl font-extrabold text-emerald-900">
                {result.pois?.length || 0} Attractions
              </span>
            </div>
          </div>

          {/* Markdown Content */}
          <div className="prose prose-slate max-w-none bg-slate-50/60 p-6 sm:p-8 rounded-2xl border border-slate-100/80">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {result.itinerary}
            </ReactMarkdown>
          </div>

          {/* Save Status Banner */}
          {saveMessage && (
            <div
              className={`p-4 rounded-xl text-xs font-semibold ${
                saveStatus === "saved"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              {saveStatus === "saved" ? "✅ " : "❌ "}
              {saveMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              ↑ Back to top
            </button>

            <button
              id="save-itinerary-btn"
              type="button"
              onClick={handleSaveItinerary}
              disabled={saveStatus === "saving" || saveStatus === "saved"}
              className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition shadow-md flex items-center gap-2"
            >
              <span>{saveStatus === "saving" ? "💾 Saving..." : saveStatus === "saved" ? "✅ Saved" : "💾 Save Itinerary"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
