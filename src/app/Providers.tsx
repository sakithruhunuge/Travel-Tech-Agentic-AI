"use client";

import { SessionProvider } from "next-auth/react";
import { TravelRequestProvider } from "@/context/TravelRequestContext";
import TravelRequestModal from "@/components/TravelRequestModal";
import { ToastProvider } from "@/context/ToastContext";
import Toasts from "@/components/ui/Toast";
import { CurrencyProvider } from "@/context/CurrencyContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CurrencyProvider>
        <ToastProvider>
          <TravelRequestProvider>
            {children}
            <TravelRequestModal />
            <Toasts />
          </TravelRequestProvider>
        </ToastProvider>
      </CurrencyProvider>
    </SessionProvider>
  );
}
