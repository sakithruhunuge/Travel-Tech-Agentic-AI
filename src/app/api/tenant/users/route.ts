import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { tenantScope } from "@/lib/tenantContext";

// GET /api/tenant/users - Lists customer users under this organization
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user as any;
    const userRole = sessionUser.role;
    const tenantId = sessionUser.tenantId;

    // Guard: Tenant Admin access only
    if (userRole !== "tenant_admin") {
      return NextResponse.json({ error: "Access Denied: Tenant Admin role required" }, { status: 403 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context is required" }, { status: 400 });
    }

    await dbConnect();

    const db = tenantScope(tenantId);
    // Find all users with the customer role under the active tenant space
    const users = await db.User.find({ role: "customer" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Failed to load tenant users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
