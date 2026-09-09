"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

const guestReviews = [
  {
    name: "Charlotte Mercier",
    country: "France",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80",
    review: "The Hill Country Adventure was spectacular! The scenic train journey to Ella is something we will cherish forever. Highly recommend Horizon Travel for their flawless planning.",
    rating: 5,
    package: "Hill Country Adventure",
  },
  {
    name: "Liam Kaelen",
    country: "Germany",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
    review: "The Cultural Triangle Explorer exceeded all expectations. Sigiriya Rock Fortress is mind-blowing. Our private vehicle was clean, and the English-speaking guide made history come alive.",
    rating: 5,
    package: "Cultural Triangle Explorer",
  },
  {
    name: "Sarah Lawson",
    country: "Australia",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
    review: "We booked the Southern Beach Escape. Golden beaches, whale watching in Mirissa, and the historic Galle Fort were incredible. Smooth airport pickup and excellent beach resort selections.",
    rating: 5,
    package: "Southern Beach Escape",
  },
  {
    name: "David Ross",
    country: "United Kingdom",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80",
    review: "The Wildlife Safari Experience was absolute magic! We saw leopards, sloth bears, and herds of wild elephants in Yala. Highly professional drivers and beautiful national park resorts.",
    rating: 5,
    package: "Wildlife Safari Experience",
  },
];

export default function Testimonials() {
  const t = useTranslations("Testimonials");

  const getReviewKey = (index: number) => {
    if (index === 0) return "charlotte";
    if (index === 1) return "liam";
    if (index === 2) return "sarah";
    if (index === 3) return "david";
    return "";
  };

  return (
    <section id="reviews" className="py-24 bg-white scroll-mt-20">
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

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {guestReviews.map((item, index) => {
            const reviewKey = getReviewKey(index);
            const review = reviewKey ? t(`reviews.${reviewKey}.review`) : item.review;
            const country = reviewKey ? t(`reviews.${reviewKey}.country`) : item.country;
            const pkgName = reviewKey ? t(`reviews.${reviewKey}.package`) : item.package;

            return (
              <div
                key={index}
                className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl border border-white/60 flex flex-col justify-between h-full shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ease-in-out animate-fade-in-up"
                style={{ animationDelay: `${100 + index * 100}ms`, animationFillMode: "both" }}
              >
                <div className="space-y-6">
                  {/* Rating */}
                  <div className="flex gap-1">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <svg
                        key={i}
                        className="w-4 h-4 text-brand-primary fill-brand-primary"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-brand-muted leading-relaxed italic text-left">
                    &ldquo;{review}&rdquo;
                  </p>
                </div>

                {/* Guest Profile */}
                <div className="flex items-center gap-3 pt-6 mt-6 border-t border-brand-light">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-brand-primary/20">
                    <Image
                      src={item.avatar}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-bold text-brand-dark leading-tight">{item.name}</span>
                    <span className="block text-xxs font-bold text-brand-muted uppercase tracking-wider mt-0.5">
                      {country} &bull; {pkgName}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
