"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ProfileDropdown from "@/components/ProfileDropdown";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useCurrency, Currency } from "@/context/CurrencyContext";
import { useTenant } from "@/context/TenantBrandingContext";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const tenant = useTenant();

  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Navbar");
  const { currency, setCurrency } = useCurrency();

  const navLinks = [
    { label: t("home"), href: `/${locale}/#home` },
    { label: t("about"), href: `/${locale}/#about` },
    { label: t("destinations"), href: `/${locale}/#destinations` },
    { label: t("packages"), href: `/${locale}/#packages` },
    { label: t("customize"), href: `/${locale}/customize-tour` },
    { label: t("whyChooseUs"), href: `/${locale}/#why-choose-us` },
    { label: t("contact"), href: `/${locale}/#contact` },
  ];

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = e.target.value;
    // Standard next/navigation pathname includes the current locale if middleware is used
    // We just replace the current locale with the next one
    let newPath = pathname;
    if (pathname.startsWith(`/${locale}/`)) {
      newPath = pathname.replace(`/${locale}/`, `/${nextLocale}/`);
    } else if (pathname === `/${locale}`) {
      newPath = `/${nextLocale}`;
    } else {
      newPath = `/${nextLocale}${pathname}`;
    }
    router.replace(newPath);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/70 transition-all duration-300 ease-in-out shadow-sm shadow-black/[0.02]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 gap-4">
          {/* Dynamic Logo / Brand Name */}
          <div className="flex-shrink-0 flex items-center mr-2 lg:mr-4">
            <Link href={`/${locale}`} className="flex items-center gap-2.5 group transition-all duration-300 ease-in-out">
              {tenant.branding?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.branding.logoUrl}
                  alt={tenant.name}
                  className="h-9 w-auto object-contain"
                />
              ) : (
                <span className="text-xl xl:text-2xl font-black tracking-tight text-slate-900 group-hover:text-brand-primary transition-all duration-300 ease-in-out uppercase whitespace-nowrap">
                  {tenant.name}
                </span>
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs xl:text-[13.5px] font-semibold text-slate-600 hover:text-brand-primary hover:bg-black/[0.03] px-2.5 xl:px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap relative group/item"
              >
                {link.label}
                <span className="absolute bottom-1 left-3 right-3 h-[2px] bg-brand-primary scale-x-0 group-hover/item:scale-x-100 transition-transform duration-200 rounded-full" />
              </Link>
            ))}
          </nav>

          {/* Desktop CTA / Auth */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-2.5 flex-shrink-0">
            {/* Language Selector */}
            <div className="relative flex items-center">
              <select
                aria-label="Language Selector"
                value={locale}
                onChange={handleLanguageChange}
                className="appearance-none bg-white/70 border border-slate-200/80 hover:bg-white hover:border-slate-300 rounded-full pl-3 pr-7 h-9 text-xs font-bold text-slate-700 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer transition-all shadow-sm"
              >
                <option value="en">EN</option>
                <option value="fr">FR</option>
                <option value="de">GE</option>
                <option value="si">SI</option>
              </select>
              <svg className="w-3 h-3 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Currency Selector */}
            <div className="relative flex items-center">
              <select 
                aria-label="Currency Selector" 
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="appearance-none bg-white/70 border border-slate-200/80 hover:bg-white hover:border-slate-300 rounded-full pl-3 pr-7 h-9 text-xs font-bold text-slate-700 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer transition-all shadow-sm"
              >
                <option value="USD">USD ($)</option>
                <option value="LKR">LKR (Rs)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
              <svg className="w-3 h-3 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {session ? (
              <ProfileDropdown />
            ) : (
              <Link
                href={`/${locale}/login`}
                className="inline-flex items-center justify-center h-9 px-5 rounded-full text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/90 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
              >
                {t("login")}
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition-all"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden animate-fade-in-down" id="mobile-menu">
          <div className="px-4 pt-2 pb-6 space-y-1 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-xl">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-brand-primary/10 hover:text-brand-primary transition-all"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 pb-2 px-2 border-t border-slate-200/80 mt-2 space-y-3">
              <div className="flex items-center gap-3">
                <select
                  aria-label="Mobile Language Selector"
                  value={locale}
                  onChange={(e) => {
                    handleLanguageChange(e);
                    setIsOpen(false);
                  }}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-brand-primary"
                >
                  <option value="en">English (EN)</option>
                  <option value="fr">French (FR)</option>
                  <option value="de">German (DE)</option>
                  <option value="si">Sinhala (SI)</option>
                </select>
                <select
                  aria-label="Mobile Currency Selector"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-brand-primary"
                >
                  <option value="USD">USD ($)</option>
                  <option value="LKR">LKR (Rs)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              {session ? (
                <div className="flex items-center gap-3 pt-1">
                  <ProfileDropdown />
                </div>
              ) : (
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center px-6 py-2.5 rounded-full text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary/90 shadow-sm transition-all"
                >
                  {t("login")}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
