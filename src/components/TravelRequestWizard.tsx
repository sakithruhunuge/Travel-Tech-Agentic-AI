"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useTravelRequest } from "@/context/TravelRequestContext";
import { useToast } from "@/context/ToastContext";
import Input from "@/components/ui/Input";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import MultiSelect from "@/components/ui/MultiSelect";
import StepIndicator from "@/components/ui/StepIndicator";

const STEPS = ["Choose Escape", "Dates & Details", "Review & Submit"];

const ALL_DESTINATIONS = [
  { value: "Colombo", label: "Colombo" },
  { value: "Sigiriya", label: "Sigiriya" },
  { value: "Dambulla", label: "Dambulla" },
  { value: "Kandy", label: "Kandy" },
  { value: "Polonnaruwa", label: "Polonnaruwa" },
  { value: "Galle", label: "Galle" },
  { value: "Mirissa", label: "Mirissa" },
  { value: "Unawatuna", label: "Unawatuna" },
  { value: "Bentota", label: "Bentota" },
  { value: "Nuwara Eliya", label: "Nuwara Eliya" },
  { value: "Ella", label: "Ella" },
  { value: "Horton Plains", label: "Horton Plains" },
  { value: "Yala National Park", label: "Yala National Park" },
  { value: "Udawalawe", label: "Udawalawe" },
  { value: "Bundala", label: "Bundala" },
];

interface TravelRequestWizardProps {
  isModal?: boolean;
}

