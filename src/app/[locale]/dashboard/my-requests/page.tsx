"use client";

import { useEffect, useState } from "react";
import RequestCard, { type RequestCardData } from "@/components/dashboard/RequestCard";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import EmptyState from "@/components/dashboard/EmptyState";
import { useTranslations } from "next-intl";

export default function MyRequestsPage() {
    const [requests, setRequests] = useState<RequestCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const t = useTranslations("Dashboard.MyRequests");

    const loadRequests = async () => {
        try {
            const res = await fetch("/api/travel-requests");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load requests");
            setRequests(data.requests || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleCancel = async (id: string) => {
        try {
            setCancellingId(id);
            const res = await fetch(`/api/travel-requests/${id}/cancel`, { method: "PATCH" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to cancel request");
            await loadRequests();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to cancel request");
        } finally {
            setCancellingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-brand-light/70 bg-brand-light p-6 shadow-[0_2px_8px_rgb(0,0,0,0.04)]">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">{t("category")}</p>
                <h2 className="mt-1 text-xl font-semibold text-brand-dark">{t("title")}</h2>
                <p className="mt-1 text-sm text-brand-muted">
                    {t("description")}
                </p>
            </div>

            {loading ? (
                <LoadingSkeleton />
            ) : error ? (
                <EmptyState title={t("unableLoad")} description={error} />
            ) : requests.length === 0 ? (
                <EmptyState
                    title={t("noRequestsYet")}
                    description={t("submitRequestDesc")}
                />
            ) : (
                <div className="grid gap-4">
                    {requests.map((request) => (
                        <RequestCard
                            key={request._id}
                            request={request}
                            onCancel={handleCancel}
                            isCancelling={cancellingId === request._id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
