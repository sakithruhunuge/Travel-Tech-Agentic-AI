import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { tenantScope } from "@/lib/tenantContext";

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const sessionUser = session.user as any;
    const userId = sessionUser.id;
    const tenantId = sessionUser.tenantId;

    if (!userId) {
      return NextResponse.json({ error: "Missing user identity" }, { status: 400 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context is required" }, { status: 400 });
    }

    const db = tenantScope(tenantId);
    const requestDoc = await db.TravelRequest.findOne({ _id: params.id, userId });
    if (!requestDoc) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (requestDoc.status !== "pending") {
      return NextResponse.json({ error: "Only pending requests can be cancelled" }, { status: 400 });
    }

    requestDoc.status = "rejected";
    await requestDoc.save();

    return NextResponse.json({ success: true, request: requestDoc });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to cancel request" }, { status: 500 });
  }
}