export default function TravelRequestWizard({ isModal = false }: TravelRequestWizardProps) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const locale = useLocale();

  const {
    formData,
    packageMetadata,
    currentStep,
    setStep,
    updateFormField,
    selectPackageById,
    resetForm,
    closeFormModal,
    packages,
  } = useTravelRequest();
  const { addToast } = useToast();

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.packageId) {
        errors.packageId = "Please select a travel package or customized tour";
      }
      if (!formData.numberOfTravelers || formData.numberOfTravelers < 1) {
        errors.numberOfTravelers = "Number of travelers must be 1 or more";
      }
      if (formData.packageId === "custom" && formData.customDestinations.length === 0) {
        errors.customDestinations = "Please select at least one destination for your custom tour";
      }
    }

    if (step === 1) {
      if (!formData.preferredStartDate) {
        errors.preferredStartDate = "Preferred start date is required";
      } else {
        const todayStr = new Date().toISOString().split("T")[0];
        if (formData.preferredStartDate < todayStr) {
          errors.preferredStartDate = "Start date must be in the future";
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    // Authentication Guard
    if (sessionStatus !== "authenticated") {
      // 1. Get current page route URL to redirect back to
      const currentPage = window.location.pathname + window.location.search;

      // 2. Persist state to sessionStorage including current modal status
      const draftState = {
        formData,
        currentStep,
        isFormModalOpen: true,
        returnUrl: currentPage,
      };

      try {
        sessionStorage.setItem("travel_request_draft", JSON.stringify(draftState));
      } catch {
        addToast("error", "Failed to save your draft. Please try again.");
      }

      // 3. Redirect to login
      router.push(`/${locale}/login?callbackUrl=${encodeURIComponent(currentPage)}&restoreForm=true`);
      return;
    }

    setSubmitStatus("loading");
    setErrorMessage("");

    try {
      // If custom tour, append selected destinations to special requests
      let finalSpecialRequests = formData.specialRequests;
      if (formData.packageId === "custom") {
        const destinationsStr = formData.customDestinations.join(", ");
        finalSpecialRequests = `Custom Destinations: [${destinationsStr}]\n\n${formData.specialRequests}`;
      }

      const res = await fetch("/api/travel-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: formData.packageId === "custom" ? "" : formData.packageId,
          packageName: formData.packageName,
          numberOfTravelers: formData.numberOfTravelers,
          preferredStartDate: formData.preferredStartDate,
          specialRequests: finalSpecialRequests,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to submit travel request");
      }

      setSubmitStatus("success");
      resetForm();

      // Redirect to requests page after a short delay
      setTimeout(() => {
        router.push("/my-requests");
      }, 3000);
    } catch (err) {
      addToast("error", "Failed to submit your travel request. Please try again.");
      setSubmitStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  };

  const isAuthenticated = sessionStatus === "authenticated";

  return (
    <div className={`w-full ${isModal ? "p-0" : "space-y-8"}`}>
      {/* Header */}
      {!isModal && (
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-primary">
            Plan Your Vacation
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-brand-dark tracking-tight leading-none">
            Tailor-Make Your Journey
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Step through our intuitive process to customize and book your perfect Sri Lankan getaway.
          </p>
        </div>
      )}

      {isModal && (
        <div className="text-left pb-4 border-b border-slate-100 mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-brand-dark tracking-tight">
            Book Your Custom Getaway
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Fill out the details below to request a tailored Sri Lanka package.
          </p>
        </div>
      )}

      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {submitStatus === "success" ? (
        // Success View
        <div className="text-center py-12 space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-brand-dark">Travel Request Submitted!</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Your customizable itinerary request has been saved. Our expert local travel planner will review and coordinate details within 24 hours.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <Link
              href={`/${locale}/dashboard/my-requests`}
              onClick={closeFormModal}
              className="px-6 py-3 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:bg-brand-primary/95 transition-all shadow-md"
            >
              View Requests Now
            </Link>
            <button
              onClick={() => {
                closeFormModal();
                router.push(`/${locale}`);
              }}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {submitStatus === "error" && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-2 animate-shake">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errorMessage}
            </div>
          )}

          {/* STEP 1: Package Selection */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Select
                  label="Select Tour Package"
                  id="packageSelect"
                  value={formData.packageId}
                  onChange={(e) => selectPackageById(e.target.value)}
                  error={formErrors.packageId}
                  placeholder="Choose a package..."
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.duration})
                    </option>
                  ))}
                  <option value="custom">Custom Tailor-Made Tour</option>
                </Select>

                <Input
                  label="Number of Travelers"
                  id="travelersInput"
                  type="number"
                  min={1}
                  value={formData.numberOfTravelers}
                  onChange={(e) => updateFormField("numberOfTravelers", Number(e.target.value))}
                  error={formErrors.numberOfTravelers}
                />
              </div>

              {formData.packageId === "custom" && (
                <div className="animate-fade-in-down">
                  <MultiSelect
                    label="Select Your Dream Destinations"
                    options={ALL_DESTINATIONS}
                    selectedValues={formData.customDestinations}
                    onChange={(vals) => updateFormField("customDestinations", vals)}
                    placeholder="Add cities (e.g. Galle, Ella, Sigiriya)..."
                    error={formErrors.customDestinations}
                  />
                </div>
              )}

              {packageMetadata && (
                <div className="bg-sky-50/50 border border-sky-100/50 p-6 rounded-2xl flex flex-col sm:flex-row justify-between gap-4 animate-fade-in">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Curated Package Features</h4>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                      Destinations: {packageMetadata.destinations.join(", ")}
                    </p>
                  </div>
                  <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200/60 pt-4 sm:pt-0 sm:pl-6 flex-shrink-0">
                    <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Duration</span>
                    <span className="block text-sm font-bold text-brand-dark">{packageMetadata.duration}</span>
                    <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mt-2">Price Range</span>
                    <span className="block text-sm font-extrabold text-brand-primary">{packageMetadata.priceRange}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Dates & Details */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <DatePicker
                  label="Preferred Start Date"
                  id="startDateInput"
                  value={formData.preferredStartDate}
                  onChange={(e) => updateFormField("preferredStartDate", e.target.value)}
                  error={formErrors.preferredStartDate}
                />
                <div className="flex items-end">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 w-full">
                    <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Flexible Dates?</span>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                      Don&apos;t worry, dates can be updated at any time when planning your custom trip with our advisor.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="specialRequests" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Special Requests / Notes
                </label>
                <textarea
                  id="specialRequests"
                  rows={4}
                  value={formData.specialRequests}
                  onChange={(e) => updateFormField("specialRequests", e.target.value)}
                  placeholder="Describe interest, preferences, accommodation ratings, flight numbers, or customized activities..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all duration-200"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Review & Submit */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-brand-dark px-6 py-4 text-white">
                  <h3 className="text-base font-bold tracking-tight">Review Your Custom Itinerary</h3>
                  <p className="text-xxs text-slate-300 uppercase tracking-wider mt-0.5">Please check your details before submitting</p>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                    <div>
                      <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Selected Package</span>
                      <span className="font-extrabold text-slate-800">{formData.packageName}</span>
                    </div>
                    <div>
                      <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Total Travelers</span>
                      <span className="font-bold text-slate-800">{formData.numberOfTravelers} {formData.numberOfTravelers === 1 ? "Traveler" : "Travelers"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                    <div>
                      <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Preferred Start Date</span>
                      <span className="font-semibold text-slate-800">
                        {formData.preferredStartDate
                          ? new Date(formData.preferredStartDate).toLocaleDateString(undefined, {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                          : "Not selected"}
                      </span>
                    </div>
                    {packageMetadata && (
                      <div>
                        <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Package Duration / Price</span>
                        <span className="font-bold text-slate-800">
                          {packageMetadata.duration} ({packageMetadata.priceRange})
                        </span>
                      </div>
                    )}
                    {formData.packageId === "custom" && (
                      <div>
                        <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Dream Destinations</span>
                        <span className="font-semibold text-slate-800">
                          {formData.customDestinations.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {formData.specialRequests && (
                    <div className="text-sm">
                      <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Notes / Special Requests</span>
                      <p className="text-slate-600 mt-1.5 whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200/50 leading-relaxed italic text-xs">
                        &quot;{formData.specialRequests}&quot;
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {!isAuthenticated ? (
                <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-left space-y-3">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Authentication Required</h4>
                      <p className="text-xs text-amber-700 mt-1 font-semibold leading-relaxed">
                        You must be signed in to submit this travel request. Your draft progress will be saved securely, and you will return directly to this review step after signing in.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                session?.user && (
                  <div className="bg-slate-100 p-4 rounded-xl border border-slate-200/50 text-xs flex justify-between items-center">
                    <div>
                      <span className="block font-bold text-slate-400 uppercase tracking-wider text-xxs">Submitting Request As</span>
                      <span className="block text-slate-700 font-extrabold mt-0.5">{session.user.name} ({session.user.email})</span>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 rounded-full px-2.5 py-1 uppercase tracking-wide text-xxs">
                      Secure Account Active
                    </span>
                  </div>
                )
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={submitStatus === "loading"}
                className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Back
              </button>
            ) : isModal ? (
              <button
                type="button"
                onClick={closeFormModal}
                className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <Link
                href="/"
                className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all"
              >
                Cancel
              </Link>
            )}

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-8 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white text-sm font-extrabold rounded-xl hover:shadow-lg hover:shadow-brand-primary/20 transition-all cursor-pointer ml-auto"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitStatus === "loading"}
                className={`px-8 py-3 text-white text-sm font-extrabold rounded-xl shadow-lg hover:shadow-brand-primary/20 transition-all cursor-pointer ml-auto flex items-center gap-2 ${!isAuthenticated
                  ? "bg-amber-500 hover:bg-amber-600 hover:shadow-amber-500/25"
                  : "bg-brand-primary hover:bg-brand-primary/95"
                  }`}
              >
                {submitStatus === "loading" ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : !isAuthenticated ? (
                  "Sign In & Submit"
                ) : (
                  "Submit Travel Request"
                )}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
