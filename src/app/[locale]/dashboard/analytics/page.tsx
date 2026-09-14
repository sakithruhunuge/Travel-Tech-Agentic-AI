"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import EmptyState from "@/components/dashboard/EmptyState";

interface RequestData {
  _id: string;
  packageName: string;
  numberOfTravelers: number;
  status: string;
}

export default function TenantAnalyticsPage() {
  const { data: session } = useSession();

  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (userRole === "tenant_admin") {
      loadRequests();
    }
  }, [userRole]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/travel-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      } else {
        throw new Error("Failed to load requests for analytics");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failure");
    } finally {
      setLoading(false);
    }
  };

  // Client-side analytics aggregations
  const totalBookings = requests.length;

  const statusCounts = requests.reduce(
    (acc, r) => {
      const statusKey = r.status || "pending";
      acc[statusKey] = (acc[statusKey] || 0) + 1;
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0, cancelled: 0 } as Record<string, number>
  );

  const totalTravelers = requests.reduce((sum, r) => sum + (r.numberOfTravelers || 0), 0);

  // Group by packages selected
  const packagePopularityMap = requests.reduce((acc, r) => {
    const pkg = r.packageName || "Custom/Unknown Itinerary";
    acc[pkg] = (acc[pkg] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const popularPackages = Object.entries(packagePopularityMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Guard Access
  if (userRole !== "tenant_admin") {
    return (
      <div className="py-20 text-center text-slate-800">
        <EmptyState title="Access Denied" description="Only organization administrators can view portal analytics." />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      <div className="bg-white/40 backdrop-blur-md border border-slate-200 p-6 rounded-3xl">
        <h2 className="text-2xl font-black text-slate-900 leading-tight">Analytics Reports</h2>
        <p className="text-slate-500 text-xs mt-1">Review operational metrics and customer travel trends.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 mx-auto" />
        </div>
      ) : error ? (
        <EmptyState title="Analytics Load Error" description={error} />
      ) : (
        <div className="space-y-8">
          {/* Key Metrics grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Bookings</span>
              <span className="block text-3xl font-black text-slate-900 mt-2">{totalBookings}</span>
              <p className="text-[10px] text-slate-400 font-semibold mt-2">Overall booking requests submitted.</p>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Approved Bookings</span>
              <span className="block text-3xl font-black text-emerald-600 mt-2">{statusCounts.approved}</span>
              <p className="text-[10px] text-slate-400 font-semibold mt-2">Successful trips confirmed.</p>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Travelers Moved</span>
              <span className="block text-3xl font-black text-blue-600 mt-2">{totalTravelers}</span>
              <p className="text-[10px] text-slate-400 font-semibold mt-2">Aggregated number of guests.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Status counts card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3">Booking Status Breakdown</h3>
              <div className="mt-6 space-y-4">
                {[
                  { label: "Approved Bookings", count: statusCounts.approved, colorClass: "bg-emerald-500" },
                  { label: "Pending Reviews", count: statusCounts.pending, colorClass: "bg-amber-500" },
                  { label: "Rejected Requests", count: statusCounts.rejected, colorClass: "bg-red-500" },
                  { label: "Cancelled Bookings", count: statusCounts.cancelled, colorClass: "bg-slate-400" },
                ].map((item) => {
                  const pct = totalBookings > 0 ? (item.count / totalBookings) * 100 : 0;
                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{item.label}</span>
                        <span>{item.count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${item.colorClass}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Popular packages card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3">Popular Tour Packages</h3>
              <div className="mt-5 space-y-3">
                {popularPackages.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm font-semibold">No data available.</div>
                ) : (
                  popularPackages.map((pkg, idx) => (
                    <div key={pkg.name} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition">
                      <div className="flex items-center gap-3">
                        <span className="h-6 w-6 bg-slate-200 text-[10px] font-black rounded-lg flex items-center justify-center text-slate-650">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-extrabold text-slate-800">{pkg.name}</span>
                      </div>
                      <span className="text-xs font-black text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                        {pkg.count} bookings
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
