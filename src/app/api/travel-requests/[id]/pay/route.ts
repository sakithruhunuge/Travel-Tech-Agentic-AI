import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbConnect } from "@/lib/mongodb";
import { resolveTenant } from "@/lib/tenantResolver";
import { tenantScope } from "@/lib/tenantContext";
import { updateRequestPricing } from "@/lib/pricingParser";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();

    // 1. Resolve host and tenant context (dynamic multi-tenancy boundary compliance)
    const hostname = headers().get("host") || "";
    const tenant = await resolveTenant({ hostname });

    if (tenant.isAdmin) {
      return NextResponse.json({ error: "Cannot process checkout on platform admin host" }, { status: 400 });
    }

    const db = tenantScope(tenant.id!);

    // 2. Fetch travel request
    const travelRequest = await db.TravelRequest.findOne({ _id: params.id });
    if (!travelRequest) {
      return NextResponse.json({ error: "Travel request not found" }, { status: 404 });
    }

    // 3. Re-serialize pricing meta block with PAID status
    const updatedMarkdown = updateRequestPricing(travelRequest.specialRequests || "", {
      paymentStatus: "PAID",
    });

    // 4. Update request document
    const updatedRequest = await db.TravelRequest.findOneAndUpdate(
      { _id: params.id },
      { specialRequests: updatedMarkdown },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Payment captured successfully",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Payment API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
