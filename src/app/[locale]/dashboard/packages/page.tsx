"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import EmptyState from "@/components/dashboard/EmptyState";

interface PackageData {
  _id: string;
  id: string; // slug
  name: string;
  duration: string;
  destinations: string[];
  includes: string[];
  image: string;
  priceRange: string;
  rating: string;
  status: string;
}

export default function TenantPackagesPage() {
  const { data: session } = useSession();

  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PackageData | null>(null);

  // Form values
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [duration, setDuration] = useState("");
  const [destinations, setDestinations] = useState("");
  const [includes, setIncludes] = useState("");
  const [image, setImage] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [rating, setRating] = useState("");
  const [status, setStatus] = useState("active");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (userRole === "tenant_admin") {
      loadPackages();
    }
  }, [userRole]);

  const loadPackages = async () => {
    setLoading(true);
    try {
      // By default, GET /api/packages returns all packages for Tenant Admins
      const res = await fetch("/api/packages?limit=50");
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
      } else {
        throw new Error("Failed to load packages");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failure");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingPkg(null);
    setName("");
    setSlug("");
    setDuration("");
    setDestinations("");
    setIncludes("");
    setImage("");
    setPriceRange("");
    setRating("");
    setStatus("active");
    setFormError("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (pkg: PackageData) => {
    setEditingPkg(pkg);
    setName(pkg.name);
    setSlug(pkg.id);
    setDuration(pkg.duration);
    setDestinations(pkg.destinations.join(", "));
    setIncludes(pkg.includes.join(", "));
    setImage(pkg.image);
    setPriceRange(pkg.priceRange);
    setRating(pkg.rating);
    setStatus(pkg.status);
    setFormError("");
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    const payload = {
      name,
      slug,
      duration,
      destinations: destinations.split(",").map((s) => s.trim()).filter(Boolean),
      includes: includes.split(",").map((s) => s.trim()).filter(Boolean),
      image,
      priceRange,
      rating,
      status,
    };

    try {
      const url = editingPkg ? `/api/packages/${editingPkg._id}` : "/api/packages";
      const method = editingPkg ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save package");
      } else {
        setIsFormOpen(false);
        loadPackages();
      }
    } catch (err) {
      setFormError("Server communications timed out");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm("Are you sure you want to archive this travel package? Archived packages will no longer be bookable.")) return;

    try {
      const res = await fetch(`/api/packages/${id}`, {
        method: "DELETE", // Soft delete triggers status='archived' on the server
      });
      if (res.ok) {
        loadPackages();
      }
    } catch (err) {
      console.error("Archive package failed:", err);
    }
  };

  // Guard Access
  if (userRole !== "tenant_admin") {
    return (
      <div className="py-20 text-center text-slate-800">
        <EmptyState title="Access Denied" description="Only organization administrators can configure travel packages." />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      <div className="flex justify-between items-center bg-white/40 backdrop-blur-md border border-slate-200 p-6 rounded-3xl">
        <div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">Manage Tour Packages</h2>
          <p className="text-slate-500 text-xs mt-1">Configure premium, custom journeys for your portal.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-md"
        >
          + Add Travel Package
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 mx-auto" />
        </div>
      ) : error ? (
        <EmptyState title="Data Load Error" description={error} />
      ) : packages.length === 0 ? (
        <div className="py-12 bg-white/30 rounded-3xl border border-slate-200 p-8">
          <EmptyState title="No Packages Found" description="Get started by seeding or creating your first package itinerary." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg._id}
              className="flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition group"
            >
              <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pkg.image}
                  alt={pkg.name}
                  className="h-full w-full object-cover group-hover:scale-102 transition duration-300"
                />
                <span className={`absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  pkg.status === "active"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : pkg.status === "draft"
                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    : "bg-slate-500/10 text-slate-650 border border-slate-500/20"
                }`}>
                  {pkg.status}
                </span>
              </div>

              <div className="p-5 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base leading-snug group-hover:text-brand-secondary transition">
                    {pkg.name}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-2">
                    🕒 {pkg.duration} | ⭐ {pkg.rating}
                  </p>
                  <p className="text-xs font-bold text-slate-600 mt-2">
                    💵 Price Range: {pkg.priceRange}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {pkg.destinations.slice(0, 3).map((dest, i) => (
                      <span key={i} className="bg-slate-100 text-[10px] px-2 py-0.5 rounded-md font-semibold text-slate-600">
                        {dest}
                      </span>
                    ))}
                    {pkg.destinations.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 font-bold text-slate-400">
                        +{pkg.destinations.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(pkg)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                  >
                    Edit Package
                  </button>
                  {pkg.status !== "archived" && (
                    <button
                      onClick={() => handleArchive(pkg._id)}
                      className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold rounded-lg transition"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingPkg ? "Edit Package Details" : "Create Travel Package"}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-900 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-left">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Package Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-800 transition"
                    placeholder="Wonders of Kandy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Package Slug</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-800 transition font-mono"
                    placeholder="wonders-of-kandy"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Duration</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-800 transition"
                    placeholder="3 Days"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Price Range</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-800 transition"
                    placeholder="$399 - $599"
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rating</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-800 transition"
                    placeholder="4.8"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Image URL</label>
                <input
                  type="url"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-800 transition"
                  placeholder="https://images.unsplash.com/..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Destinations (Comma-separated)</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-800 transition"
                  placeholder="Kandy, Sigiriya, Pinnawala"
                  value={destinations}
                  onChange={(e) => setDestinations(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Inclusions (Comma-separated)</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-800 transition h-20"
                  placeholder="Breakfast included, Guide driver, Entry passes"
                  value={includes}
                  onChange={(e) => setIncludes(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-800 transition"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Active (Visible to public)</option>
                  <option value="draft">Draft (Under review)</option>
                  <option value="archived">Archived (Soft deleted)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
                >
                  {isSubmitting ? "Saving..." : "Save Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
