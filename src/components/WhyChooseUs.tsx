"use client";

import { useTravelRequest } from "@/context/TravelRequestContext";
import { useTranslations } from "next-intl";

const sellingPoints = [
  {
    title: "Trusted Local Travel Experts",
    description: "Our team consists of native Sri Lankan trip coordinators who design itineraries leveraging deep local secrets.",
    icon: (
      <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Handpicked Hotels",
    description: "We personally vet, select, and audit boutique luxury resorts, premium villas, and unique heritage stays.",
    icon: (
      <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    title: "Comfortable Transportation",
    description: "Travel across Sri Lanka in modern, fully air-conditioned vehicles driven by professional tourist drivers.",
    icon: (
      <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    title: "Personalized Itineraries",
    description: "We tailor all tours to match your timeline, desired pace, interests, budget, and travel preferences.",
    icon: (
      <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    title: "Airport Pickup & Assistance",
    description: "A seamless start to your journey with 24/7 airport greeting, dedicated SIM setups, and baggage handling.",
    icon: (
      <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    title: "24/7 Customer Support",
    description: "Immediate traveler assistance on-the-road for booking shifts, emergencies, or real-time query answers.",
    icon: (
      <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
];

export default function WhyChooseUs() {
  const { openFormModal } = useTravelRequest();
  const t = useTranslations("WhyChooseUs");

  const getPointKey = (index: number) => {
    if (index === 0) return "experts";
    if (index === 1) return "hotels";
    if (index === 2) return "transport";
    if (index === 3) return "itineraries";
    if (index === 4) return "assistance";
    if (index === 5) return "support";
    return "";
  };

  return (
    <section id="why-choose-us" className="py-24 bg-brand-light scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Text Info (Left) */}
          <div className="lg:col-span-5 space-y-6 text-left animate-fade-in-up">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              {t("tagline")}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-brand-dark tracking-tight leading-tight">
              {t("title")}
            </h2>
            <p className="text-base text-brand-muted leading-relaxed">
              {t("description")}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => openFormModal()}
                className="inline-flex px-8 py-4 rounded-full text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary/90 shadow-[0_8px_30px_rgb(255,139,80,0.3)] hover:shadow-[0_12px_36px_rgb(255,139,80,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer"
              >
                {t("cta")}
              </button>
            </div>
          </div>

          {/* Grid Cards (Right) */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {sellingPoints.map((point, index) => {
                const pointKey = getPointKey(index);
                const title = pointKey ? t(`points.${pointKey}.title`) : point.title;
                const description = pointKey ? t(`points.${pointKey}.desc`) : point.description;

                return (
                  <div
                    key={index}
                    className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl border border-white/60 shadow-lg space-y-4 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ease-in-out text-left animate-fade-in-up"
                    style={{ animationDelay: `${150 + index * 80}ms`, animationFillMode: "both" }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center transition-all duration-300 ease-in-out group-hover:scale-110">
                      {point.icon}
                    </div>
                    <h3 className="text-base font-bold text-brand-dark">{title}</h3>
                    <p className="text-xs text-brand-muted leading-relaxed">
                      {description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
