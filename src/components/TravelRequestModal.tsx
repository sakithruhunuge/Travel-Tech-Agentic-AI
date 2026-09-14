"use client";

import { useTravelRequest } from "@/context/TravelRequestContext";
import TravelRequestAntD from "./TravelRequestAntD";

export default function TravelRequestModal() {
  const { isFormModalOpen, closeFormModal, isDraftLoaded } = useTravelRequest();

  if (!isDraftLoaded || !isFormModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-md overflow-y-auto animate-fade-in-up"
      onClick={closeFormModal}
    >
      <div
        className="relative bg-white/90 backdrop-blur-lg rounded-3xl w-full max-w-6xl p-6 sm:p-10 shadow-2xl border border-white/40 max-h-[90vh] overflow-y-auto text-left animate-scale-in"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside content
      >
        {/* Close Button */}
        <button
          onClick={closeFormModal}
          type="button"
          className="absolute top-5 right-5 text-brand-muted hover:text-brand-dark hover:scale-110 active:scale-95 transition-all duration-300 ease-in-out font-bold text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/60 cursor-pointer"
        >
          &times;
        </button>

        {/* Unified Form Layout */}
        <TravelRequestAntD isModal={true} />
      </div>
    </div>
  );
}
