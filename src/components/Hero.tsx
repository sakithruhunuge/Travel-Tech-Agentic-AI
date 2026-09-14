"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTravelRequest } from "@/context/TravelRequestContext";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/context/CurrencyContext";

const DESTINATIONS = ["Interactive Map Customizer (Build Custom Route)", "Kandy", "Ella", "Mirissa", "Sigiriya", "Galle", "Nuwara Eliya", "Trincomalee", "Jaffna"];
const BUDGETS = ["$100 - $300", "$300 - $600", "$600 - $1000", "$1000+", "$2000+ Luxury"];

export default function Hero() {
  const router = useRouter();
  const { openFormModal } = useTravelRequest();
  const { formatPriceString } = useCurrency();
  const [destination, setDestination] = useState(DESTINATIONS[0]);
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState(BUDGETS[0]);
  const t = useTranslations("Hero");

  return (
    <section
      id="home"
      className="relative bg-white py-16 lg:py-20 overflow-hidden"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Text + Search */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <h1
              className="text-4xl sm:text-6xl font-black tracking-tight text-brand-dark leading-[1.1] animate-fade-in-up"
              style={{ animationDelay: "300ms", animationFillMode: "both" }}
            >
              {t("title")}
              <br />
              <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-orange-400">
                {t("country")}
                <svg
                  className="absolute -top-2 -right-8 w-6 h-6 text-brand-primary"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 0l2.2 7.3L22 9.5l-7.3 2.2L12 19l-2.2-7.3L2 9.5l7.8-2.2L12 0z" />
                </svg>
              </span>
            </h1>

            <p
              className="text-lg text-brand-dark/60 leading-relaxed max-w-xl animate-fade-in-up"
              style={{ animationDelay: "450ms", animationFillMode: "both" }}
            >
              {t("description")}
            </p>

            {/* Search / filter bar */}
            <div
              className="animate-fade-in-up"
              style={{ animationDelay: "600ms", animationFillMode: "both" }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (destination.includes("Interactive Map Customizer")) {
                    router.push("/customize-tour");
                  } else {
                    openFormModal();
                  }
                }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white rounded-2xl border border-black/10 shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-3 sm:p-2 sm:pl-4 max-w-2xl w-full"
              >
                <label className="flex-1 sm:pr-3 sm:border-r sm:border-black/10">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                    {t("destination")}
                  </span>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full text-sm font-semibold text-brand-dark bg-transparent outline-none py-1"
                  >
                    {DESTINATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex-1 sm:px-3 sm:border-r sm:border-black/10">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                    {t("travelDate")}
                  </span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-sm font-semibold text-brand-dark bg-transparent outline-none py-1"
                  />
                </label>

                <label className="flex-[1.2] sm:min-w-[150px] sm:px-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                    {t("budget")}
                  </span>
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full text-sm font-semibold text-brand-dark bg-transparent outline-none py-1"
                  >
                    {BUDGETS.map((b) => (
                      <option key={b} value={b}>
                        {formatPriceString(b)}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  className="shrink-0 px-6 py-2.5 rounded-full text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary/90 hover:scale-[1.03] active:scale-95 transition-all duration-300 ease-in-out cursor-pointer"
                >
                  {t("planTrip")}
                </button>
              </form>
            </div>

            <div
              className="flex items-center gap-6 pt-2 animate-fade-in-up"
              style={{ animationDelay: "750ms", animationFillMode: "both" }}
            >
              <a
                href="#packages"
                className="text-sm font-bold text-brand-dark underline decoration-brand-primary decoration-2 underline-offset-4 hover:text-brand-primary transition-colors"
              >
                {t("browsePackages")}
              </a>
            </div>
          </div>

          {/* Illustration - LARGER IMAGE, NO BACKGROUND, NO BOX */}
          <div
            className="lg:col-span-6 relative animate-scale-in flex items-center justify-center"
            style={{ animationDelay: "450ms", animationFillMode: "both" }}
          >
            <Image
              src="/images/hero-traveler-new.png"
              alt="Young woman traveler in Sri Lanka"
              width={450}
              height={450}
              priority
              className="object-contain scale-110 hover:scale-115 transition-transform duration-700"
            />
          </div>
        </div>
      </div>
    </section>
  );
}