"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import RequestCard, { type RequestCardData } from "@/components/dashboard/RequestCard";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import EmptyState from "@/components/dashboard/EmptyState";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/context/CurrencyContext";

export default function RequestHistoryPage() {
    const searchParams = useSearchParams();
    const selectedId = searchParams.get("id");
    const [requests, setRequests] = useState<RequestCardData[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<RequestCardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const t = useTranslations("Dashboard.RequestHistory");
    const { formatPriceString } = useCurrency();

    useEffect(() => {
        const loadRequests = async () => {
            try {
                const res = await fetch("/api/travel-requests");
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to load history");
                setRequests(data.requests || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load history");
            } finally {
                setLoading(false);
            }
        };

        loadRequests();
    }, []);

    useEffect(() => {
        if (!selectedId) {
            setSelectedRequest(null);
            return;
        }

        const request = requests.find((item) => item._id === selectedId);
        setSelectedRequest(request || null);
    }, [requests, selectedId]);

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-brand-light/70 bg-brand-light p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)]">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">{t("category")}</p>
                <h2 className="mt-1 text-xl font-semibold text-brand-dark">{t("title")}</h2>
                <p className="mt-1 text-sm text-brand-muted">
                    {t("description")}
                </p>
            </div>

            {selectedRequest ? (
                <div className="rounded-xl border border-brand-light/70 bg-brand-light p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-light/70 pb-4">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">
                                {t("requestDetails")}
                            </p>
                            <h3 className="mt-1 text-lg font-semibold text-brand-dark">
                                {selectedRequest.packageName}
                            </h3>
                        </div>
                        <StatusBadge status={selectedRequest.status} />
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border border-brand-light/70 bg-brand-light p-4">
                            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">
                                {t("travelerCount")}
                            </p>
                            <p className="mt-1 tabular-nums text-lg font-medium text-brand-dark">
                                {selectedRequest.numberOfTravelers}
                            </p>
                        </div>
                        <div className="rounded-lg border border-brand-light/70 bg-brand-light p-4">
                            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">{t("travelDate")}</p>
                            <p className="mt-1 tabular-nums text-lg font-medium text-brand-dark">
                                {new Date(selectedRequest.preferredStartDate).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="rounded-lg border border-brand-light/70 bg-brand-light p-5 md:col-span-2">
                            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted mb-3">
                                {t("specialRequests")}
                            </p>
                            <div className="text-sm font-medium text-brand-dark space-y-1 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                {(() => {
                                    const text = selectedRequest.specialRequests;
                                    if (!text) return <p className="text-slate-500 italic">{t("none")}</p>;
                                    
                                    // Strip out the internal JSON metadata block
                                    const cleanedText = text.replace(/### 📦 Metadata Store\s*```json[\s\S]*?```\s*/i, "");
                                    
                                    return cleanedText.split('\n').map((line, idx) => {
                                        // Headers
                                        if (line.startsWith('### ')) {
                                            return <h4 key={idx} className="mt-5 mb-3 font-black text-brand-dark text-sm tracking-wide border-b border-slate-100 pb-2 first:mt-0 flex items-center gap-2">{formatPriceString(line.replace('### ', ''))}</h4>;
                                        }
                                        
                                        // Bold key-value list items
                                        if (line.trim().startsWith('- **')) {
                                            const parts = line.replace('- **', '').split('**:');
                                            if (parts.length >= 2) {
                                                return (
                                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 border-b border-slate-50 border-dashed last:border-0 hover:bg-slate-50/50 px-2 rounded transition-colors">
                                                        <span className="font-semibold text-slate-700">{parts[0]}</span>
                                                        <span className="text-slate-600 sm:text-right">{formatPriceString(parts.slice(1).join('**:').trim())}</span>
                                                    </div>
                                                );
                                            }
                                        }
                                        
                                        // Normal list items
                                        if (line.trim().startsWith('- ')) {
                                            return <div key={idx} className="ml-2 py-1 text-slate-600 flex items-start px-2"><span className="mr-2 text-brand-secondary/50 font-bold">•</span>{formatPriceString(line.replace('- ', ''))}</div>;
                                        }
                                        
                                        // Empty lines
                                        if (!line.trim()) return <div key={idx} className="h-2"></div>;
                                        
                                        // Normal text
                                        return <p key={idx} className="text-slate-600 text-sm py-1 px-2">{formatPriceString(line)}</p>;
                                    });
                                })()}
                            </div>
                        </div>
                    </div>

                    {selectedRequest.status === "approved" ? (
                        <div className="mt-5 rounded-lg border border-brand-secondary/30 bg-brand-secondary/10 p-4 text-sm text-brand-secondary">
                            {t("willContact")}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {loading ? (
                <LoadingSkeleton />
            ) : error ? (
                <EmptyState title={t("unableLoad")} description={error} />
            ) : requests.length === 0 ? (
                <EmptyState
                    title={t("noHistoryFound")}
                    description={t("pastRequestsDesc")}
                />
            ) : (
                <div className="grid gap-4">
                    {requests.map((request) => (
                        <RequestCard key={request._id} request={request} showActions={false} />
                    ))}
                </div>
            )}
        </div>
    );
}
