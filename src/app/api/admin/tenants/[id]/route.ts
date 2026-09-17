import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/authHelpers";
import { dbConnect } from "@/lib/mongodb";
import Tenant from "@/models/Tenant";

// PUT /api/admin/tenants/[id] - SuperAdmin updates tenant settings/branding/plans/status
export async function PUT(request: Request, { params }: { params: { id: string } }) {
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

    const { name, slug, customDomain, plan, status, branding } = body;

    const updateFields: any = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return NextResponse.json({ error: "Invalid name payload" }, { status: 400 });
      }
      updateFields.name = name.trim();
    }

    if (slug !== undefined) {
      if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) {
        return NextResponse.json({ error: "Slug must be alphanumeric (dash allowed)" }, { status: 400 });
      }
      const formattedSlug = slug.toLowerCase().trim();

      // Check slug uniqueness
      const duplicateTenant = await Tenant.findOne({
        slug: formattedSlug,
        _id: { $ne: params.id },
      });
      if (duplicateTenant) {
        return NextResponse.json({ error: "Another organization is already using this slug" }, { status: 409 });
      }
      updateFields.slug = formattedSlug;
    }

    if (customDomain !== undefined) {
      if (customDomain !== null && customDomain !== "") {
        const normalizedDomain = customDomain.toLowerCase().trim();
        const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,8}$/i;
        if (!domainRegex.test(normalizedDomain)) {
          return NextResponse.json({ error: "Invalid custom domain format" }, { status: 400 });
        }

        // Check custom domain uniqueness
        const duplicateDomain = await Tenant.findOne({
          customDomain: normalizedDomain,
          _id: { $ne: params.id },
        });
        if (duplicateDomain) {
          return NextResponse.json({ error: "Another organization is already using this custom domain" }, { status: 409 });
        }
        updateFields.customDomain = normalizedDomain;
      } else {
        updateFields.customDomain = "";
      }
    }

    if (plan !== undefined) {
      if (!["free", "basic", "premium", "enterprise"].includes(plan)) {
        return NextResponse.json({ error: "Invalid subscription plan" }, { status: 400 });
      }
      updateFields.plan = plan;
    }

    if (status !== undefined) {
      if (!["active", "suspended", "inactive"].includes(status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }
      updateFields.status = status;
    }

    if (branding !== undefined) {
      if (typeof branding !== "object" || branding === null) {
        return NextResponse.json({ error: "Branding must be an object" }, { status: 400 });
      }
      updateFields.branding = {
        logoUrl: branding.logoUrl !== undefined ? branding.logoUrl : "",
        primaryColor: branding.primaryColor || "#FF8B50",
        secondaryColor: branding.secondaryColor || "#25A5FE",
        tagline: branding.tagline || "",
      };
    }

    const updatedTenant = await Tenant.findOneAndUpdate(
      { _id: params.id },
      updateFields,
      { new: true }
    );

    if (!updatedTenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, tenant: updatedTenant });
  } catch (error) {
    console.error("SuperAdmin update tenant failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/admin/tenants/[id] - SuperAdmin soft-deletes a tenant (status = 'inactive')
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { authorized, response } = await requireSuperAdmin();
    if (!authorized) return response!;

    await dbConnect();

    // Enforce soft deletion by changing status to 'inactive' instead of deleting document records
    const softDeletedTenant = await Tenant.findOneAndUpdate(
      { _id: params.id },
      { status: "inactive" },
      { new: true }
    );

    if (!softDeletedTenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Tenant soft-deleted successfully (marked as inactive)",
      tenant: softDeletedTenant,
    });
  } catch (error) {
    console.error("SuperAdmin delete tenant failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
