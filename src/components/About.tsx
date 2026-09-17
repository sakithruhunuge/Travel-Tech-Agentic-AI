"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

export default function About() {
  const t = useTranslations("About");

  return (
    <section id="about" className="py-24 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Visual Showcase (Left) */}
          <div className="lg:col-span-6 relative animate-fade-in-up" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="relative rounded-3xl overflow-hidden h-64 shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ease-in-out">
                  <Image
                    src="/images/sigiriya.png"
                    alt="Sigiriya Rock Fortress"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 30vw"
                  />
                </div>
                <div className="relative rounded-3xl overflow-hidden h-48 shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ease-in-out">
                  <Image
                    src="/images/mirissa.png"
                    alt="Golden Coast Beaches"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 30vw"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="relative rounded-3xl overflow-hidden h-48 shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ease-in-out">
                  <Image
                    src="/images/nine_arch.png"
                    alt="Ella Train Journey"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 30vw"
                  />
                </div>
                <div className="relative rounded-3xl overflow-hidden h-64 shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ease-in-out">
                  <Image
                    src="/images/yala.png"
                    alt="Elephant Safari Wildlife"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 30vw"
                  />
                </div>
              </div>
            </div>
            {/* Ambient background decoration */}
            <div className="absolute -z-10 -top-4 -left-4 w-24 h-24 bg-brand-primary/15 rounded-full blur-2xl animate-pulse-slow" />
            <div className="absolute -z-10 -bottom-4 -right-4 w-32 h-32 bg-brand-secondary/15 rounded-full blur-2xl animate-pulse-slow" />
          </div>

          {/* Text Content (Right) */}
          <div className="lg:col-span-6 space-y-6 text-left animate-fade-in-up" style={{ animationDelay: "250ms", animationFillMode: "both" }}>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              {t("wonder")}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-brand-dark tracking-tight leading-tight">
              {t("title")}
            </h2>
            <p className="text-base text-brand-muted leading-relaxed">
              {t("description")}
            </p>
            <div className="space-y-4 pt-2">
              <div className="flex gap-4 group transition-all duration-300 ease-in-out">
                <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex-shrink-0 flex items-center justify-center font-bold text-brand-primary group-hover:scale-110 transition-all duration-300 ease-in-out">1</div>
                <div>
                  <h4 className="text-sm font-bold text-brand-dark">{t("heritage.title")}</h4>
                  <p className="text-xs text-brand-muted mt-1">{t("heritage.desc")}</p>
                </div>
              </div>
              <div className="flex gap-4 group transition-all duration-300 ease-in-out">
                <div className="w-10 h-10 rounded-2xl bg-brand-secondary/10 border border-brand-secondary/20 flex-shrink-0 flex items-center justify-center font-bold text-brand-secondary group-hover:scale-110 transition-all duration-300 ease-in-out">2</div>
                <div>
                  <h4 className="text-sm font-bold text-brand-dark">{t("highlands.title")}</h4>
                  <p className="text-xs text-brand-muted mt-1">{t("highlands.desc")}</p>
                </div>
              </div>
              <div className="flex gap-4 group transition-all duration-300 ease-in-out">
                <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex-shrink-0 flex items-center justify-center font-bold text-brand-primary group-hover:scale-110 transition-all duration-300 ease-in-out">3</div>
                <div>
                  <h4 className="text-sm font-bold text-brand-dark">{t("wildlife.title")}</h4>
                  <p className="text-xs text-brand-muted mt-1">{t("wildlife.desc")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
