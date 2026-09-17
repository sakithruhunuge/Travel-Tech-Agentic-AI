"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  calculateTripPricing,
  HOTEL_LABELS,
  TRANSPORT_LABELS,
  SEASON_LABELS,
  ACTIVITY_LABELS,
  DESTINATION_SURCHARGES,
  PricingInputs,
} from "@/lib/pricingEngine";
import { useToast } from "@/context/ToastContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useLocale } from "next-intl";
import {
  CheckOutlined,
  CalendarOutlined,
  TeamOutlined,
  CompassOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

const AVAILABLE_DESTINATIONS = [
  { id: "Sigiriya", name: "Sigiriya Rock", img: "/images/sigiriya.png", desc: "Climb the iconic sky-high rock fortress." },
  { id: "Galle", name: "Galle Fort", img: "/images/galle.png", desc: "Dutch colonial streets and ocean walls." },
  { id: "Ella", name: "Ella Nine Arch", img: "/images/nine_arch.png", desc: "Misty tea estates and green rail bridges." },
  { id: "Nuwara Eliya", name: "Nuwara Eliya", img: "/images/tea.png", desc: "Cool high country valleys & waterfalls." },
  { id: "Colombo", name: "Colombo Skyline", img: "/images/colombo.png", desc: "Bustling capital, shopping and culture." },
  { id: "Bentota", name: "Bentota Beach", img: "/images/bentota.png", desc: "Golden coastal shore and boat safaris." },
  { id: "Mirissa", name: "Mirissa Bay", img: "/images/mirissa.png", desc: "Whale watching and coconut hills." },
  { id: "Kandy", name: "Kandy Lake", img: "/images/kandy.png", desc: "Temple of the Tooth Relic & forest." },
  { id: "Yala", name: "Yala Safari", img: "/images/yala.png", desc: "Leopard jeep safaris in wild scrublands." },
  { id: "Dambulla", name: "Dambulla Caves", img: "/images/dambulla.png", desc: "Stunning ancient gilded cave temples." },
];

export default function PricingCalculatorPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const { formatPrice, currency } = useCurrency();
  const { addToast } = useToast();

  // 1. Calculator State Inputs
  const [inputs, setInputs] = useState<PricingInputs>({
    duration: 7,
    numberOfTravelers: 2,
    destinations: ["Sigiriya", "Ella"],
    hotelClass: "standard",
    transportMode: "private-driver",
    season: "shoulder",
    activities: [],
    extraNights: 0,
    addOns: [],
  });

  const [preferredStartDate, setPreferredStartDate] = useState<string>("");
  const [specialRequests, setSpecialRequests] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 2. Load draft from sessionStorage on mount (only once)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("pricing_calculator_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.inputs) setInputs(parsed.inputs);
        if (parsed.preferredStartDate) setPreferredStartDate(parsed.preferredStartDate);
        if (parsed.specialRequests) setSpecialRequests(parsed.specialRequests);
        // Clear immediately so it doesn't loop
        sessionStorage.removeItem("pricing_calculator_draft");
        addToast("success", "Restored your custom trip draft details.");
      }
    } catch (e) {
      console.warn("Failed to load pricing calculator draft:", e);
    }
  }, [addToast]);

  // 3. Dynamic Calculation updates on state change
  const breakdown = calculateTripPricing(inputs);

  // Toggle Destination selection
  const handleToggleDest = (destId: string) => {
    setInputs((prev) => {
      const exists = prev.destinations.includes(destId);
      const newDests = exists
        ? prev.destinations.filter((d) => d !== destId)
        : [...prev.destinations, destId];
      return { ...prev, destinations: newDests };
    });
  };

  // Toggle Activity selection
  const handleToggleActivity = (actId: string) => {
    setInputs((prev) => {
      const exists = prev.activities.includes(actId);
      const newActs = exists
        ? prev.activities.filter((a) => a !== actId)
        : [...prev.activities, actId];
      return { ...prev, activities: newActs };
    });
  };

  // Field validation
  const validateForm = () => {
    const tempErrors: Record<string, string> = {};
    if (inputs.destinations.length === 0) {
      tempErrors.destinations = "Please choose at least one destination for your trip.";
    }
    if (!preferredStartDate) {
      tempErrors.preferredStartDate = "Please select a preferred start date.";
    } else {
      const today = new Date().toISOString().split("T")[0];
      if (preferredStartDate < today) {
        tempErrors.preferredStartDate = "Start date must be in the future.";
      }
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // Handle submit / booking creation
  const handleBookTrip = async () => {
    if (!validateForm()) {
      addToast("error", "Please resolve the form validation requirements.");
      return;
    }

    // Authenticated state check
    if (sessionStatus !== "authenticated") {
      // Save draft details to sessionStorage
      try {
        sessionStorage.setItem(
          "pricing_calculator_draft",
          JSON.stringify({ inputs, preferredStartDate, specialRequests })
        );
      } catch (e) {
        console.warn("Failed to save draft state:", e);
      }

      // Redirect guest to login
      addToast("info", "Please log in to submit your custom travel request.");
      router.push(`/login?callbackUrl=/pricing-calculator`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        packageId: "",
        packageName: "Custom Multi-Destination Tour",
        numberOfTravelers: inputs.numberOfTravelers,
        preferredStartDate,
        specialRequests,
        pricingInputs: inputs,
        submittedTotal: breakdown.totalPrice,
      };

      const res = await fetch("/api/travel-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to submit pricing quote request.");
      }

      setSubmitSuccess(true);
      addToast("success", "Custom travel booking request saved successfully!");
    } catch (err) {
      console.error(err);
      addToast("error", err instanceof Error ? err.message : "Connection failure occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-xl space-y-6"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500/30 text-emerald-500 flex items-center justify-center text-3xl">
            <CheckOutlined />
          </div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">Request Received!</h2>
          <p className="text-slate-550 text-sm leading-relaxed">
            Your customized itinerary estimate is saved. Our local Ceylon agents will review your verified details and confirm within 24 hours.
          </p>
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
            <button
              onClick={() => router.push("/my-requests")}
              className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all"
            >
              View My Requests
            </button>
            <button
              onClick={() => setSubmitSuccess(false)}
              className="py-3 px-6 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-all"
            >
              Create Another Route
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-tr from-slate-50 via-sky-50/20 to-indigo-50/30 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12 text-left">
        
        {/* Header Block */}
        <div className="space-y-4">
          <span className="text-xs font-black uppercase tracking-widest text-brand-primary">
            Ceylon Route Builder
          </span>
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-none">
            Dynamic Pricing Estimator
          </h1>
          <p className="text-slate-600 text-base max-w-2xl font-medium">
            Plan your custom tour through Sri Lanka. Pick destinations, adjust accommodation levels, local logistics, and instantly verify travel costs.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_0.8fr] items-start">
          
          {/* Configurator Controls */}
          <div className="space-y-8">
            
            {/* 1. Destinations select */}
            <section className="bg-white/85 backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
                    <CompassOutlined className="text-brand-secondary" />
                    <span>1. Choose Dream Destinations</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    $100 surcharge per town per traveler covers premium tickets and local entry fees.
                  </p>
                </div>
                {errors.destinations && (
                  <span className="text-red-500 text-xs font-black">{errors.destinations}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {AVAILABLE_DESTINATIONS.map((dest) => {
                  const isSelected = inputs.destinations.includes(dest.id);
                  return (
                    <button
                      key={dest.id}
                      onClick={() => handleToggleDest(dest.id)}
                      className={`relative flex items-center gap-4 p-3 rounded-2xl border text-left hover:shadow-md transition-all duration-300 ${
                        isSelected
                          ? "border-brand-secondary bg-sky-50/40 shadow-sm"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                        <Image
                          src={dest.img}
                          alt={dest.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-grow pr-6">
                        <h4 className="text-sm font-bold text-slate-900">{dest.name}</h4>
                        <p className="text-[11px] text-slate-550 leading-tight mt-1">
                          {dest.desc}
                        </p>
                      </div>
                      <div
                        className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                          isSelected
                            ? "bg-brand-secondary text-white border-brand-secondary"
                            : "bg-white text-transparent border-slate-300"
                        }`}
                      >
                        <CheckOutlined />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. Duration and Travelers Slider */}
            <section className="bg-white/85 backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-slate-950 flex items-center gap-2 border-b border-slate-100 pb-4">
                <TeamOutlined className="text-brand-secondary" />
                <span>2. Travelers & Duration Settings</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                
                {/* Duration Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <label className="text-sm font-black text-slate-700">Trip Duration</label>
                    <span className="text-lg font-black text-brand-secondary">{inputs.duration} Days</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={inputs.duration}
                    onChange={(e) => setInputs((prev) => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-secondary"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                    <span>1 Day</span>
                    <span>15 Days</span>
                    <span>30 Days</span>
                  </div>
                </div>

                {/* Travelers counter */}
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <label className="text-sm font-black text-slate-700">Traveler Count</label>
                    <span className="text-lg font-black text-brand-secondary">
                      {inputs.numberOfTravelers} {inputs.numberOfTravelers === 1 ? "Person" : "People"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={inputs.numberOfTravelers}
                    onChange={(e) => setInputs((prev) => ({ ...prev, numberOfTravelers: parseInt(e.target.value) || 1 }))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-secondary"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                    <span>1 Traveler</span>
                    <span>10 People</span>
                    <span>20 People</span>
                  </div>
                </div>

              </div>
            </section>

            {/* 3. Accommodation levels */}
            <section className="bg-white/85 backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-slate-950 flex items-center gap-2 border-b border-slate-100 pb-4">
                <CompassOutlined className="text-brand-secondary" />
                <span>3. Select Accommodation Class</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(["budget", "standard", "luxury", "premium-boutique"] as const).map((tier) => {
                  const isSelected = inputs.hotelClass === tier;
                  const label = HOTEL_LABELS[tier];
                  const subDesc =
                    tier === "budget"
                      ? "Clean homestays and basic guest houses."
                      : tier === "standard"
                      ? "Mid-range 3-star hotels and colonial bungalows."
                      : tier === "luxury"
                      ? "Premium 4 & 5-star resorts with pools & breakfast."
                      : "Ultra-exclusive private villas & luxury boutique spots.";

                  return (
                    <button
                      key={tier}
                      onClick={() => setInputs((prev) => ({ ...prev, hotelClass: tier }))}
                      className={`flex flex-col p-4 rounded-2xl border text-left hover:bg-slate-50/50 transition-all ${
                        isSelected
                          ? "border-brand-secondary bg-sky-50/30 shadow-sm"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <span className="text-sm font-black text-slate-950 capitalize">{tier.replace("-", " ")}</span>
                      <span className="text-[10px] font-black text-brand-secondary uppercase mt-0.5">{label}</span>
                      <span className="text-xs text-slate-500 mt-2 font-medium leading-snug">{subDesc}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 4. Transportation Mode */}
            <section className="bg-white/85 backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-slate-950 flex items-center gap-2 border-b border-slate-100 pb-4">
                <CompassOutlined className="text-brand-secondary" />
                <span>4. Select Transport Mode</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(["self-drive", "private-driver", "first-class-train", "charter-flight"] as const).map((mode) => {
                  const isSelected = inputs.transportMode === mode;
                  const label = TRANSPORT_LABELS[mode];
                  const subDesc =
                    mode === "self-drive"
                      ? "Explore at your own pace with a rented SUV."
                      : mode === "private-driver"
                      ? "Stress-free ride with an expert English-speaking guide."
                      : mode === "first-class-train"
                      ? "Famous scenic train lines (Kandy-Ella observatory car)."
                      : "Helicopter transfers or internal turboprop plane flights.";

                  return (
                    <button
                      key={mode}
                      onClick={() => setInputs((prev) => ({ ...prev, transportMode: mode }))}
                      className={`flex flex-col p-4 rounded-2xl border text-left hover:bg-slate-50/50 transition-all ${
                        isSelected
                          ? "border-brand-secondary bg-sky-50/30 shadow-sm"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <span className="text-sm font-black text-slate-950 capitalize">{mode.replace("-", " ")}</span>
                      <span className="text-[10px] font-black text-brand-secondary uppercase mt-0.5">{label}</span>
                      <span className="text-xs text-slate-500 mt-2 font-medium leading-snug">{subDesc}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 5. Travel Season */}
            <section className="bg-white/85 backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-slate-950 flex items-center gap-2 border-b border-slate-100 pb-4">
                <CompassOutlined className="text-brand-secondary" />
                <span>5. Seasonal Period</span>
              </h3>

              <div className="grid grid-cols-3 gap-2">
                {(["off-peak", "shoulder", "peak"] as const).map((season) => {
                  const isSelected = inputs.season === season;
                  const label = SEASON_LABELS[season];
                  return (
                    <button
                      key={season}
                      onClick={() => setInputs((prev) => ({ ...prev, season }))}
                      className={`py-3.5 px-2 rounded-2xl border text-center font-bold text-xs capitalize transition ${
                        isSelected
                          ? "border-brand-secondary bg-sky-50/40 text-slate-900"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <span className="block font-black text-sm">{season.replace("-", " ")}</span>
                      <span className="block text-[9px] text-slate-400 mt-0.5 font-bold uppercase">{label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 6. Activities Checklist */}
            <section className="bg-white/85 backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-slate-950 flex items-center gap-2 border-b border-slate-100 pb-4">
                <CompassOutlined className="text-brand-secondary" />
                <span>6. Optional Add-ons & Activities</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(["yala-safari", "surf-lessons", "sigiriya-hike", "cooking-class"] as const).map((act) => {
                  const isSelected = inputs.activities.includes(act);
                  const label = ACTIVITY_LABELS[act];
                  return (
                    <button
                      key={act}
                      onClick={() => handleToggleActivity(act)}
                      className={`relative flex items-center gap-4 p-4 rounded-2xl border text-left hover:shadow-sm transition ${
                        isSelected
                          ? "border-brand-secondary bg-sky-50/30 shadow-sm"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex-grow pr-6">
                        <span className="block text-sm font-bold text-slate-950 capitalize">{act.replace("-", " ")}</span>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase mt-0.5">{label}</span>
                      </div>
                      <div
                        className={`absolute top-4 right-4 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border transition ${
                          isSelected
                            ? "bg-brand-secondary text-white border-brand-secondary"
                            : "bg-white text-transparent border-slate-300"
                        }`}
                      >
                        <CheckOutlined />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

          </div>

          {/* Pricing Invoice Summary Card */}
          <div className="sticky top-24 space-y-6">
            <section className="bg-white border border-slate-200 rounded-3xl shadow-lg p-6 relative overflow-hidden">
              {/* Accented top border */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-primary" />

              <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4 flex items-center justify-between">
                <span>Trip Invoice Estimate</span>
                <span className="text-xs font-bold bg-sky-100 text-brand-secondary border border-sky-200 px-2 py-0.5 rounded-full uppercase">Verified</span>
              </h3>

              {/* Form Input Variables */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col gap-1.5 bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm">
                  <div className="flex justify-between items-center text-xs text-slate-550 font-bold uppercase tracking-wider">
                    <span>Destinations</span>
                    <span className="text-slate-800 font-black">{inputs.destinations.length} Chosen</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {inputs.destinations.map((d) => (
                      <span key={d} className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-semibold text-slate-850">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-0.5 bg-slate-50 rounded-2xl p-3 border border-slate-100 text-left">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Duration</span>
                    <span className="text-base font-black text-slate-800">{inputs.duration} Days</span>
                  </div>
                  <div className="flex flex-col gap-0.5 bg-slate-50 rounded-2xl p-3 border border-slate-100 text-left">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Travelers</span>
                    <span className="text-base font-black text-slate-800">{inputs.numberOfTravelers} Guests</span>
                  </div>
                </div>
              </div>

              {/* Live Cost Breakdown Table */}
              <div className="mt-6 border-t border-slate-100 pt-6 space-y-3.5 text-sm font-semibold">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Base Rate ($50/day/traveler)</span>
                  <span className="text-slate-800 font-bold">{formatPrice(breakdown.baseCost)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Accommodation surcharge</span>
                  <span className="text-slate-800 font-bold">{formatPrice(breakdown.accommodationCost)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Transportation costs</span>
                  <span className="text-slate-800 font-bold">{formatPrice(breakdown.transportCost)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Destination ticket entry fees</span>
                  <span className="text-slate-800 font-bold">{formatPrice(breakdown.destinationSurcharges)}</span>
                </div>
                {breakdown.activityCost > 0 && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Selected add-on activities</span>
                    <span className="text-slate-800 font-bold">{formatPrice(breakdown.activityCost)}</span>
                  </div>
                )}
                {breakdown.discount > 0 && (
                  <div className="flex justify-between items-center text-emerald-600">
                    <span>Group discount ({(breakdown.discountRate * 100).toFixed(0)}%)</span>
                    <span className="font-bold">-{formatPrice(breakdown.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-500">
                  <span>Local taxes & service charge (12%)</span>
                  <span className="text-slate-800 font-bold">{formatPrice(breakdown.taxes)}</span>
                </div>
              </div>

              {/* Total Invoice */}
              <div className="mt-6 border-t border-slate-100 pt-6 flex justify-between items-baseline">
                <span className="text-base font-black text-slate-900">Total Price</span>
                <div className="text-right">
                  <span className="text-3xl font-black text-brand-secondary">{formatPrice(breakdown.totalPrice)}</span>
                  <span className="text-xs text-slate-400 font-bold uppercase ml-1.5">{currency}</span>
                </div>
              </div>

              {/* Action Form */}
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                
                {/* Date Selection */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                    <CalendarOutlined /> Preferred Start Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={preferredStartDate}
                    onChange={(e) => setPreferredStartDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-secondary text-sm font-semibold"
                  />
                  {errors.preferredStartDate && (
                    <span className="text-red-500 text-xs font-black">{errors.preferredStartDate}</span>
                  )}
                </div>

                {/* Additional notes */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-black text-slate-700 uppercase">
                    Additional notes & preferences
                  </label>
                  <textarea
                    rows={3}
                    placeholder="E.g. dietary constraints, flight arrivals, hotel preferences..."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-secondary text-sm font-semibold resize-none"
                  />
                </div>

                {sessionStatus !== "authenticated" && (
                  <div className="flex gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl items-start text-amber-700 text-left text-xs leading-normal">
                    <InfoCircleOutlined className="text-sm flex-shrink-0 mt-0.5" />
                    <span>
                      You are planning as a guest. Submit booking redirects to login to save your custom estimates.
                    </span>
                  </div>
                )}

                <button
                  onClick={handleBookTrip}
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-xl text-white font-black text-sm transition-all hover:scale-[1.01] active:scale-[0.99] ${
                    sessionStatus !== "authenticated"
                      ? "bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/10"
                      : "bg-slate-900 hover:bg-slate-800 shadow-md shadow-slate-950/15"
                  }`}
                >
                  {isSubmitting
                    ? "Submitting Booking..."
                    : sessionStatus !== "authenticated"
                    ? "Sign In & Submit Booking"
                    : "Submit Custom Travel Request"}
                </button>
              </div>

            </section>
          </div>

        </div>
      </div>
    </main>
  );
}
