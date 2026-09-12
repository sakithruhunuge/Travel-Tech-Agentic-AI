import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/authHelpers";
import { dbConnect } from "@/lib/mongodb";
import Tenant from "@/models/Tenant";
import User from "@/models/User";
import TravelRequest from "@/models/TravelRequest";
import { TenantProvisioningService } from "@/lib/services/TenantProvisioningService";

// GET /api/admin/tenants - Scoped SuperAdmin listing
export async function GET() {
  try {
    const { authorized, response } = await requireSuperAdmin();
    if (!authorized) return response!;

    await dbConnect();

    // 1. Fetch raw tenants (excluding soft-deleted/inactive if required, but list all for administration)
    const tenants = await Tenant.find({ status: { $ne: "inactive" } })
      .sort({ createdAt: -1 })
      .lean();

    // 2. Fetch registry statistics metrics
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t: any) => t.status === "active").length;
    const suspendedTenants = tenants.filter((t: any) => t.status === "suspended").length;

    const planBreakdown = tenants.reduce((acc: any, t: any) => {
      const plan = t.plan || "free";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});

    const totalRequests = await TravelRequest.countDocuments({});
    const pendingRequests = await TravelRequest.countDocuments({ status: "pending" });

    // 3. Compute real last 7 days booking trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const recentRequests = await TravelRequest.find({
      createdAt: { $gte: sevenDaysAgo },
    }).select("createdAt").lean();

    const bookingDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const count = recentRequests.filter(
        (r: any) => r.createdAt && new Date(r.createdAt) >= d && new Date(r.createdAt) < nextD
      ).length;

      bookingDays.push({
        day: dayNames[d.getDay()],
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        bookings: count,
      });
    }

    // 4. Resolve tenant metrics dynamically
    const enrichedTenants = await Promise.all(
      tenants.map(async (tenant: any) => {
        const [requestCount, customerCount] = await Promise.all([
          TravelRequest.countDocuments({ tenantId: tenant._id }),
          User.countDocuments({ tenantId: tenant._id, role: "customer" }),
        ]);

        return {
          id: tenant._id.toString(),
          name: tenant.name,
          slug: tenant.slug,
          customDomain: tenant.customDomain || null,
          plan: tenant.plan,
          status: tenant.status,
          branding: tenant.branding || {},
          createdAt: tenant.createdAt,
          requestCount,
          customerCount,
        };
      })
    );

    // 5. Dynamic top performing agencies based on customer & request counts
    const topAgencies = enrichedTenants
      .slice()
      .sort((a, b) => (b.customerCount + b.requestCount) - (a.customerCount + a.requestCount))
      .slice(0, 5)
      .map((t) => ({
        name: t.name,
        cust: t.customerCount,
        requests: t.requestCount,
        plan: t.plan,
        status: t.status,
      }));

    // 6. Fetch platform users & requests for dedicated sidebar views
    const tenantMap = new Map(tenants.map((t: any) => [t._id.toString(), t.name]));

    const [rawCustomers, rawRequests] = await Promise.all([
      User.find({ role: { $in: ["customer", "tenant_admin"] } })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      TravelRequest.find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ]);

    const customers = rawCustomers.map((u: any) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status || "active",
      tenantName: u.tenantId ? (tenantMap.get(u.tenantId.toString()) || "Custom Space") : "Ceylon Main",
      createdAt: u.createdAt,
    }));

    const requests = rawRequests.map((r: any) => ({
      id: r._id.toString(),
      userName: r.userName,
      userEmail: r.userEmail,
      packageName: r.packageName,
      numberOfTravelers: r.numberOfTravelers,
      submittedTotal: r.submittedTotal || 0,
      source: r.source || "manual",
      status: r.status,
      tenantName: r.tenantId ? (tenantMap.get(r.tenantId.toString()) || "Custom Space") : "Ceylon Main",
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      success: true,
      tenants: enrichedTenants,
      customers,
      requests,
      stats: {
        totalTenants,
        activeTenants,
        suspendedTenants,
        totalRequests,
        pendingRequests,
        planBreakdown,
        bookingDays,
        topAgencies,
      },
    });
  } catch (error) {
    console.error("SuperAdmin list tenants failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/admin/tenants - Scoped SuperAdmin Tenant registration via Provisioning Service
export async function POST(request: Request) {
  try {
    const { authorized, response } = await requireSuperAdmin();
    if (!authorized) return response!;

    await dbConnect();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, slug, customDomain, plan, adminName, adminEmail, adminPassword } = body;

    // Direct Validation of payload fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Tenant name is required" }, { status: 400 });
    }
    if (!adminName || typeof adminName !== "string" || adminName.trim() === "") {
      return NextResponse.json({ error: "Administrator name is required" }, { status: 400 });
    }
    if (!adminEmail || typeof adminEmail !== "string" || !/^\S+@\S+\.\S+$/.test(adminEmail)) {
      return NextResponse.json({ error: "A valid administrator email is required" }, { status: 400 });
    }
    if (!adminPassword || typeof adminPassword !== "string" || adminPassword.length < 6) {
      return NextResponse.json({ error: "Administrator password must be at least 6 characters" }, { status: 400 });
    }

    // Auto-generate slug if not provided
    let tenantSlug = slug;
    if (!tenantSlug || typeof tenantSlug !== "string" || tenantSlug.trim() === "") {
      tenantSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    // Invoke Tenant Provisioning Service with rollback support
    const result = await TenantProvisioningService.provision({
      name: name.trim(),
      slug: tenantSlug,
      customDomain: customDomain || undefined,
      plan: plan || "free",
      adminName: adminName.trim(),
      adminEmail: adminEmail.trim(),
      adminPassword,
    });

    return NextResponse.json(
      {
        success: true,
        tenant: result.tenant,
        admin: {
          id: result.adminUser._id.toString(),
          name: result.adminUser.name,
          email: result.adminUser.email,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("SuperAdmin create tenant failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to provision tenant space" },
      { status: 400 }
    );
  }
}
