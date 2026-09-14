"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type Currency = "USD" | "LKR" | "EUR" | "GBP";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPriceString: (priceStr: string) => string;
  formatPrice: (amount: number, showSymbol?: boolean) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Static exchange rates relative to USD
const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  LKR: 300,
  EUR: 0.92,
  GBP: 0.79,
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  LKR: "Rs ",
  EUR: "€",
  GBP: "£",
};

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>("USD");

  const formatPriceString = (priceStr: string): string => {
    if (!priceStr) return priceStr;

    // This regex looks for a dollar sign optionally followed by spaces, then numbers with optional commas.
    // It will capture the numeric part.
    const regex = /\$?([\d,]+)/g;

    return priceStr.replace(regex, (match, p1) => {
      // Remove commas from the captured number string
      const numericValue = parseInt(p1.replace(/,/g, ""), 10);
      
      if (isNaN(numericValue)) return match;

      // Apply exchange rate
      const convertedValue = Math.round(numericValue * EXCHANGE_RATES[currency]);
      
      // Format with commas and appropriate symbol
      const formattedNumber = convertedValue.toLocaleString('en-US');
      
      return `${CURRENCY_SYMBOLS[currency]}${formattedNumber}`;
    });
  };

  const formatPrice = (amount: number, showSymbol = true): string => {
    const converted = Math.round(amount * EXCHANGE_RATES[currency]);
    const formatted = converted.toLocaleString('en-US');
    return showSymbol ? `${CURRENCY_SYMBOLS[currency]}${formatted}` : formatted;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPriceString, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
