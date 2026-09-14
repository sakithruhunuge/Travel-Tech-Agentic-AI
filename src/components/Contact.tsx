"use client";

import { useTravelRequest } from "@/context/TravelRequestContext";
import { useTranslations } from "next-intl";

export default function Contact() {
  const { openFormModal } = useTravelRequest();
  const t = useTranslations("Contact");

  return (
    <section id="contact" className="py-24 bg-brand-light scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Info Side */}
          <div className="lg:col-span-5 space-y-8 flex flex-col justify-center text-left animate-fade-in-up">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                {t("tagline")}
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-brand-dark tracking-tight">
                {t("title")}
              </h2>
              <p className="text-base text-brand-muted leading-relaxed">
                {t("description")}
              </p>
            </div>

            {/* Quick Contact Links */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4 transition-all duration-300 ease-in-out hover:translate-x-1">
                <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-[0_4px_20px_rgb(255,139,80,0.15)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-brand-dark">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-4 transition-all duration-300 ease-in-out hover:translate-x-1">
                <div className="w-10 h-10 rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary shadow-[0_4px_20px_rgb(37,165,254,0.15)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-brand-dark">hello@horizontravel.com</span>
              </div>
            </div>
          </div>

          {/* CTA Card Side */}
          <div className="lg:col-span-7 flex items-center animate-fade-in-up" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
            <div className="w-full bg-brand-dark/90 backdrop-blur-xl text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-white/10 shadow-2xl text-left">
              {/* Background gradient effect */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-secondary/20 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-6 relative z-10">
                <span className="inline-flex rounded-full bg-white/10 backdrop-blur-sm px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-brand-primary border border-white/10">
                  {t("taglineCta")}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  {t("titleCta")}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed font-medium">
                  {t("descCta")}
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-xs text-white/70 font-semibold">
                    <svg className="w-3.5 h-3.5 text-brand-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M16.7 5.3a1 1 0 010 1.4l-7.3 7.3a1 1 0 01-1.4 0l-3.3-3.3a1 1 0 011.4-1.4l2.6 2.6 6.6-6.6a1 1 0 011.4 0z" />
                    </svg>
                    {t("bullet1")}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/70 font-semibold">
                    <svg className="w-3.5 h-3.5 text-brand-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M16.7 5.3a1 1 0 010 1.4l-7.3 7.3a1 1 0 01-1.4 0l-3.3-3.3a1 1 0 011.4-1.4l2.6 2.6 6.6-6.6a1 1 0 011.4 0z" />
                    </svg>
                    {t("bullet2")}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/70 font-semibold">
                    <svg className="w-3.5 h-3.5 text-brand-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M16.7 5.3a1 1 0 010 1.4l-7.3 7.3a1 1 0 01-1.4 0l-3.3-3.3a1 1 0 011.4-1.4l2.6 2.6 6.6-6.6a1 1 0 011.4 0z" />
                    </svg>
                    {t("bullet3")}
                  </div>
                </div>
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => openFormModal()}
                    className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-extrabold rounded-full shadow-[0_8px_30px_rgb(255,139,80,0.3)] hover:shadow-[0_12px_36px_rgb(255,139,80,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer"
                  >
                    {t("btnCta")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
