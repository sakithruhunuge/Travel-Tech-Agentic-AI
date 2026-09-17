import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbConnect } from "@/lib/mongodb";
import { resolveTenant } from "@/lib/tenantResolver";
import { tenantScope } from "@/lib/tenantContext";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();

    // 1. Resolve host and tenant context (dynamic multi-tenancy boundary compliance)
    const hostname = headers().get("host") || "";
    const tenant = await resolveTenant({ hostname });

    if (tenant.isAdmin) {
      return NextResponse.json({ error: "Cannot view invoices on platform admin host" }, { status: 400 });
    }

    const db = tenantScope(tenant.id!);

    // 2. Fetch travel request by ID
    const requestDoc = await db.TravelRequest.findOne({ _id: params.id }).lean();
    if (!requestDoc) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // 3. Return sanitized billing details & brand attributes
    return NextResponse.json({
      invoice: {
        _id: requestDoc._id,
        packageName: requestDoc.packageName,
        numberOfTravelers: requestDoc.numberOfTravelers,
        preferredStartDate: requestDoc.preferredStartDate,
        specialRequests: requestDoc.specialRequests,
        userName: requestDoc.userName,
        userEmail: requestDoc.userEmail,
        status: requestDoc.status,
        createdAt: requestDoc.createdAt,
      },
      tenant: {
        name: tenant.name,
        companyName: tenant.name,
        primaryColor: tenant.branding?.primaryColor || "#0b7c8a",
        secondaryColor: tenant.branding?.secondaryColor || "#FF8B50",
      },
    });
  } catch (error) {
    console.error("Public Invoice API error:", error);
    return NextResponse.json({ error: "Failed to load invoice details" }, { status: 500 });
  }
}
