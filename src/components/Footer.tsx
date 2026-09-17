"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useTenant } from "@/context/TenantBrandingContext";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const tenant = useTenant();
  const locale = useLocale();
  const t = useTranslations("Footer");
  const tNav = useTranslations("Navbar");

  return (
    <footer className="bg-brand-dark text-brand-muted py-16 border-t border-white/10 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Dynamic Brand Info */}
          <div className="space-y-4">
            <Link href={`/${locale}`} className="inline-block transition-all duration-300 ease-in-out hover:opacity-80">
              {tenant.branding?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.branding.logoUrl}
                  alt={tenant.name}
                  className="h-10 w-auto object-contain brightness-0 invert"
                />
              ) : (
                <span className="text-2xl font-black tracking-tight text-white uppercase">
                  {tenant.name}
                </span>
              )}
            </Link>
            <p className="text-sm leading-relaxed text-brand-muted">
              {tenant.branding?.tagline || t("desc")}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              {t("explore")}
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#home" className="text-sm hover:text-brand-primary transition-all duration-300 ease-in-out">
                  {tNav("home")}
                </a>
              </li>
              <li>
                <a href="#about" className="text-sm hover:text-brand-primary transition-all duration-300 ease-in-out">
                  {tNav("about")}
                </a>
              </li>
              <li>
                <a href="#packages" className="text-sm hover:text-brand-primary transition-all duration-300 ease-in-out">
                  {tNav("packages")}
                </a>
              </li>
              <li>
                <a href="#why-choose-us" className="text-sm hover:text-brand-primary transition-all duration-300 ease-in-out">
                  {tNav("whyChooseUs")}
                </a>
              </li>
            </ul>
          </div>

          {/* Business Hours */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              {t("hours.title")}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>{t("hours.monFri")}</li>
              <li>{t("hours.sat")}</li>
              <li>{t("hours.sun")}</li>
            </ul>
          </div>

          {/* Contacts info */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              {t("contact.title")}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <span className="block text-white font-semibold">{t("contact.address")}:</span>
                Colombo, Sri Lanka
              </li>
              <li>
                <span className="block text-white font-semibold">{t("contact.phone")}:</span>
                +94 11 234 5678
              </li>
              <li>
                <span className="block text-white font-semibold">{t("contact.email")}:</span>
                contact@{tenant.slug || "ceylon"}.travelcompany.com
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <p>&copy; {currentYear} {tenant.name || "Ceylon Travel"}. {t("rights")}</p>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-brand-primary transition-all duration-300 ease-in-out">{t("privacy")}</a>
            <a href="#" className="hover:text-brand-primary transition-all duration-300 ease-in-out">{t("terms")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
