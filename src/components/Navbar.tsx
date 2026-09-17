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
    <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/20 transition-all duration-300 ease-in-out shadow-sm shadow-black/[0.03]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Dynamic Logo / Brand Name */}
          <div className="flex-shrink-0 flex items-center">
            <Link href={`/${locale}`} className="flex items-center gap-2 group transition-all duration-300 ease-in-out">
              {tenant.branding?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.branding.logoUrl}
                  alt={tenant.name}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <span className="text-2xl font-black tracking-wider text-brand-dark group-hover:text-brand-primary transition-all duration-300 ease-in-out uppercase">
                  {tenant.name}
                </span>
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8 items-center">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-bold text-brand-muted hover:text-brand-secondary transition-all duration-300 ease-in-out relative py-1 group/item"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-brand-primary transition-all duration-300 ease-in-out group-hover/item:w-full rounded-full" />
              </Link>
            ))}
          </nav>

          {/* Desktop CTA / Auth */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Selector */}
            <select
              aria-label="Language Selector"
              value={locale}
              onChange={handleLanguageChange}
              className="bg-white/50 border border-black/10 rounded-full px-3 py-1.5 text-xs font-bold text-brand-muted hover:text-brand-secondary outline-none focus:border-brand-primary cursor-pointer transition-all"
            >
              <option value="en">EN</option>
              <option value="fr">FR</option>
              <option value="de">GE</option>
              <option value="si">SI</option>
            </select>

            {/* Currency Selector */}
            <select 
              aria-label="Currency Selector" 
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="bg-white/50 border border-black/10 rounded-full px-3 py-1.5 text-xs font-bold text-brand-muted hover:text-brand-secondary outline-none focus:border-brand-primary cursor-pointer transition-all mr-1"
            >
              <option value="USD">USD ($)</option>
              <option value="LKR">LKR (Rs)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>

            {session ? (
              <ProfileDropdown />
            ) : (
              <Link
                href={`/${locale}/login`}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary/90 shadow-[0_8px_30px_rgba(var(--brand-primary),0.3)] hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out"
              >
                {t("login")}
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2.5 rounded-2xl text-brand-muted hover:text-brand-dark hover:bg-white/60 focus:outline-none transition-all duration-300 ease-in-out"
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
        <div className="md:hidden animate-fade-in-down" id="mobile-menu">
          <div className="px-3 pt-2 pb-5 space-y-1 bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-xl">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 rounded-2xl text-base font-bold text-brand-muted hover:bg-white/60 hover:text-brand-secondary transition-all duration-300 ease-in-out"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 pb-2 px-4 border-t border-white/30 mt-2 space-y-4">
              <div className="flex items-center gap-3">
                <select
                  aria-label="Mobile Language Selector"
                  value={locale}
                  onChange={(e) => {
                    handleLanguageChange(e);
                    setIsOpen(false);
                  }}
                  className="flex-1 bg-white border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-bold text-brand-muted outline-none focus:border-brand-primary"
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
                  className="flex-1 bg-white border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-bold text-brand-muted outline-none focus:border-brand-primary"
                >
                  <option value="USD">USD ($)</option>
                  <option value="LKR">LKR (Rs)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              {session ? (
                <div className="flex items-center gap-3 animate-fade-in-up">
                  <ProfileDropdown />
                </div>
              ) : (
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center px-6 py-3 rounded-full text-base font-bold text-white bg-brand-primary hover:bg-brand-primary/90 shadow-[0_8px_30px_rgba(var(--brand-primary),0.3)] hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out"
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
