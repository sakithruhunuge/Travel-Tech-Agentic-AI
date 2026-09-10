import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { tenantScope } from "@/lib/tenantContext";
import { updateRequestPricing, parseRequestPricing, parseSpecifications } from "@/lib/pricingParser";
import Tenant from "@/models/Tenant";
import { sendInvoiceEmail } from "@/lib/emailService";
import InvoiceDocument from "@/components/pdf/InvoiceDocument";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

export const runtime = "nodejs";

// GET /api/travel-requests/[id] - Load request details
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const sessionUser = session.user as any;
    const userId = sessionUser.id;
    const tenantId = sessionUser.tenantId;
    const userRole = sessionUser.role;

    if (!userId) {
      return NextResponse.json({ error: "Missing user identity" }, { status: 400 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context is required" }, { status: 400 });
    }

    const db = tenantScope(tenantId);
    // Dual-scoping detail lookup
    const query = userRole === "tenant_admin" ? { _id: params.id } : { _id: params.id, userId };
    const requestDoc = await db.TravelRequest.findOne(query).lean();

    if (!requestDoc) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ request: requestDoc });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load request details" }, { status: 500 });
  }
}

// PUT /api/travel-requests/[id] - Tenant Admin updates travel request status or updates pricing breakdown
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user as any;
    const userRole = sessionUser.role;
    const tenantId = sessionUser.tenantId;

    // Guard: Only Tenant Admin is authorized to modify travel requests
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

    const { status, customCharges, additionalTaxes } = body;
    if (status && !["pending", "approved", "rejected", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const db = tenantScope(tenantId);

    // Fetch existing request to update its pricing notes
    const existingRequest = await db.TravelRequest.findOne({ _id: params.id });
    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found under this tenant" }, { status: 404 });
    }

    const updateFields: any = {};
    if (status) {
      updateFields.status = status;
    }

    // Apply custom agency calculations if values are supplied
    if (customCharges !== undefined || additionalTaxes !== undefined) {
      try {
        const updatedMarkdown = updateRequestPricing(existingRequest.specialRequests || "", {
          customCharges: customCharges !== undefined ? parseFloat(customCharges) : undefined,
          additionalTaxes: additionalTaxes !== undefined ? parseFloat(additionalTaxes) : undefined,
        });
        updateFields.specialRequests = updatedMarkdown;
      } catch (err) {
        return NextResponse.json({ error: "Failed to recalculate pricing specs metadata" }, { status: 400 });
      }
    }

    const updatedRequest = (await db.TravelRequest.findOneAndUpdate(
      { _id: params.id },
      updateFields,
      { new: true }
    )) as any;

    // PDF Generation & Email Dispatch Trigger on APPROVED status update
    if (status === "approved" && updatedRequest) {
      const runEmailDispatch = async () => {
        try {
          console.log(`[PDF/Email Workflow] Launching background invoice pipeline for request ${updatedRequest._id}`);
          
          // Fetch tenant branding and name
          const tenant = await Tenant.findById(tenantId).lean();
          const tenantName = tenant?.name || "Travel Agency";
          const primaryColor = tenant?.branding?.primaryColor || "#0B7C8A";
          const secondaryColor = tenant?.branding?.secondaryColor || "#041A16";

          // Parse metrics and specifications
          const { metrics } = parseRequestPricing(updatedRequest.specialRequests || "");
          const specs = parseSpecifications(updatedRequest.specialRequests || "");

          // Format dates
          const dateStr = new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          const preferredDateStr = new Date(updatedRequest.preferredStartDate).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });

          const paymentLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/invoice/${updatedRequest._id}`;

          // Create the PDF document component
          const pdfElement = React.createElement(InvoiceDocument, {
            invoiceId: updatedRequest._id.toString(),
            date: dateStr,
            customerName: updatedRequest.userName,
            customerEmail: updatedRequest.userEmail,
            packageName: updatedRequest.packageName,
            numberOfTravelers: updatedRequest.numberOfTravelers,
            preferredStartDate: preferredDateStr,
            metrics,
            tenantName,
            primaryColor,
            secondaryColor,
            paymentLink,
            specs,
          });

          // Render PDF to Buffer
          console.log(`[PDF] Generating PDF document stream for ${updatedRequest._id}...`);
          const pdfBuffer = await renderToBuffer(pdfElement as any);

          // Dispatch Invoice Email
          console.log(`[Email] Sending automated PDF invoice email to ${updatedRequest.userEmail}...`);
          await sendInvoiceEmail(
            updatedRequest.userEmail,
            updatedRequest.userName,
            updatedRequest._id.toString(),
            pdfBuffer,
            paymentLink
          );
        } catch (err) {
          console.error("[PDF/Email Workflow] Background workflow processing failed:", err);
        }
      };

      // Asynchronously invoke dispatch without blocking main HTTP thread
      const reqAny = request as any;
      if (reqAny.waitUntil) {
        reqAny.waitUntil(runEmailDispatch());
      } else {
        runEmailDispatch();
      }
    }

    return NextResponse.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error("Failed to update travel request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
