import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { tenantScope, resolveTenantId } from "@/lib/tenantContext";

export async function GET() {
  try {
    // Check authentication status
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const sessionUser = session.user as any;
    const tenantId = await resolveTenantId(sessionUser);

    if (!sessionUser.id) {
      return NextResponse.json({ error: "Invalid user session ID" }, { status: 400 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context is required" }, { status: 400 });
    }

    await dbConnect();

    // Fetch requests made by this specific user scoped to their tenant
    const db = tenantScope(tenantId);
    const requests = await db.TravelRequest.find({ userId: sessionUser.id }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Fetch requests API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
