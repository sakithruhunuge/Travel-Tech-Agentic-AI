import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Tenant from "@/models/Tenant";
import { invalidateTenantCache } from "@/lib/tenantResolver";

// PUT /api/tenant/branding - Tenant Admin updates branding settings
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user as any;
    const userRole = sessionUser.role;
    const tenantId = sessionUser.tenantId;

    if (userRole !== "tenant_admin") {
      return NextResponse.json({ error: "Access Denied: Tenant Admin role required" }, { status: 403 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context is required" }, { status: 400 });
    }

    await dbConnect();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { logoUrl, primaryColor, secondaryColor, tagline } = body;

    // Validate color codes
    const colorRegex = /^#[0-9a-fA-F]{6}$/;
    if (primaryColor && !colorRegex.test(primaryColor)) {
      return NextResponse.json({ error: "Primary color must be a valid hex code (e.g. #FF8B50)" }, { status: 400 });
    }
    if (secondaryColor && !colorRegex.test(secondaryColor)) {
      return NextResponse.json({ error: "Secondary color must be a valid hex code (e.g. #25A5FE)" }, { status: 400 });
    }

    const updatedTenant = await Tenant.findByIdAndUpdate(
      tenantId,
      {
        branding: {
          logoUrl: logoUrl !== undefined ? logoUrl : "",
          primaryColor: primaryColor || "#FF8B50",
          secondaryColor: secondaryColor || "#25A5FE",
          tagline: tagline || "",
        },
      },
      { new: true }
    );

    if (!updatedTenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Invalidate resolver cache so layout colors propagate instantly
    invalidateTenantCache(`slug:${updatedTenant.slug}`);
    if (updatedTenant.customDomain) {
      invalidateTenantCache(`domain:${updatedTenant.customDomain}`);
    }

    return NextResponse.json({ success: true, tenant: updatedTenant });
  } catch (error) {
    console.error("Failed to update branding:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
