"use client";

import React, { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LogoUpload from "@/components/LogoUpload";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  plan: string;
  status: string;
  requestCount: number;
  customerCount: number;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    tagline?: string;
  };
}

interface BookingDay {
  day: string;
  date: string;
  bookings: number;
}

interface TopAgency {
  name: string;
  cust: number;
  requests: number;
  plan: string;
  status: string;
}

interface CustomerData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  tenantName: string;
  createdAt: string;
}

interface RequestData {
  id: string;
  userName: string;
  userEmail: string;
  packageName: string;
  numberOfTravelers: number;
  submittedTotal: number;
  source: string;
  status: string;
  tenantName: string;
  createdAt: string;
}

interface StatsData {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalRequests: number;
  pendingRequests?: number;
  planBreakdown: Record<string, number>;
  bookingDays?: BookingDay[];
  topAgencies?: TopAgency[];
}

export default function SuperAdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [requestFilter, setRequestFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [stats, setStats] = useState<StatsData>({
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    totalRequests: 0,
    pendingRequests: 0,
    planBreakdown: {},
    bookingDays: [],
    topAgencies: [],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [activeNav, setActiveNav] = useState("dashboard");
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantSlug, setNewTenantSlug] = useState("");
  const [newTenantDomain, setNewTenantDomain] = useState("");
  const [newTenantPlan, setNewTenantPlan] = useState("free");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantData | null>(null);
  const [brandLogo, setBrandLogo] = useState("");
  const [brandPrimary, setBrandPrimary] = useState("#FF8B50");
  const [brandSecondary, setBrandSecondary] = useState("#25A5FE");
  const [brandTagline, setBrandTagline] = useState("");
  const [brandError, setBrandError] = useState("");
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  const isSuperAdmin = session?.user && (session.user as any).role === "super_admin";
  useEffect(() => { if (isSuperAdmin) loadTenants(); }, [isSuperAdmin]);

  const loadTenants = async () => {
    setIsLoadingRegistry(true);
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
        setCustomers(data.customers || []);
        setRequests(data.requests || []);
        setStats(data.stats || { totalTenants: 0, activeTenants: 0, suspendedTenants: 0, totalRequests: 0, planBreakdown: {} });
      }
    } catch (err) { console.error("Failed to load tenants:", err); }
    finally { setIsLoadingRegistry(false); }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(""); setIsSubmittingLogin(true);
    try {
      const result = await signIn("credentials", { redirect: false, email: email.trim(), password });
      if (result?.error) {
        setLoginError(result.error);
      } else {
        window.location.reload();
      }
    } catch { setLoginError("Unexpected login failure"); }
    finally { setIsSubmittingLogin(false); }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault(); setCreateError(""); setIsCreating(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTenantName, slug: newTenantSlug || undefined, customDomain: newTenantDomain || undefined, plan: newTenantPlan, adminName: newAdminName, adminEmail: newAdminEmail, adminPassword: newAdminPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || "Failed to create tenant"); }
      else {
        setIsCreateOpen(false);
        setNewTenantName(""); setNewTenantSlug(""); setNewTenantDomain(""); setNewTenantPlan("free");
        setNewAdminName(""); setNewAdminEmail(""); setNewAdminPassword("");
        loadTenants();
      }
    } catch { setCreateError("Communication failure during registration"); }
    finally { setIsCreating(false); }
  };

  const handleToggleSuspension = async (tenant: TenantData) => {
    const nextStatus = tenant.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      if (res.ok) loadTenants();
    } catch { console.error("Toggle failed"); }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!window.confirm("Permanently delete this organization? This is irreversible.")) return;
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, { method: "DELETE" });
      if (res.ok) loadTenants();
    } catch { console.error("Deletion failed"); }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingTenant) return;
    setBrandError(""); setIsSavingBranding(true);
    try {
      const res = await fetch(`/api/admin/tenants/${editingTenant.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branding: { logoUrl: brandLogo, primaryColor: brandPrimary, secondaryColor: brandSecondary, tagline: brandTagline } }),
      });
      const data = await res.json();
      if (!res.ok) setBrandError(data.error || "Failed to update branding");
      else { setEditingTenant(null); loadTenants(); }
    } catch { setBrandError("Server timeout during branding update"); }
    finally { setIsSavingBranding(false); }
  };

  const openBrandingModal = (tenant: TenantData) => {
    setEditingTenant(tenant); setBrandLogo(tenant.branding?.logoUrl || "");
    setBrandPrimary(tenant.branding?.primaryColor || "#FF8B50");
    setBrandSecondary(tenant.branding?.secondaryColor || "#25A5FE");
    setBrandTagline(tenant.branding?.tagline || "");
  };

  const filteredTenants = tenants.filter((tenant) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      tenant.name.toLowerCase().includes(q) ||
      tenant.slug.toLowerCase().includes(q) ||
      (tenant.customDomain && tenant.customDomain.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;
    const matchesPlan = planFilter === "all" || tenant.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const filteredCustomers = customers.filter((customer) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      customer.name.toLowerCase().includes(q) ||
      customer.email.toLowerCase().includes(q) ||
      customer.tenantName.toLowerCase().includes(q) ||
      customer.role.toLowerCase().includes(q)
    );
  });

  const filteredRequests = requests.filter((req) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      req.userName.toLowerCase().includes(q) ||
      req.userEmail.toLowerCase().includes(q) ||
      req.packageName.toLowerCase().includes(q) ||
      req.tenantName.toLowerCase().includes(q);
    const matchesStatus = requestFilter === "all" || req.status === requestFilter;
    return matchesSearch && matchesStatus;
  });

  if (sessionStatus === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#6366f1", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#eef2ff 0%,#faf5ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',system-ui,sans-serif", padding: "1rem" }}>
        <div style={{ maxWidth: 420, width: "100%", background: "#fff", borderRadius: 18, padding: "2.5rem", boxShadow: "0 20px 60px rgba(99,102,241,.12),0 4px 16px rgba(0,0,0,.06)", border: "1px solid #e8eaf0" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 10, padding: "7px 16px", marginBottom: 14 }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>HORIZON SAAS CORE</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>SuperAdmin Portal</h1>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>Sign in with platform authority credentials</p>
          </div>
          {loginError && (<div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 9, padding: "10px 14px", fontSize: 12, fontWeight: 600, marginBottom: 20 }}>{loginError}</div>)}
          <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 6 }}>Platform Email</label>
              <input type="email" required style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", background: "#f8fafc", boxSizing: "border-box" as const }} placeholder="admin@travelcompany.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 6 }}>Consular Password</label>
              <input type="password" required style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", background: "#f8fafc", boxSizing: "border-box" as const }} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={isSubmittingLogin} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: isSubmittingLogin ? "not-allowed" : "pointer", marginTop: 8, boxShadow: "0 4px 12px rgba(99,102,241,.3)", opacity: isSubmittingLogin ? .7 : 1 }}>
              {isSubmittingLogin ? "Authenticating..." : "Access Console"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',system-ui,sans-serif}
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #f8fafc; }
    ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; border: 1.5px solid #f8fafc; }
    ::-webkit-scrollbar-thumb:hover { background: #6366f1; }
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .sa-wrap{display:flex;min-height:100vh;font-family:'Inter',system-ui,sans-serif;background:#f1f5f9}
    .sa-sidebar{width:280px;min-width:280px;background:#fff;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:40}
    .sa-logo{display:flex;align-items:center;justify-content:center;padding:14px;border-bottom:1px solid #f1f5f9;min-height:60px}
    .sa-logo-img{height:36px;width:auto;max-width:168px;object-fit:contain;object-position:center;display:block}
    .sa-nav-section{padding:14px 10px 2px}
    .sa-nav-label{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;padding:0 8px;margin-bottom:4px}
    .sa-nav-item{display:flex;align-items:center;gap:9px;padding:10px 14px;border-radius:7px;color:#64748b;font-size:15px;font-weight:500;cursor:pointer;transition:all .15s;margin-bottom:1px}
    .sa-nav-item:hover{background:#f8fafc;color:#1e293b}
    .sa-nav-item.active{background:linear-gradient(135deg,#eef2ff,#f3f0ff);color:#6366f1;font-weight:600}
    .sa-nav-badge{margin-left:auto;background:#6366f1;color:#fff;font-size:10px;font-weight:700;border-radius:999px;padding:1px 7px}
    .sa-nav-chip{margin-left:auto;background:#fef3c7;color:#d97706;font-size:9px;font-weight:700;letter-spacing:.04em;border-radius:4px;padding:2px 5px}
    .sa-sidebar-footer{margin-top:auto;padding:14px 10px;border-top:1px solid #f1f5f9}
    .sa-team-card{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:9px;background:#f8fafc;cursor:pointer;margin-bottom:8px;transition:background .15s}
    .sa-team-card:hover{background:#f1f5f9}
    .sa-team-av{width:30px;height:30px;border-radius:7px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;flex-shrink:0}
    .sa-team-name{font-size:12px;font-weight:700;color:#1e293b}
    .sa-team-role{font-size:10px;color:#94a3b8}
    .sa-upgrade{width:100%;padding:8px;background:#fff;border:1.5px solid #e2e8f0;border-radius:7px;font-size:12px;font-weight:600;color:#64748b;cursor:pointer;transition:all .15s}
    .sa-upgrade:hover{border-color:#6366f1;color:#6366f1}
    .sa-main{margin-left:280px;flex:1;display:flex;flex-direction:column;min-height:100vh}
    .sa-topbar{background:#fff;border-bottom:1px solid #e2e8f0;padding:0 26px;height:62px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:30;box-shadow:0 1px 3px rgba(0,0,0,.04)}
    .sa-topbar-title{font-size:19px;font-weight:800;color:#0f172a}
    .sa-topbar-right{display:flex;align-items:center;gap:10px}
    .sa-search{display:flex;align-items:center;gap:7px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:7px;padding:6px 12px;color:#94a3b8;font-size:12.5px;cursor:text;transition:border .15s}
    .sa-search:hover{border-color:#c7d0dc}
    .sa-kbd{font-size:10px;color:#c7d0dc;background:#f1f5f9;border-radius:4px;padding:1px 6px;margin-left:8px}
    .sa-icon-btn{width:34px;height:34px;border-radius:7px;background:transparent;border:none;display:flex;align-items:center;justify-content:center;color:#64748b;cursor:pointer;transition:all .15s;flex-shrink:0}
    .sa-icon-btn:hover{background:#f1f5f9;border-color:#c7d0dc}
    .sa-profile{display:flex;align-items:center;gap:9px;background:transparent;border:none;border-radius:9px;padding:5px 12px 5px 7px;cursor:pointer;transition:background .15s}
    .sa-profile:hover{background:#f1f5f9}
    .sa-profile-av{width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;flex-shrink:0}
    .sa-profile-name{font-size:12.5px;font-weight:700;color:#1e293b}
    .sa-profile-role{font-size:9.5px;color:#94a3b8;font-weight:500}
    .sa-logout{padding:6px 13px;background:#fff;border:1.5px solid #e2e8f0;border-radius:7px;font-size:12px;font-weight:600;color:#64748b;cursor:pointer;transition:all .15s}
    .sa-logout:hover{border-color:#fecdd3;color:#e11d48;background:#fff1f2}
    .sa-body{padding:26px;flex:1;animation:fadeUp .3s ease}
    .sa-stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:26px}
    .sa-stat-card{background:#fff;border-radius:13px;padding:19px 20px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.04);display:flex;justify-content:space-between;align-items:flex-start;transition:transform .2s,box-shadow .2s}
    .sa-stat-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.08)}
    .sa-stat-label{font-size:10.5px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em}
    .sa-stat-val{font-size:28px;font-weight:800;color:#0f172a;margin-top:5px;line-height:1}
    .sa-stat-badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;border-radius:6px;padding:2px 7px;margin-top:7px}
    .sa-stat-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .sa-section{background:#fff;border-radius:15px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.04);overflow:hidden}
    .sa-section-hd{padding:18px 22px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center}
    .sa-section-title{font-size:15px;font-weight:800;color:#0f172a}
    .sa-section-sub{font-size:11.5px;color:#94a3b8;margin-top:2px}
    .sa-create-btn{padding:8px 17px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;box-shadow:0 3px 10px rgba(99,102,241,.25);transition:all .15s;white-space:nowrap}
    .sa-create-btn:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(99,102,241,.35)}
    .sa-orgs{padding:20px;display:flex;flex-direction:column;gap:14px}
    .sa-org-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:13px;padding:18px 20px;transition:box-shadow .2s,border-color .2s}
    .sa-org-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.07);border-color:#c7d0dc}
    .sa-org-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
    .sa-org-name{font-size:14.5px;font-weight:800;color:#0f172a}
    .sa-org-id{font-size:9.5px;color:#94a3b8;font-family:'Courier New',monospace;margin-top:3px}
    .sa-badge-row{display:flex;align-items:center;gap:7px}
    .sa-plan-badge{font-size:9.5px;font-weight:700;letter-spacing:.06em;padding:3px 8px;border-radius:5px;text-transform:uppercase;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0}
    .sa-status-badge{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.04em}
    .sa-dot{width:6px;height:6px;border-radius:50%;display:inline-block}
    .sa-org-body{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:14px}
    .sa-info-label{font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
    .sa-info-val{font-size:12.5px;font-weight:600;color:#374151}
    .sa-info-sub{font-size:11px;color:#6366f1;margin-top:2px}
    .sa-metrics{display:flex;gap:18px}
    .sa-metric{display:flex;align-items:center;gap:6px}
    .sa-metric-val{font-size:13px;font-weight:700;color:#374151}
    .sa-metric-lbl{font-size:10.5px;color:#94a3b8}
    .sa-divider{border:none;border-top:1px solid #e2e8f0;margin:0 0 13px}
    .sa-actions{display:flex;gap:7px;flex-wrap:wrap}
    .sa-btn{padding:6px 14px;border-radius:7px;font-size:12px;font-weight:600;border:1.5px solid transparent;cursor:pointer;transition:all .15s}
    .sa-btn-ghost{background:#fff;border-color:#e2e8f0;color:#374151}
    .sa-btn-ghost:hover{border-color:#6366f1;color:#6366f1;background:#eef2ff}
    .sa-btn-warn{background:#fffbeb;border-color:#fde68a;color:#d97706}
    .sa-btn-warn:hover{background:#fef3c7;border-color:#f59e0b}
    .sa-btn-success{background:#f0fdf4;border-color:#bbf7d0;color:#16a34a}
    .sa-btn-success:hover{background:#dcfce7;border-color:#86efac}
    .sa-btn-danger{background:#fff1f2;border-color:#fecdd3;color:#e11d48}
    .sa-btn-danger:hover{background:#ffe4e6;border-color:#fda4af}
    .sa-center{padding:56px 20px;text-align:center;color:#94a3b8;font-size:13.5px;font-weight:500}
    .sa-spinner{width:26px;height:26px;border-radius:50%;border:3px solid #e2e8f0;border-top-color:#6366f1;animation:spin .8s linear infinite;margin:0 auto 10px}
    .sa-footer{background:#fff;border-top:1px solid #e2e8f0;padding:14px 26px;text-align:center;color:#94a3b8;font-size:11.5px;font-weight:500}
    .sa-backdrop{position:fixed;inset:0;z-index:50;background:rgba(15,23,42,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px}
    .sa-modal{background:#fff;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 24px 80px rgba(0,0,0,.16);width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;animation:fadeUp .25s ease}
    .sa-modal-hd{padding:20px 24px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center}
    .sa-modal-title{font-size:16px;font-weight:800;color:#0f172a}
    .sa-modal-sub{font-size:11.5px;color:#94a3b8;margin-top:2px}
    .sa-modal-close{width:28px;height:28px;border-radius:6px;background:#f1f5f9;border:none;font-size:15px;color:#64748b;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
    .sa-modal-close:hover{background:#fee2e2;color:#dc2626}
    .sa-modal-body{padding:22px 24px;overflow-y:auto;flex:1}
    .sa-modal-ft{padding:14px 24px;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end;gap:9px}
    .sa-field{margin-bottom:14px}
    .sa-field-label{display:block;font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px}
    .sa-input{width:100%;padding:9px 12px;border-radius:8px;border:1.5px solid #e2e8f0;font-size:13px;color:#0f172a;background:#f8fafc;outline:none;transition:border .2s;font-family:inherit}
    .sa-input:focus{border-color:#6366f1;background:#fff}
    .sa-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .sa-step-hd{font-size:10.5px;font-weight:800;color:#6366f1;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
    .sa-step-div{border:none;border-top:1px solid #f1f5f9;margin:18px 0}
    .sa-err{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:8px;padding:9px 13px;font-size:12px;font-weight:600;margin-bottom:14px}
    .sa-btn-primary{padding:8px 20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 3px 10px rgba(99,102,241,.25);transition:all .15s}
    .sa-btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(99,102,241,.35)}
    .sa-btn-primary:disabled{opacity:.6;cursor:not-allowed;transform:none}
    .sa-btn-secondary{padding:8px 16px;background:#f8fafc;border:1.5px solid #e2e8f0;color:#374151;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
    .sa-btn-secondary:hover{border-color:#c7d0dc;background:#f1f5f9}
    .sa-color-row{display:flex;gap:9px;align-items:center}
    .sa-color-swatch{width:38px;height:38px;border-radius:8px;border:1.5px solid #e2e8f0;cursor:pointer;flex-shrink:0}
    .sa-table-wrap{width:100%;overflow-x:auto;background:#fff;border-radius:13px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.04)}
    .sa-table{width:100%;border-collapse:collapse;text-align:left;font-size:12.5px}
    .sa-table th{background:#f8fafc;padding:13px 18px;font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0}
    .sa-table td{padding:14px 18px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:middle}
    .sa-table tr:hover td{background:#fafbfc}
    .sa-table tr:last-child td{border-bottom:none}
    .sa-chip-btn{padding:5px 13px;border-radius:7px;font-size:11.5px;font-weight:700;border:1px solid transparent;cursor:pointer;transition:all .15s}
    @media(max-width:900px){.sa-stat-grid{grid-template-columns:repeat(2,1fr)}.sa-org-body{grid-template-columns:1fr 1fr}.sa-sidebar{display:none}.sa-main{margin-left:0}}
  `;

  const getPageTitle = () => {
    switch (activeNav) {
      case "tenants": return "Tenant Organizations Directory";
      case "customers": return "Platform Customers & Agency Users";
      case "requests": return "Global Booking & Travel Requests";
      case "analytics": return "Platform Performance & Analytics";
      default: return "Global SuperAdmin Registry — Executive Overview";
    }
  };

  const getSearchPlaceholder = () => {
    switch (activeNav) {
      case "customers": return "Search customers by name, email, or space...";
      case "requests": return "Search requests by traveler, tour, or agency...";
      default: return "Search organizations by name, slug, or domain...";
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="sa-wrap">
        <aside className="sa-sidebar">
          <div className="sa-logo">
            <img src="/images/horizon.png" alt="Horizon SaaS Core" className="sa-logo-img" />
          </div>
          <div className="sa-nav-section">
            <div className="sa-nav-label">General</div>
            <div
              className={`sa-nav-item ${activeNav === "dashboard" ? "active" : ""}`}
              onClick={() => { setActiveNav("dashboard"); setSearchQuery(""); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              Dashboard
            </div>
            <div
              className={`sa-nav-item ${activeNav === "tenants" ? "active" : ""}`}
              onClick={() => { setActiveNav("tenants"); setStatusFilter("all"); setSearchQuery(""); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="1" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
              Organizations <span className="sa-nav-badge">{stats.totalTenants}</span>
            </div>
            <div
              className={`sa-nav-item ${activeNav === "customers" ? "active" : ""}`}
              onClick={() => { setActiveNav("customers"); setSearchQuery(""); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              Customers <span className="sa-nav-badge" style={{ background: "#8b5cf6" }}>{customers.length}</span>
            </div>
            <div
              className={`sa-nav-item ${activeNav === "requests" ? "active" : ""}`}
              onClick={() => { setActiveNav("requests"); setSearchQuery(""); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Requests {stats.pendingRequests ? <span className="sa-nav-badge" style={{ background: "#f59e0b" }}>{stats.pendingRequests}</span> : null}
            </div>
          </div>
          <div className="sa-nav-section">
            <div className="sa-nav-label">Tools</div>
            <div
              className={`sa-nav-item ${activeNav === "analytics" ? "active" : ""}`}
              onClick={() => { setActiveNav("analytics"); setSearchQuery(""); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></svg>
              Analytics
            </div>
          </div>
          <div className="sa-sidebar-footer">
            <button className="sa-logout" style={{ width: "100%", padding: "10px" }} onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}>Logout</button>
            <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '12px' }}>© 2026 Travel Platform Console</div>
          </div>
        </aside>

        <div className="sa-main">
          <header className="sa-topbar">
            <div className="sa-search" style={{ minWidth: '360px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                type="text"
                placeholder={getSearchPlaceholder()}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: '#0f172a' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', padding: '0 4px' }}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="sa-topbar-right">
              <div className="sa-icon-btn" title="Total Requests" onClick={() => setActiveNav("requests")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              </div>
              <div className="sa-profile">
                <div className="sa-profile-av">{session.user?.name?.charAt(0).toUpperCase() ?? "A"}</div>
                <div>
                  <div className="sa-profile-name">{session.user?.name ?? "Super Admin"}</div>
                  <div className="sa-profile-role">Platform Operator</div>
                </div>
              </div>
            </div>
          </header>

          <main className="sa-body">
            {/* Header Title & Subtitle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <div className="sa-topbar-title" style={{ fontSize: '22px', fontWeight: 700 }}>{getPageTitle()}</div>
                <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '3px' }}>
                  {activeNav === "dashboard" && "Comprehensive high-level oversight and metrics across all multi-tenant operations."}
                  {activeNav === "tenants" && "Configure, monitor, and provision white-labeled agency spaces and domains."}
                  {activeNav === "customers" && "Registered customer and agency administrator accounts across all tenants."}
                  {activeNav === "requests" && "Incoming AI and custom travel requests requiring quotes and fulfillment."}
                  {activeNav === "analytics" && "Historical booking volumes, tier distributions, and conversion telemetry."}
                </div>
              </div>
              {(activeNav === "dashboard" || activeNav === "tenants") && (
                <button className="sa-create-btn" onClick={() => setIsCreateOpen(true)}>+ Create Tenant Space</button>
              )}
            </div>

            {/* ══════════════════ TAB 1: DASHBOARD (EXECUTIVE OVERVIEW) ══════════════════ */}
            {activeNav === "dashboard" && (
              <>
                <div className="sa-stat-grid">
                  <div className="sa-stat-card">
                    <div>
                      <div className="sa-stat-label">Total Tenant Spaces</div>
                      <div className="sa-stat-val">{stats.totalTenants}</div>
                      <div className="sa-stat-badge" style={{ background: "#ede9fe", color: "#7c3aed" }}>↑ All time</div>
                    </div>
                    <div className="sa-stat-icon" style={{ background: "#ede9fe" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="1" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                    </div>
                  </div>
                  <div className="sa-stat-card">
                    <div>
                      <div className="sa-stat-label">Active Subscriptions</div>
                      <div className="sa-stat-val" style={{ color: "#059669" }}>{stats.activeTenants}</div>
                      <div className="sa-stat-badge" style={{ background: "#d1fae5", color: "#059669" }}>↑ Online</div>
                    </div>
                    <div className="sa-stat-icon" style={{ background: "#d1fae5" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    </div>
                  </div>
                  <div className="sa-stat-card">
                    <div>
                      <div className="sa-stat-label">Total Platform Users</div>
                      <div className="sa-stat-val" style={{ color: "#8b5cf6" }}>{customers.length}</div>
                      <div className="sa-stat-badge" style={{ background: "#ede9fe", color: "#8b5cf6" }}>↑ Accounts</div>
                    </div>
                    <div className="sa-stat-icon" style={{ background: "#ede9fe" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                    </div>
                  </div>
                  <div className="sa-stat-card">
                    <div>
                      <div className="sa-stat-label">Total User Bookings</div>
                      <div className="sa-stat-val" style={{ color: "#2563eb" }}>{stats.totalRequests}</div>
                      <div className="sa-stat-badge" style={{ background: "#dbeafe", color: "#2563eb" }}>↑ Requests</div>
                    </div>
                    <div className="sa-stat-icon" style={{ background: "#dbeafe" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    </div>
                  </div>
                </div>

                {/* ── Charts Row ── */}
                {(() => {
                  const planColors: Record<string, string> = { free: "#a5b4fc", basic: "#6366f1", premium: "#8b5cf6", enterprise: "#0f172a" };
                  const planData = stats.planBreakdown || {};
                  const planEntries = Object.entries(planData).filter(([, v]) => v > 0);
                  const planTotal = planEntries.reduce((s, [, v]) => s + v, 0);

                  const cx = 100, cy = 100, r = 76, sw = 32;
                  const circumference = 2 * Math.PI * r;
                  let offset = 0;
                  const arcs = planEntries.map(([plan, count]) => {
                    const pct = planTotal > 0 ? count / planTotal : 0;
                    const dash = pct * circumference;
                    const arc = { plan, count, pct, dash, offset };
                    offset += dash;
                    return arc;
                  });

                  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                  const defaultDays = Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return { day: dayNames[d.getDay()], date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), bookings: 0 };
                  });
                  const bookingDays = (stats.bookingDays && stats.bookingDays.length > 0) ? stats.bookingDays : defaultDays;

                  const W = 420, H = 140, PAD = { t: 14, r: 16, b: 32, l: 38 };
                  const maxB = Math.max(1, ...bookingDays.map(d => d.bookings));
                  const innerW = W - PAD.l - PAD.r;
                  const innerH = H - PAD.t - PAD.b;
                  const pts = bookingDays.map((d, i) => ({
                    x: PAD.l + (i / (bookingDays.length - 1)) * innerW,
                    y: PAD.t + innerH - (d.bookings / maxB) * innerH,
                    ...d,
                  }));
                  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
                  const areaPath = `M${pts[0].x},${PAD.t + innerH} ` + pts.map(p => `L${p.x},${p.y}`).join(" ") + ` L${pts[pts.length - 1].x},${PAD.t + innerH} Z`;

                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.7fr", gap: "18px", marginBottom: "26px" }}>
                      <div style={{ background: "#fff", borderRadius: "13px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.04)", padding: "22px 24px", display: "flex", flexDirection: "column" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>Plan Distribution</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "20px" }}>Real-time subscription tier breakdown</div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "32px" }}>
                          <svg width="180" height="180" viewBox="0 0 200 200" style={{ flexShrink: 0 }}>
                            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
                            {planTotal > 0 ? (
                              arcs.map(({ plan, dash, offset: o }) => (
                                <circle key={plan} cx={cx} cy={cy} r={r} fill="none" stroke={planColors[plan] ?? "#6366f1"} strokeWidth={sw} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-o + circumference * 0.25} strokeLinecap="butt" style={{ transition: "stroke-dasharray .6s ease" }} />
                              ))
                            ) : null}
                            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="26" fontWeight="800" fill="#0f172a">{planTotal}</text>
                            <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="#94a3b8">Tenants</text>
                          </svg>
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                            {planTotal > 0 ? (
                              arcs.map(({ plan, count, pct }) => (
                                <div key={plan} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: planColors[plan] ?? "#6366f1", flexShrink: 0 }} />
                                  <div style={{ flex: 1, fontSize: "12px", color: "#475569", textTransform: "capitalize", fontWeight: 600 }}>{plan}</div>
                                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>{count} <span style={{ color: "#c7d0dc" }}>({Math.round(pct * 100)}%)</span></div>
                                </div>
                              ))
                            ) : (
                              <div style={{ fontSize: "12px", color: "#94a3b8" }}>No active subscriptions yet.</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ background: "#fff", borderRadius: "13px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.04)", padding: "22px 24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Platform Booking Activity</div>
                            <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "16px" }}>Live bookings across all tenants — last 7 days</div>
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#6366f1", background: "#eef2ff", borderRadius: "6px", padding: "3px 10px" }}>
                            {bookingDays.reduce((s, d) => s + d.bookings, 0)} total
                          </div>
                        </div>
                        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
                            </linearGradient>
                          </defs>
                          {[0, 0.25, 0.5, 0.75, 1].map(f => {
                            const y = PAD.t + innerH - f * innerH;
                            return (
                              <g key={f}>
                                <line x1={PAD.l} y1={y} x2={PAD.l + innerW} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                                <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#c7d0dc">{Math.round(f * maxB)}</text>
                              </g>
                            );
                          })}
                          <path d={areaPath} fill="url(#areaGrad)" />
                          <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                          {pts.map(p => (
                            <g key={p.day}>
                              <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#6366f1" strokeWidth="2.5" />
                              <text x={p.x} y={PAD.t + innerH + 18} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">{p.day}</text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Two-Column Layout: Leaderboard & Quick Organizations Preview ── */}
                <div style={{ display: "grid", gridTemplateColumns: "35% 1fr", gap: "24px", marginBottom: "26px", alignItems: "start" }}>
                  {(() => {
                    const dynamicAgencies = (stats.topAgencies && stats.topAgencies.length > 0)
                      ? stats.topAgencies
                      : tenants.map(t => ({ name: t.name, cust: t.customerCount, requests: t.requestCount, plan: t.plan, status: t.status })).slice(0, 5);

                    const aMax = Math.max(1, ...dynamicAgencies.map(d => d.cust + d.requests));
                    const lW = 340, lH = 155;
                    const rowH = dynamicAgencies.length > 0 ? lH / dynamicAgencies.length : lH;
                    const labelW = 140, numW = 44;
                    const trackW = lW - labelW - numW;

                    return (
                      <div style={{ background: "#fff", borderRadius: "13px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.04)", padding: "22px 24px", display: "flex", flexDirection: "column", alignSelf: "flex-start" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "3px" }}>Top Performing Agencies</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "20px" }}>Live ranking by client & booking volume</div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                          {dynamicAgencies.length === 0 ? (
                            <div style={{ textAlign: "center", width: "100%", padding: "30px 0", color: "#94a3b8", fontSize: "12px" }}>No tenant organizations active yet.</div>
                          ) : (
                            <svg width="100%" viewBox={`0 0 ${lW} ${lH}`} style={{ overflow: "visible" }}>
                              {dynamicAgencies.map((agency, i) => {
                                const fy = i * rowH;
                                const totalActivity = agency.cust + agency.requests;
                                const barW = Math.max(4, (totalActivity / aMax) * trackW);
                                const opacity = 1 - i * 0.13;
                                return (
                                  <g key={agency.name} transform={`translate(0,${fy})`}>
                                    <rect x="0" y={rowH / 2 - 9} width="18" height="18" fill={i === 0 ? "#fef3c7" : "#f1f5f9"} rx="5" />
                                    <text x="9" y={rowH / 2 + 5} textAnchor="middle" fontSize="10" fontWeight="800" fill={i === 0 ? "#d97706" : "#94a3b8"}>{i + 1}</text>
                                    <text x="26" y={rowH / 2 + 4} fontSize="11.5" fontWeight="600" fill="#1e293b">{agency.name.length > 15 ? agency.name.slice(0, 14) + "…" : agency.name}</text>
                                    <rect x={labelW} y={rowH / 2 - 5} width={trackW} height="10" fill="#f1f5f9" rx="5" />
                                    <rect x={labelW} y={rowH / 2 - 5} width={barW} height="10" fill="#6366f1" rx="5" opacity={opacity} />
                                    <text x={labelW + trackW + 8} y={rowH / 2 + 4} fontSize="11" fontWeight="700" fill="#475569">{agency.cust.toLocaleString()} cust</text>
                                  </g>
                                );
                              })}
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Registered Organizations Preview */}
                  <div className="sa-section" style={{ margin: 0 }}>
                    <div className="sa-section-hd">
                      <div>
                        <div className="sa-section-title">Tenant Spaces</div>
                        <div className="sa-section-sub">Showing {filteredTenants.length} active tenant space{tenants.length === 1 ? "" : "s"}</div>
                      </div>
                      <button
                        onClick={() => setActiveNav("tenants")}
                        style={{ background: "transparent", border: "none", color: "#6366f1", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                      >
                        Manage All ({tenants.length}) →
                      </button>
                    </div>
                    <div className="sa-orgs">
                      {filteredTenants.slice(0, 3).map((tenant) => (
                        <div className="sa-org-card" key={tenant.id} style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>{tenant.name}</div>
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{tenant.slug}.localhost</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span className="sa-plan-badge">{tenant.plan.toUpperCase()}</span>
                              <span className="sa-status-badge" style={tenant.status === "active" ? { background: "#d1fae5", color: "#059669" } : { background: "#fee2e2", color: "#dc2626" }}>
                                {tenant.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════ TAB 2: ORGANIZATIONS ══════════════════ */}
            {activeNav === "tenants" && (
              <div className="sa-section" style={{ margin: 0 }}>
                <div className="sa-section-hd">
                  <div>
                    <div className="sa-section-title">Tenant Organizations</div>
                    <div className="sa-section-sub">Showing {filteredTenants.length} of {tenants.length} tenant spaces</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <select
                      value={planFilter}
                      onChange={(e) => setPlanFilter(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: "7px", border: "1.5px solid #e2e8f0", fontSize: "12px", background: "#f8fafc", color: "#374151", outline: "none" }}
                    >
                      <option value="all">All Plans</option>
                      <option value="free">Free</option>
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                {/* Status Filter Chips */}
                <div style={{ display: "flex", gap: "6px", padding: "10px 20px", borderBottom: "1px solid #f1f5f9", background: "#fbfcfd" }}>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className="sa-chip-btn"
                    style={{ background: statusFilter === "all" ? "#6366f1" : "transparent", color: statusFilter === "all" ? "#fff" : "#64748b" }}
                  >
                    All ({tenants.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("active")}
                    className="sa-chip-btn"
                    style={{ background: statusFilter === "active" ? "#10b981" : "transparent", color: statusFilter === "active" ? "#fff" : "#059669" }}
                  >
                    Active ({stats.activeTenants})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("suspended")}
                    className="sa-chip-btn"
                    style={{ background: statusFilter === "suspended" ? "#ef4444" : "transparent", color: statusFilter === "suspended" ? "#fff" : "#dc2626" }}
                  >
                    Suspended ({stats.suspendedTenants})
                  </button>
                </div>

                <div className="sa-orgs">
                  {isLoadingRegistry ? (
                    <div className="sa-center"><div className="sa-spinner" />Loading organizations...</div>
                  ) : filteredTenants.length === 0 ? (
                    <div className="sa-center">
                      {searchQuery || statusFilter !== "all" || planFilter !== "all"
                        ? `No organizations found matching your active filters.`
                        : "No registered tenant spaces found."}
                    </div>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <div className="sa-org-card" key={tenant.id}>
                        <div className="sa-org-top">
                          <div>
                            <div className="sa-org-name">{tenant.name}</div>
                            <div className="sa-org-id">ID: {tenant.id}</div>
                          </div>
                          <div className="sa-badge-row">
                            <span className="sa-plan-badge">{tenant.plan.toUpperCase()}</span>
                            <span className="sa-status-badge" style={tenant.status === "active" ? { background: "#d1fae5", color: "#059669" } : { background: "#fee2e2", color: "#dc2626" }}>
                              <span className="sa-dot" style={{ background: tenant.status === "active" ? "#10b981" : "#ef4444" }} />
                              {tenant.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="sa-org-body">
                          <div>
                            <div className="sa-info-label">Site / Domain</div>
                            <div className="sa-info-val">{tenant.slug}.localhost</div>
                            {tenant.customDomain && <div className="sa-info-sub">{tenant.customDomain}</div>}
                          </div>
                          <div>
                            <div className="sa-info-label">Metrics</div>
                            <div className="sa-metrics">
                              <div className="sa-metric">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                <div><div className="sa-metric-val">{tenant.customerCount}</div><div className="sa-metric-lbl">Customers</div></div>
                              </div>
                              <div className="sa-metric">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 4c-.7 0-1.5.3-2 .8L13 8.2 4.8 6.4l-1.6 1.6 6 3.5-3.5 3.5-2-.6-1.4 1.4 3.5 1.5 1.5 3.5 1.4-1.4-.6-2 3.5-3.5 3.5 6 1.6-1.6z" /></svg>
                                <div><div className="sa-metric-val">{tenant.requestCount}</div><div className="sa-metric-lbl">Requests</div></div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="sa-info-label">Plan</div>
                            <div className="sa-info-val" style={{ textTransform: "capitalize" }}>{tenant.plan}</div>
                          </div>
                        </div>
                        <hr className="sa-divider" />
                        <div className="sa-actions">
                          <button className="sa-btn sa-btn-ghost" onClick={() => openBrandingModal(tenant)}>🎨 Branding</button>
                          <button className={`sa-btn ${tenant.status === "active" ? "sa-btn-warn" : "sa-btn-success"}`} onClick={() => handleToggleSuspension(tenant)}>
                            {tenant.status === "active" ? "⏸ Suspend" : "▶ Activate"}
                          </button>
                          <button className="sa-btn sa-btn-danger" onClick={() => handleDeleteTenant(tenant.id)}>🗑 Delete</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════ TAB 3: CUSTOMERS ══════════════════ */}
            {activeNav === "customers" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "22px" }}>
                  <div className="sa-stat-card">
                    <div>
                      <div className="sa-stat-label">Total Registered Accounts</div>
                      <div className="sa-stat-val">{customers.length}</div>
                    </div>
                    <div className="sa-stat-icon" style={{ background: "#ede9fe" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                    </div>
                  </div>
                  <div className="sa-stat-card">
                    <div>
                      <div className="sa-stat-label">Regular Travelers / Clients</div>
                      <div className="sa-stat-val" style={{ color: "#2563eb" }}>{customers.filter(c => c.role === "customer").length}</div>
                    </div>
                    <div className="sa-stat-icon" style={{ background: "#dbeafe" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
                    </div>
                  </div>
                  <div className="sa-stat-card">
                    <div>
                      <div className="sa-stat-label">Agency Administrators</div>
                      <div className="sa-stat-val" style={{ color: "#059669" }}>{customers.filter(c => c.role === "tenant_admin").length}</div>
                    </div>
                    <div className="sa-stat-icon" style={{ background: "#d1fae5" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    </div>
                  </div>
                </div>

                <div className="sa-table-wrap">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>User Account</th>
                        <th>Organization Space</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                            {searchQuery ? "No customers match your search query." : "No registered customers found."}
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map((cust) => (
                          <tr key={cust.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px" }}>
                                  {cust.name?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{cust.name}</div>
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>{cust.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#475569", background: "#f1f5f9", padding: "3px 8px", borderRadius: "5px" }}>
                                {cust.tenantName}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                fontSize: "10.5px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                padding: "3px 8px",
                                borderRadius: "5px",
                                background: cust.role === "tenant_admin" ? "#f3e8ff" : "#eff6ff",
                                color: cust.role === "tenant_admin" ? "#7e22ce" : "#1d4ed8"
                              }}>
                                {cust.role.replace("_", " ")}
                              </span>
                            </td>
                            <td>
                              <span className="sa-status-badge" style={{ background: cust.status === "active" ? "#d1fae5" : "#fee2e2", color: cust.status === "active" ? "#059669" : "#dc2626" }}>
                                <span className="sa-dot" style={{ background: cust.status === "active" ? "#10b981" : "#ef4444" }} />
                                {cust.status}
                              </span>
                            </td>
                            <td style={{ fontSize: "11.5px", color: "#64748b" }}>
                              {cust.createdAt ? new Date(cust.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══════════════════ TAB 4: REQUESTS ══════════════════ */}
            {activeNav === "requests" && (
              <div>
                <div style={{ display: "flex", gap: "6px", marginBottom: "18px" }}>
                  <button
                    type="button"
                    onClick={() => setRequestFilter("all")}
                    className="sa-chip-btn"
                    style={{ background: requestFilter === "all" ? "#6366f1" : "#fff", color: requestFilter === "all" ? "#fff" : "#64748b", border: "1px solid #e2e8f0" }}
                  >
                    All ({requests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestFilter("pending")}
                    className="sa-chip-btn"
                    style={{ background: requestFilter === "pending" ? "#f59e0b" : "#fff", color: requestFilter === "pending" ? "#fff" : "#d97706", border: "1px solid #e2e8f0" }}
                  >
                    Pending ({requests.filter(r => r.status === "pending").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestFilter("approved")}
                    className="sa-chip-btn"
                    style={{ background: requestFilter === "approved" ? "#10b981" : "#fff", color: requestFilter === "approved" ? "#fff" : "#059669", border: "1px solid #e2e8f0" }}
                  >
                    Approved ({requests.filter(r => r.status === "approved").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestFilter("rejected")}
                    className="sa-chip-btn"
                    style={{ background: requestFilter === "rejected" ? "#ef4444" : "#fff", color: requestFilter === "rejected" ? "#fff" : "#dc2626", border: "1px solid #e2e8f0" }}
                  >
                    Rejected ({requests.filter(r => r.status === "rejected").length})
                  </button>
                </div>

                <div className="sa-table-wrap">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Traveler</th>
                        <th>Tour / Package</th>
                        <th>Travelers</th>
                        <th>Estimated Total</th>
                        <th>Mode</th>
                        <th>Agency Space</th>
                        <th>Status</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                            {searchQuery ? "No booking requests match your query." : "No travel requests found."}
                          </td>
                        </tr>
                      ) : (
                        filteredRequests.map((req) => (
                          <tr key={req.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: "#0f172a" }}>{req.userName}</div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>{req.userEmail}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: "#1e293b" }}>{req.packageName}</div>
                            </td>
                            <td style={{ color: "#475569" }}>
                              {req.numberOfTravelers} traveler{req.numberOfTravelers === 1 ? "" : "s"}
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: "#059669" }}>
                                {req.submittedTotal > 0 ? `$${req.submittedTotal.toLocaleString()}` : "Quote Pending"}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                fontSize: "10.5px",
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: "5px",
                                background: req.source === "ai-suggested" ? "#fdf4ff" : "#f1f5f9",
                                color: req.source === "ai-suggested" ? "#c026d3" : "#64748b",
                                border: req.source === "ai-suggested" ? "1px solid #f0abfc" : "1px solid #e2e8f0"
                              }}>
                                {req.source === "ai-suggested" ? "🤖 AI Suggested" : "Manual"}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "#475569", background: "#f8fafc", padding: "3px 7px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                                {req.tenantName}
                              </span>
                            </td>
                            <td>
                              <span className="sa-status-badge" style={{
                                background: req.status === "approved" ? "#d1fae5" : req.status === "rejected" ? "#fee2e2" : "#fef3c7",
                                color: req.status === "approved" ? "#059669" : req.status === "rejected" ? "#dc2626" : "#d97706"
                              }}>
                                {req.status}
                              </span>
                            </td>
                            <td style={{ fontSize: "11.5px", color: "#64748b" }}>
                              {req.createdAt ? new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══════════════════ TAB 5: ANALYTICS ══════════════════ */}
            {activeNav === "analytics" && (
              <div>
                <div className="sa-stat-grid">
                  <div className="sa-stat-card">
                    <div>
                      <div className="sa-stat-label">Total Booking Volume</div>
                      <div className="sa-stat-val" style={{ color: "#2563eb" }}>{stats.totalRequests}</div>
                      <div className="sa-stat-badge" style={{ background: "#dbeafe", color: "#2563eb" }}>↑ Platform Wide</div>
                    </div>
                    <div className="sa-stat-icon" style={{ background: "#dbeafe" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /></svg>
                    </div>
                  </div>
                  <div className="sa-stat-card">
                    <div>
                      <div className="sa-stat-label">Active Tenants Online</div>
                      <div className="sa-stat-val" style={{ color: "#059669" }}>{stats.activeTenants}</div>
                      <div className="sa-stat-badge" style={{ background: "#d1fae5", color: "#059669" }}>↑ Active Agencies</div>
                    </div>
                    <div className="sa-stat-icon" style={{ background: "#d1fae5" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /></svg>
                    </div>
                  </div>
                  <div className="sa-stat-card">
                    <div>
                      <div className="sa-stat-label">Total Accounts</div>
                      <div className="sa-stat-val" style={{ color: "#8b5cf6" }}>{customers.length}</div>
                      <div className="sa-stat-badge" style={{ background: "#ede9fe", color: "#8b5cf6" }}>↑ Registered</div>
                    </div>
                    <div className="sa-stat-icon" style={{ background: "#ede9fe" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /></svg>
                    </div>
                  </div>
                  <div className="sa-stat-card">
                    <div>
                      <div className="sa-stat-label">Pending Action Queue</div>
                      <div className="sa-stat-val" style={{ color: "#f59e0b" }}>{stats.pendingRequests ?? 0}</div>
                      <div className="sa-stat-badge" style={{ background: "#fef3c7", color: "#d97706" }}>⚡ Needs Quote</div>
                    </div>
                    <div className="sa-stat-icon" style={{ background: "#fef3c7" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /></svg>
                    </div>
                  </div>
                </div>

                {/* Wide 7-Day Chart */}
                {(() => {
                  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                  const defaultDays = Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return { day: dayNames[d.getDay()], date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), bookings: 0 };
                  });
                  const bookingDays = (stats.bookingDays && stats.bookingDays.length > 0) ? stats.bookingDays : defaultDays;

                  const W = 800, H = 180, PAD = { t: 16, r: 24, b: 34, l: 44 };
                  const maxB = Math.max(1, ...bookingDays.map(d => d.bookings));
                  const innerW = W - PAD.l - PAD.r;
                  const innerH = H - PAD.t - PAD.b;
                  const pts = bookingDays.map((d, i) => ({
                    x: PAD.l + (i / (bookingDays.length - 1)) * innerW,
                    y: PAD.t + innerH - (d.bookings / maxB) * innerH,
                    ...d,
                  }));
                  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
                  const areaPath = `M${pts[0].x},${PAD.t + innerH} ` + pts.map(p => `L${p.x},${p.y}`).join(" ") + ` L${pts[pts.length - 1].x},${PAD.t + innerH} Z`;

                  return (
                    <div style={{ background: "#fff", borderRadius: "13px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.04)", padding: "24px", marginBottom: "26px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>7-Day Platform Booking Telemetry</div>
                          <div style={{ fontSize: "11.5px", color: "#94a3b8" }}>Day-by-day request aggregation across all agency spaces</div>
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#6366f1", background: "#eef2ff", borderRadius: "6px", padding: "4px 12px" }}>
                          {bookingDays.reduce((s, d) => s + d.bookings, 0)} Total Requests in 7 Days
                        </div>
                      </div>
                      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
                        <defs>
                          <linearGradient id="areaGradWide" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
                          </linearGradient>
                        </defs>
                        {[0, 0.25, 0.5, 0.75, 1].map(f => {
                          const y = PAD.t + innerH - f * innerH;
                          return (
                            <g key={f}>
                              <line x1={PAD.l} y1={y} x2={PAD.l + innerW} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                              <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(f * maxB)}</text>
                            </g>
                          );
                        })}
                        <path d={areaPath} fill="url(#areaGradWide)" />
                        <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                        {pts.map(p => (
                          <g key={p.day}>
                            <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#6366f1" strokeWidth="3" />
                            <text x={p.x} y={PAD.t + innerH + 20} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">{p.day} ({p.date})</text>
                            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#6366f1" fontWeight="700">{p.bookings}</text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  );
                })()}

                {/* Two Columns: Plan Breakdown Donut + Top Performing Agencies */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  {(() => {
                    const planColors: Record<string, string> = { free: "#a5b4fc", basic: "#6366f1", premium: "#8b5cf6", enterprise: "#0f172a" };
                    const planData = stats.planBreakdown || {};
                    const planEntries = Object.entries(planData).filter(([, v]) => v > 0);
                    const planTotal = planEntries.reduce((s, [, v]) => s + v, 0);
                    const cx = 90, cy = 90, r = 68, sw = 28;
                    const circumference = 2 * Math.PI * r;
                    let offset = 0;
                    const arcs = planEntries.map(([plan, count]) => {
                      const pct = planTotal > 0 ? count / planTotal : 0;
                      const dash = pct * circumference;
                      const arc = { plan, count, pct, dash, offset };
                      offset += dash;
                      return arc;
                    });

                    return (
                      <div style={{ background: "#fff", borderRadius: "13px", border: "1px solid #e2e8f0", padding: "22px 24px" }}>
                        <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>Subscription Distribution</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "18px" }}>Tenant tier share</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                          <svg width="180" height="180" viewBox="0 0 180 180" style={{ flexShrink: 0 }}>
                            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
                            {planTotal > 0 ? (
                              arcs.map(({ plan, dash, offset: o }) => (
                                <circle key={plan} cx={cx} cy={cy} r={r} fill="none" stroke={planColors[plan] ?? "#6366f1"} strokeWidth={sw} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-o + circumference * 0.25} strokeLinecap="butt" />
                              ))
                            ) : null}
                            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="24" fontWeight="800" fill="#0f172a">{planTotal}</text>
                            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#94a3b8">Tenants</text>
                          </svg>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                            {planEntries.map(([plan, count]) => (
                              <div key={plan} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: planColors[plan] ?? "#6366f1" }} />
                                  <span style={{ fontSize: "12px", textTransform: "capitalize", fontWeight: 600, color: "#334155" }}>{plan}</span>
                                </div>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>{count} ({Math.round((count / (planTotal || 1)) * 100)}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Leaderboard */}
                  {(() => {
                    const dynamicAgencies = (stats.topAgencies && stats.topAgencies.length > 0)
                      ? stats.topAgencies
                      : tenants.map(t => ({ name: t.name, cust: t.customerCount, requests: t.requestCount, plan: t.plan, status: t.status })).slice(0, 5);

                    return (
                      <div style={{ background: "#fff", borderRadius: "13px", border: "1px solid #e2e8f0", padding: "22px 24px" }}>
                        <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>Top Performing Agencies</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "18px" }}>Ranked by combined client and booking volume</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {dynamicAgencies.map((agency, i) => (
                            <div key={agency.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ width: "20px", height: "20px", borderRadius: "5px", background: i === 0 ? "#fef3c7" : "#e2e8f0", color: i === 0 ? "#d97706" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "10px" }}>{i + 1}</span>
                                <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a" }}>{agency.name}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "11.5px" }}>
                                <span style={{ color: "#64748b" }}><strong>{agency.cust}</strong> customers</span>
                                <span style={{ color: "#2563eb" }}><strong>{agency.requests}</strong> bookings</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </main>

        </div>
      </div>

      {isCreateOpen && (
        <div className="sa-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-hd">
              <div><div className="sa-modal-title">Create Tenant Space</div><div className="sa-modal-sub">Register a new organization and admin account.</div></div>
              <button className="sa-modal-close" onClick={() => setIsCreateOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTenant} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="sa-modal-body">
                {createError && <div className="sa-err">{createError}</div>}
                <div className="sa-step-hd">1. Space Configuration</div>
                <div className="sa-grid2">
                  <div className="sa-field"><label className="sa-field-label">Tenant Name</label><input type="text" required className="sa-input" placeholder="e.g. Ceylon Safaris" value={newTenantName} onChange={(e) => setNewTenantName(e.target.value)} /></div>
                  <div className="sa-field"><label className="sa-field-label">Tenant Slug (Optional)</label><input type="text" className="sa-input" placeholder="ceylon-safaris" style={{ fontFamily: "monospace" }} value={newTenantSlug} onChange={(e) => setNewTenantSlug(e.target.value)} /></div>
                  <div className="sa-field"><label className="sa-field-label">Custom Domain (Optional)</label><input type="text" className="sa-input" placeholder="ceylonsafaris.com" value={newTenantDomain} onChange={(e) => setNewTenantDomain(e.target.value)} /></div>
                  <div className="sa-field"><label className="sa-field-label">Subscription Plan</label>
                    <select className="sa-input" value={newTenantPlan} onChange={(e) => setNewTenantPlan(e.target.value)}>
                      <option value="free">Free Trial</option><option value="basic">Basic Plan</option><option value="premium">Premium Plan</option><option value="enterprise">Enterprise Plan</option>
                    </select>
                  </div>
                </div>
                <hr className="sa-step-div" />
                <div className="sa-step-hd">2. Tenant Administrator Account</div>
                <div className="sa-field"><label className="sa-field-label">Administrator Name</label><input type="text" required className="sa-input" placeholder="John Doe" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} /></div>
                <div className="sa-grid2">
                  <div className="sa-field"><label className="sa-field-label">Console Email</label><input type="email" required className="sa-input" placeholder="admin@ceylonsafaris.com" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} /></div>
                  <div className="sa-field"><label className="sa-field-label">Console Password</label><input type="password" required className="sa-input" placeholder="••••••••" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} /></div>
                </div>
              </div>
              <div className="sa-modal-ft">
                <button type="button" className="sa-btn-secondary" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                <button type="submit" className="sa-btn-primary" disabled={isCreating}>{isCreating ? "Provisioning..." : "Create & Initialize"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTenant && (
        <div className="sa-backdrop" onClick={() => setEditingTenant(null)}>
          <div className="sa-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-hd">
              <div><div className="sa-modal-title">Edit Branding</div><div className="sa-modal-sub">Configure the look for {editingTenant.name}.</div></div>
              <button className="sa-modal-close" onClick={() => setEditingTenant(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveBranding} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div className="sa-modal-body">
                {brandError && <div className="sa-err">{brandError}</div>}
                <div className="sa-field"><label className="sa-field-label">Logo Image</label><LogoUpload value={brandLogo} onChange={setBrandLogo} disabled={isSavingBranding} theme="light" /></div>
                <div className="sa-field"><label className="sa-field-label">Tagline / Motto</label><input type="text" className="sa-input" placeholder="Explore Your Next Adventure" value={brandTagline} onChange={(e) => setBrandTagline(e.target.value)} /></div>
                <div className="sa-grid2">
                  <div className="sa-field">
                    <label className="sa-field-label">Primary Color</label>
                    <div className="sa-color-row"><input type="color" className="sa-color-swatch" value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} /><input type="text" className="sa-input" style={{ fontFamily: "monospace", textTransform: "uppercase" }} value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} /></div>
                  </div>
                  <div className="sa-field">
                    <label className="sa-field-label">Secondary Color</label>
                    <div className="sa-color-row"><input type="color" className="sa-color-swatch" value={brandSecondary} onChange={(e) => setBrandSecondary(e.target.value)} /><input type="text" className="sa-input" style={{ fontFamily: "monospace", textTransform: "uppercase" }} value={brandSecondary} onChange={(e) => setBrandSecondary(e.target.value)} /></div>
                  </div>
                </div>
              </div>
              <div className="sa-modal-ft">
                <button type="button" className="sa-btn-secondary" onClick={() => setEditingTenant(null)}>Cancel</button>
                <button type="submit" className="sa-btn-primary" disabled={isSavingBranding}>{isSavingBranding ? "Saving..." : "Save Branding"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
