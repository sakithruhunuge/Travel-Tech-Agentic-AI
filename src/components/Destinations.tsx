"use client";

import Image from "next/image";
import { sriLankaImages } from "@/constants/sriLankaImages";
import { useTranslations } from "next-intl";

export default function Destinations() {
  const t = useTranslations("Destinations");

  return (
    <section id="destinations" className="py-24 bg-brand-light scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 animate-fade-in-up">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
            {t("tagline")}
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-brand-dark tracking-tight">
            {t("title")}
          </h2>
          <p className="text-base text-brand-muted">
            {t("description")}
          </p>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sriLankaImages.destinations.map((dest, idx) => {
            // Helper to get category tag translation key
            const getTagKey = (title: string) => {
              if (title.includes("Beach") || title.includes("Mirissa") || title.includes("Bentota")) return "coastline";
              if (title.includes("Temple") || title.includes("Tooth") || title.includes("Fort") || title.includes("Sigiriya")) return "heritage";
              if (title.includes("Tea") || title.includes("Bridge") || title.includes("Ella")) return "highlands";
              if (title.includes("Safari") || title.includes("Park")) return "wildlife";
              return "urban";
            };

            // Helper to get destination item translation key
            const getItemKey = (title: string) => {
              if (title.includes("Sigiriya")) return "sigiriya";
              if (title.includes("Dambulla")) return "dambulla";
              if (title.includes("Tooth") || title.includes("Kandy")) return "kandy";
              if (title.includes("Tea") || title.includes("Nuwara Eliya")) return "tea";
              if (title.includes("Bridge") || title.includes("Nine Arches")) return "bridge";
              if (title.includes("Safari") || title.includes("Yala")) return "safari";
              if (title.includes("Mirissa")) return "mirissa";
              if (title.includes("Galle")) return "galle";
              if (title.includes("Bentota")) return "bentota";
              if (title.includes("Colombo")) return "colombo";
              return "";
            };

            const tagKey = getTagKey(dest.title);
            const tag = t(`tags.${tagKey}`);

            const itemKey = getItemKey(dest.title);
            const title = itemKey ? t(`items.${itemKey}`) : dest.title;

            const isLarge = idx === 0 || idx === 5; // Sigiriya and Safari span 2 columns

            return (
              <div
                key={idx}
                className={`group relative rounded-3xl overflow-hidden aspect-[4/5] sm:aspect-[3/4] md:aspect-auto md:h-[340px] shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ease-in-out border border-white/60 animate-fade-in-up ${isLarge ? "md:col-span-2" : "md:col-span-1"
                  }`}
                style={{ animationDelay: `${100 + idx * 80}ms`, animationFillMode: "both" }}
              >
                {/* Category Tag */}
                <span className="absolute top-4 left-4 z-20 text-[10px] font-bold tracking-widest text-brand-primary bg-white/80 backdrop-blur-lg px-3 py-1.5 rounded-full uppercase border border-white/40 shadow-sm">
                  {tag}
                </span>

                {/* Destination Image */}
                <Image
                  src={dest.imageUrl}
                  alt={title}
                  fill
                  loading="lazy"
                  className="object-cover group-hover:scale-105 transition-all duration-300 ease-in-out"
                  sizes={isLarge ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
                />
                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/30 to-transparent z-10" />

                {/* Text / Attribution Card Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end text-left z-20">
                  <h3 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight">
                    {title}
                  </h3>
                  <span className="text-[10px] text-white/70 font-semibold mt-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-in-out">
                    {dest.imageCredit} &bull; {dest.source}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
