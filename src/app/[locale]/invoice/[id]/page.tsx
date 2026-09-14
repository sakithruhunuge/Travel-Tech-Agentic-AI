"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { parseRequestPricing, PricingMetrics } from "@/lib/pricingParser";
import { useToast } from "@/context/ToastContext";
import {
  CheckCircleOutlined,
  CalendarOutlined,
  TeamOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  CreditCardOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
  CompassOutlined,
} from "@ant-design/icons";

interface InvoiceData {
  _id: string;
  packageName: string;
  numberOfTravelers: number;
  preferredStartDate: string;
  specialRequests: string;
  userName: string;
  userEmail: string;
  status: string;
  createdAt: string;
}

interface TenantBranding {
  name: string;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
}

export default function InvoicePaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [tenant, setTenant] = useState<TenantBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment states
  const [isPaying, setIsPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceDetails();
    }
  }, [invoiceId]);

  const loadInvoiceDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to retrieve invoice specifications.");
      }
      setInvoice(data.invoice);
      setTenant(data.tenant);

      // Check if already paid
      const { metrics } = parseRequestPricing(data.invoice.specialRequests || "");
      if (metrics.paymentStatus === "PAID") {
        setPaySuccess(true);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Network error loading invoice details");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    setIsPaying(true);
    // Simulate transaction delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const res = await fetch(`/api/travel-requests/${invoiceId}/pay`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Transaction checkout failed.");
      }

      setPaySuccess(true);
      addToast("success", "Payment captured! Thank you for booking with us.");
      // Re-fetch details to sync data
      await loadInvoiceDetails();
    } catch (err) {
      console.error(err);
      addToast("error", err instanceof Error ? err.message : "Payment processing error.");
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-slate-350 border-t-slate-800 rounded-full animate-spin" />
        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Loading invoice billing details...</span>
      </div>
    );
  }

  if (error || !invoice || !tenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-xl space-y-4">
          <div className="text-red-500 text-4xl">&times;</div>
          <h2 className="text-xl font-black text-slate-900">Billing Retrieval Failure</h2>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">{error || "Requested invoice could not be located."}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  // Parse structured metrics from markdown block
  const { metrics, notes, isCustomCalc } = parseRequestPricing(invoice.specialRequests || "");

  // Brand-Colors Dynamic Scoping Object (Execution Boundary Compliance)
  const brandStyle = {
    "--brand-primary": tenant.primaryColor,
    "--brand-secondary": tenant.secondaryColor,
  } as React.CSSProperties;

  return (
    <div
      style={brandStyle}
      className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-left font-sans"
    >
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-750 transition"
          >
            <ArrowLeftOutlined />
            <span>Go Back</span>
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-750 transition"
          >
            <PrinterOutlined />
            <span>Print Receipt</span>
          </button>
        </div>

        {/* Invoice Page Container */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl grid md:grid-cols-[1.8fr_1.2fr]">
          
          {/* Invoice Receipt details */}
          <div className="p-8 space-y-6">
            
            {/* Header branding */}
            <div className="flex justify-between items-baseline border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400">Merchant Agency</span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight capitalize">
                  {tenant.companyName}
                </h2>
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Invoice
              </span>
            </div>

            {/* Travel Specs details */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Booking Specifications
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Customer</span>
                  <span className="block text-xs font-black text-slate-800 mt-0.5 truncate">{invoice.userName}</span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Date of Departure</span>
                  <span className="block text-xs font-black text-slate-800 mt-0.5 flex items-center gap-1">
                    <CalendarOutlined className="text-slate-400" />
                    <span>{new Date(invoice.preferredStartDate).toLocaleDateString()}</span>
                  </span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Route Inclusions</span>
                  <span className="block text-xs font-black text-slate-800 mt-0.5 truncate">{invoice.packageName}</span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Total Guests</span>
                  <span className="block text-xs font-black text-slate-800 mt-0.5 flex items-center gap-1">
                    <TeamOutlined className="text-slate-400" />
                    <span>{invoice.numberOfTravelers} Travelers</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Notes Section */}
            {notes && (
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Itinerary Notes</h4>
                <p className="text-xs text-slate-650 leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-150 font-medium">
                  {notes}
                </p>
              </div>
            )}

            {/* Inclusions specifications list */}
            {isCustomCalc && (
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <span className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">
                  Select Specifications
                </span>
                <div className="space-y-1 text-xs text-slate-600 font-semibold">
                  {invoice.specialRequests?.split("### 💵 Invoice Cost Breakdown")[0]?.replace("### 🌟 Custom Calculator Specifications", "").trim().split("\n").map((line, idx) => {
                    if (line.startsWith("- **")) {
                      const matchPair = line.match(/\*\*(.*)\*\*(.*)/);
                      if (matchPair) {
                        return (
                          <div key={idx} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                            <span className="text-slate-400 uppercase text-[9px] font-bold">{matchPair[1].replace(":", "")}</span>
                            <span className="text-slate-850 font-black">{matchPair[2].replace(/[:-\s*]/g, "").trim()}</span>
                          </div>
                        );
                      }
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Pricing breakdown and Payment Box */}
          <div className="bg-slate-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full translate-x-12 -translate-y-12" />

            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase text-cyan-400 tracking-wider border-b border-white/10 pb-3">
                Payment Invoice Recipient
              </h3>

              {/* Itemized Cost Sheet */}
              {isCustomCalc && metrics ? (
                <div className="space-y-3.5 text-xs font-semibold text-slate-300">
                  <div className="flex justify-between">
                    <span>Base Travel Quote</span>
                    <span>${metrics.baseCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accommodation</span>
                    <span>${metrics.accommodationCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transportation Logistics</span>
                    <span>${metrics.transportCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Destinations Tickets</span>
                    <span>${metrics.destinationSurcharges.toLocaleString()}</span>
                  </div>
                  {metrics.activityCost > 0 && (
                    <div className="flex justify-between">
                      <span>Excursions Surcharges</span>
                      <span>${metrics.activityCost.toLocaleString()}</span>
                    </div>
                  )}
                  {metrics.addOnsCost > 0 && (
                    <div className="flex justify-between">
                      <span>Add-ons Cost</span>
                      <span>${metrics.addOnsCost.toLocaleString()}</span>
                    </div>
                  )}
                  {metrics.customCharges > 0 && (
                    <div className="flex justify-between text-amber-300 font-extrabold">
                      <span>Custom Agency Fee</span>
                      <span>+${metrics.customCharges.toLocaleString()}</span>
                    </div>
                  )}
                  {metrics.discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Group Discount</span>
                      <span>-${metrics.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Taxes & Service Fees</span>
                    <span>${metrics.taxes.toLocaleString()}</span>
                  </div>
                  
                  <div className="border-t border-white/10 pt-4 flex justify-between items-baseline mt-4">
                    <span className="text-sm font-black text-slate-100">Total Price</span>
                    <div className="text-right">
                      <span className="text-xl font-black text-cyan-400">${metrics.totalPrice.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">USD</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                    Custom invoice total will be calculated by the agency coordinators.
                  </p>
                </div>
              )}
            </div>

            {/* Checkouts / Status block */}
            <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
              <AnimatePresence mode="wait">
                {paySuccess ? (
                  <motion.div
                    key="paid"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-center space-y-2"
                  >
                    <CheckCircleOutlined className="text-2xl text-emerald-400" />
                    <span className="block text-sm font-black text-emerald-400 uppercase tracking-widest">
                      Invoice Paid
                    </span>
                    <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                      Your transaction was successfully processed. A copy of the receipt has been emailed to you.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="unpaid" className="space-y-4">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-2.5 text-amber-500 text-[11px] leading-normal font-semibold">
                      <InfoCircleOutlined className="text-sm mt-0.5 flex-shrink-0" />
                      <span>This is a secure checkout link. Transaction simulation does not process active real-world credit cards.</span>
                    </div>

                    <button
                      onClick={handleSimulatePayment}
                      disabled={isPaying || invoice.status === "rejected" || invoice.status === "cancelled"}
                      style={{ backgroundColor: "var(--brand-secondary)" }}
                      className="w-full py-3.5 hover:opacity-90 active:scale-[0.99] text-slate-900 font-black text-xs rounded-xl tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPaying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                          <span>Authorizing Card...</span>
                        </>
                      ) : (
                        <>
                          <CreditCardOutlined />
                          <span>Pay Invoice ${metrics ? metrics.totalPrice.toLocaleString() : "0"}</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-450 uppercase font-black tracking-wider mt-2.5">
                <SafetyCertificateOutlined className="text-xs" />
                <span>SSL Encrypted Transaction Portal</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
