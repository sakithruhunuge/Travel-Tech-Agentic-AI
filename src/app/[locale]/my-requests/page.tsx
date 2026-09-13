"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useCurrency } from "@/context/CurrencyContext";
import { parseRequestPricing } from "@/lib/pricingParser";

interface TravelRequestData {
  _id: string;
  packageName: string;
  preferredStartDate: string;
  numberOfTravelers: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  specialRequests?: string;
}

export default function MyRequestsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const { formatPriceString } = useCurrency();
  const [requests, setRequests] = useState<TravelRequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { addToast } = useToast();

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push(`/${locale}/login?callbackUrl=/${locale}/my-requests`);
    }
  }, [sessionStatus, router, locale]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      const fetchRequests = async () => {
        try {
          const res = await fetch("/api/my-requests");
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || data.message || "Failed to fetch requests");
          }
          setRequests(data.requests || []);
        } catch {
          addToast("error", "Could not load your travel requests. Please try again.");
          setError("Could not load your travel requests. Please try again.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchRequests();
    }
  }, [sessionStatus, addToast]);

  if (sessionStatus === "loading" || (sessionStatus === "authenticated" && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-brand-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm font-semibold text-slate-500">Loading your travel requests...</p>
        </div>
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return null; // Route pushes back to login
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6 text-left">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Travel Requests</h1>
            <p className="text-sm text-slate-500 mt-1">Track the status of your customized Sri Lanka travel itineraries.</p>
          </div>
          <Link
            href={`/${locale}/customize-tour`}
            className="inline-flex items-center justify-center px-6 py-3 bg-brand-primary text-white text-sm font-extrabold rounded-xl hover:bg-brand-primary/95 hover:shadow-lg hover:shadow-brand-primary/25 transition-all duration-200 self-start sm:self-auto"
          >
            Plan Another Trip
          </Link>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-600 text-sm font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          // Empty State
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm space-y-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 002-2" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-800">No requests submitted yet</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                You haven&apos;t requested any customized travel itineraries yet. Start planning your dream getaway to Sri Lanka today!
              </p>
            </div>
            <Link
              href={`/${locale}/customize-tour`}
              className="inline-flex px-6 py-3 bg-brand-primary text-white text-sm font-bold rounded-xl hover:bg-brand-primary/95 transition-all"
            >
              Plan Your First Trip
            </Link>
          </div>
        ) : (
          // Requests Table/List
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Package</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Travelers</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Preferred Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-left">
                        <span className="block font-bold text-slate-900">{req.packageName}</span>
                        {(() => {
                          if (!req.specialRequests) return null;
                          const parsed = parseRequestPricing(req.specialRequests);
                          return (
                            <div className="mt-1.5 flex flex-col gap-1.5">
                              {parsed.isCustomCalc && (
                                <span className="inline-flex w-max items-center px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 uppercase tracking-wider">
                                  <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  Custom Quote
                                </span>
                              )}
                              {parsed.notes && (
                                <span className="block text-xs text-slate-500 max-w-xs truncate" title={parsed.notes}>
                                  Note: {parsed.notes}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-left">
                        {new Date(req.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700 text-left">
                        {req.numberOfTravelers} {req.numberOfTravelers === 1 ? "Traveler" : "Travelers"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-left">
                        {new Date(req.preferredStartDate).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize ${req.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : req.status === "rejected"
                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${req.status === "approved"
                                ? "bg-emerald-600"
                                : req.status === "rejected"
                                  ? "bg-rose-600"
                                  : "bg-amber-600"
                              }`}
                          />
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
