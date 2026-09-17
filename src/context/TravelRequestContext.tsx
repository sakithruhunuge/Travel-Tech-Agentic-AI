"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export interface TravelRequestFormData {
  packageId: string;
  packageName: string;
  numberOfTravelers: number;
  preferredStartDate: string;
  specialRequests: string;
  customDestinations: string[];
}

export interface PackageMetadata {
  duration: string;
  priceRange: string;
  destinations: string[];
}

interface TravelRequestContextType {
  formData: TravelRequestFormData;
  packageMetadata: PackageMetadata | null;
  currentStep: number;
  setStep: (step: number) => void;
  updateFormField: (name: keyof TravelRequestFormData, value: TravelRequestFormData[keyof TravelRequestFormData]) => void;
  selectPackageById: (id: string) => void;
  resetForm: () => void;
  isDraftLoaded: boolean;
  isFormModalOpen: boolean;
  openFormModal: (packageId?: string) => void;
  closeFormModal: () => void;
  packages: any[];
}

const defaultFormData: TravelRequestFormData = {
  packageId: "",
  packageName: "",
  numberOfTravelers: 1,
  preferredStartDate: "",
  specialRequests: "",
  customDestinations: [],
};

const TravelRequestContext = createContext<TravelRequestContextType | undefined>(undefined);

export function TravelRequestProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [formData, setFormData] = useState<TravelRequestFormData>(defaultFormData);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);

  // 1. Fetch dynamic packages from API resolved per active tenant
  useEffect(() => {
    fetch("/api/packages")
      .then((res) => res.json())
      .then((data) => {
        if (data.packages) {
          setPackages(data.packages);
        }
      })
      .catch((err) => console.error("Failed to load packages in wizard context:", err));
  }, []);

  // Load package metadata helper from state packages list
  const getPackageMetadata = (pkgId: string): PackageMetadata | null => {
    if (!pkgId || pkgId === "custom") return null;
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return null;
    return {
      duration: pkg.duration,
      priceRange: pkg.priceRange,
      destinations: pkg.destinations,
    };
  };

  // 2. Load draft from sessionStorage on mount
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem("travel_request_draft");
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.formData) {
          setFormData({
            ...defaultFormData,
            ...parsed.formData,
          });
        }
        if (parsed.currentStep !== undefined) {
          setCurrentStep(parsed.currentStep);
        }
        // Do not auto-open on login or signup pages on initial mount
        const pathWithoutLocale = window.location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
        if (parsed.isFormModalOpen !== undefined && pathWithoutLocale !== "/login" && pathWithoutLocale !== "/signup") {
          setIsFormModalOpen(parsed.isFormModalOpen);
        }
      }
    } catch (e) {
      console.warn("Failed to load travel request draft from sessionStorage:", e);
    } finally {
      setIsDraftLoaded(true);
    }
  }, []);

  // 3. Listen to route transitions to dynamically manage the modal visibility
  useEffect(() => {
    if (!isDraftLoaded) return;

    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
    if (pathWithoutLocale === "/login" || pathWithoutLocale === "/signup") {
      setIsFormModalOpen(false);
    } else {
      try {
        const savedDraft = sessionStorage.getItem("travel_request_draft");
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.isFormModalOpen === true) {
            setIsFormModalOpen(true);
          }
        }
      } catch (e) {
        console.warn("Failed to restore modal state on path change:", e);
      }
    }
  }, [pathname, isDraftLoaded]);

  // 4. Persist draft to sessionStorage on state changes
  useEffect(() => {
    if (!isDraftLoaded) return;
    // Do not save draft status when on login/signup pages to avoid overwriting modal visibility state
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
    if (pathWithoutLocale === "/login" || pathWithoutLocale === "/signup") return;

    try {
      sessionStorage.setItem(
        "travel_request_draft",
        JSON.stringify({ formData, currentStep, isFormModalOpen })
      );
    } catch (e) {
      console.warn("Failed to save travel request draft to sessionStorage:", e);
    }
  }, [formData, currentStep, isFormModalOpen, isDraftLoaded, pathname]);

  const setStep = (step: number) => {
    setCurrentStep(step);
  };

  const updateFormField = (
    name: keyof TravelRequestFormData,
    value: TravelRequestFormData[keyof TravelRequestFormData]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const selectPackageById = (id: string) => {
    if (!id) {
      setFormData((prev) => ({
        ...prev,
        packageId: "",
        packageName: "",
        customDestinations: [],
      }));
      return;
    }

    if (id === "custom") {
      setFormData((prev) => ({
        ...prev,
        packageId: "custom",
        packageName: "Custom Sri Lanka Tour",
      }));
      return;
    }

    const pkg = packages.find((p) => p.id === id);
    if (pkg) {
      setFormData((prev) => ({
        ...prev,
        packageId: pkg.id,
        packageName: pkg.name,
        customDestinations: [],
      }));
    }
  };

  const openFormModal = (packageId?: string) => {
    if (packageId) {
      selectPackageById(packageId);
    }
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setCurrentStep(0);
    setIsFormModalOpen(false);
    try {
      sessionStorage.removeItem("travel_request_draft");
    } catch (e) {
      console.warn("Failed to clear travel request draft from sessionStorage:", e);
    }
  };

  const packageMetadata = getPackageMetadata(formData.packageId);

  return (
    <TravelRequestContext.Provider
      value={{
        formData,
        packageMetadata,
        currentStep,
        setStep,
        updateFormField,
        selectPackageById,
        resetForm,
        isDraftLoaded,
        isFormModalOpen,
        openFormModal,
        closeFormModal,
        packages,
      }}
    >
      {children}
    </TravelRequestContext.Provider>
  );
}

export function useTravelRequest() {
  const context = useContext(TravelRequestContext);
  if (!context) {
    throw new Error("useTravelRequest must be used within a TravelRequestProvider");
  }
  return context;
}
