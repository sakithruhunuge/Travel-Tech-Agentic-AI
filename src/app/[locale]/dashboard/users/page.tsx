"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import EmptyState from "@/components/dashboard/EmptyState";

interface UserData {
  _id: string;
  name: string;
  email: string;
  provider: string;
  createdAt?: string;
  status?: string;
}

export default function TenantUsersPage() {
  const { data: session } = useSession();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (userRole === "tenant_admin") {
      loadUsers();
    }
  }, [userRole]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tenant/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        throw new Error("Failed to load user list");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failure");
    } finally {
      setLoading(false);
    }
  };

  // Guard Access
  if (userRole !== "tenant_admin") {
    return (
      <div className="py-20 text-center text-slate-800">
        <EmptyState title="Access Denied" description="Only organization administrators can view customer accounts." />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      <div className="bg-white/40 backdrop-blur-md border border-slate-200 p-6 rounded-3xl">
        <h2 className="text-2xl font-black text-slate-900 leading-tight">Customer Registry</h2>
        <p className="text-slate-500 text-xs mt-1">Review accounts registered under your organization workspace.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 mx-auto" />
        </div>
      ) : error ? (
        <EmptyState title="Registry Load Error" description={error} />
      ) : users.length === 0 ? (
        <div className="py-12 bg-white/30 rounded-3xl border border-slate-200 p-8">
          <EmptyState title="No Customers Registered" description="Accounts created under your domain will display here." />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Sign-in Method</th>
                  <th className="px-6 py-4">Registration Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {u.name}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-650">
                      {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 border border-slate-200/50 rounded-lg text-slate-600 uppercase">
                        {u.provider || "credentials"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-semibold">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Historical"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {u.status || "active"}
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
  );
}
