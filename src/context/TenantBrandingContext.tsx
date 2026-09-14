"use client";

import React, { createContext, useContext } from "react";

export interface TenantBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tagline?: string;
}

export interface TenantContextData {
  id: string | null;
  name: string;
  slug: string;
  branding?: TenantBranding;
  plan: string;
  status: string;
  isolation: string;
  isAdmin?: boolean;
}

const TenantBrandingContext = createContext<TenantContextData | null>(null);

export function TenantBrandingProvider({
  children,
  tenant,
}: {
  children: React.ReactNode;
  tenant: TenantContextData;
}) {
  return (
    <TenantBrandingContext.Provider value={tenant}>
      {children}
    </TenantBrandingContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantBrandingContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantBrandingProvider");
  }
  return context;
}
