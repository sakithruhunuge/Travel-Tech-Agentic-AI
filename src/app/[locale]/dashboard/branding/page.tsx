"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTenant } from "@/context/TenantBrandingContext";
import EmptyState from "@/components/dashboard/EmptyState";
import LogoUpload from "@/components/LogoUpload";

export default function TenantBrandingPage() {
  const { data: session } = useSession();
  const tenant = useTenant();

  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#FF8B50");
  const [secondaryColor, setSecondaryColor] = useState("#25A5FE");
  const [tagline, setTagline] = useState("");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (tenant?.branding) {
      setLogoUrl(tenant.branding.logoUrl || "");
      setPrimaryColor(tenant.branding.primaryColor || "#FF8B50");
      setSecondaryColor(tenant.branding.secondaryColor || "#25A5FE");
      setTagline(tenant.branding.tagline || "");
    }
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setIsSaving(true);

    try {
      const res = await fetch("/api/tenant/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl,
          primaryColor,
          secondaryColor,
          tagline,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update branding settings");
      } else {
        setSuccess("Branding settings saved successfully! Reloading to apply changes...");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      setError("Failed to save changes due to a communication timeout");
    } finally {
      setIsSaving(false);
    }
  };

  // Guard Access
  if (userRole !== "tenant_admin") {
    return (
      <div className="py-20 text-center text-slate-800">
        <EmptyState title="Access Denied" description="Only organization administrators can configure portal branding." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 text-left">
      <div className="bg-white/40 backdrop-blur-md border border-slate-200 p-6 rounded-3xl">
        <h2 className="text-2xl font-black text-slate-900 leading-tight">Branding Customizer</h2>
        <p className="text-slate-500 text-xs mt-1">Configure look-and-feel variables of your booking portal.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 px-4 py-3 rounded-2xl text-xs font-semibold mb-6">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-2xl text-xs font-semibold mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">Company Name</label>
            <input
              type="text"
              disabled
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-400 font-semibold focus:outline-none"
              value={tenant.name || ""}
            />
            <span className="text-[10px] text-slate-400 font-medium mt-1.5 block">Organization name settings cannot be edited directly from tenant panels.</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">Logo Image</label>
            <LogoUpload
              value={logoUrl}
              onChange={setLogoUrl}
              disabled={isSaving}
              theme="light"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">Brand Tagline</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-800 transition"
              placeholder="Crafting premium Ceylon escapes"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="w-10 h-10 border border-slate-200 bg-white rounded-xl cursor-pointer"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-800 transition font-mono uppercase"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="w-10 h-10 border border-slate-200 bg-white rounded-xl cursor-pointer"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-800 transition font-mono uppercase"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-md"
            >
              {isSaving ? "Saving Configuration..." : "Save Branding Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
