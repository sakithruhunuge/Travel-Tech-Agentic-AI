import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { tenantScope, resolveTenantId } from "@/lib/tenantContext";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const sessionUser = session.user as any;
    const userId = sessionUser.id;
    const tenantId = await resolveTenantId(sessionUser);
    const userRole = sessionUser.role;

    if (!userId) {
      return NextResponse.json({ error: "Missing user identity" }, { status: 400 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context is required" }, { status: 400 });
    }

    const db = tenantScope(tenantId);
    // Dual-scoping: Tenant Admin views all bookings, Customer views only their own
    const query = userRole === "tenant_admin" ? {} : { userId };
    const requests = await db.TravelRequest.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ requests });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load travel requests" }, { status: 500 });
  }
}
