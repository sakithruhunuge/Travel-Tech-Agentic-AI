import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { tenantScope } from "@/lib/tenantContext";
import Tenant from "@/models/Tenant";

// PUT /api/packages/[id] - Tenant Admin updates a package with slug uniqueness checks
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user as any;
    const userRole = sessionUser.role;
    const tenantId = sessionUser.tenantId;

    // Check authorization: Must be tenant admin
    if (userRole !== "tenant_admin") {
      return NextResponse.json({ error: "Access Denied: Tenant Admin role required" }, { status: 403 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context is required" }, { status: 400 });
    }

    await dbConnect();

    // Check if the resolved tenant is active
    const activeTenant = await Tenant.findById(tenantId);
    if (!activeTenant || activeTenant.status !== "active") {
      return NextResponse.json(
        { error: "Access Denied: Organization account is suspended or inactive" },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, slug, duration, destinations, includes, image, priceRange, rating, status } = body;

    const db = tenantScope(tenantId);

    const updateFields: any = {};

    // Validate and build payload changes
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

      // Check slug uniqueness excluding the current package document
      const duplicateSlugPackage = await db.Package.findOne({
        slug: formattedSlug,
        _id: { $ne: params.id },
      });
      if (duplicateSlugPackage) {
        return NextResponse.json({ error: "Another package with this slug already exists" }, { status: 409 });
      }
      updateFields.slug = formattedSlug;
    }

    if (duration !== undefined) {
      if (typeof duration !== "string" || duration.trim() === "") {
        return NextResponse.json({ error: "Invalid duration payload" }, { status: 400 });
      }
      updateFields.duration = duration.trim();
    }

    if (image !== undefined) {
      if (typeof image !== "string" || image.trim() === "") {
        return NextResponse.json({ error: "Invalid image URL payload" }, { status: 400 });
      }
      updateFields.image = image.trim();
    }

    if (priceRange !== undefined) {
      if (typeof priceRange !== "string" || priceRange.trim() === "") {
        return NextResponse.json({ error: "Invalid price range payload" }, { status: 400 });
      }
      updateFields.priceRange = priceRange.trim();
    }

    if (rating !== undefined) {
      if (typeof rating !== "string" || isNaN(parseFloat(rating))) {
        return NextResponse.json({ error: "Invalid rating payload" }, { status: 400 });
      }
      updateFields.rating = rating.trim();
    }

    if (destinations !== undefined) {
      if (!Array.isArray(destinations)) {
        return NextResponse.json({ error: "Destinations must be an array" }, { status: 400 });
      }
      updateFields.destinations = destinations;
    }

    if (includes !== undefined) {
      if (!Array.isArray(includes)) {
        return NextResponse.json({ error: "Includes must be an array" }, { status: 400 });
      }
      updateFields.includes = includes;
    }

    if (status !== undefined) {
      if (!["active", "draft", "archived"].includes(status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }
      updateFields.status = status;
    }

    // Scoped update prevents editing package documents of other tenants
    const updatedPackage = await db.Package.findOneAndUpdate(
      { _id: params.id },
      updateFields,
      { new: true }
    );

    if (!updatedPackage) {
      return NextResponse.json({ error: "Package not found under this tenant" }, { status: 404 });
    }

    return NextResponse.json({ success: true, package: updatedPackage });
  } catch (error) {
    console.error("Failed to update package:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/packages/[id] - Tenant Admin soft-deletes (archives) a package
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user as any;
    const userRole = sessionUser.role;
    const tenantId = sessionUser.tenantId;

    // Check authorization: Must be tenant admin
    if (userRole !== "tenant_admin") {
      return NextResponse.json({ error: "Access Denied: Tenant Admin role required" }, { status: 403 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context is required" }, { status: 400 });
    }

    await dbConnect();

    // Check if the resolved tenant is active
    const activeTenant = await Tenant.findById(tenantId);
    if (!activeTenant || activeTenant.status !== "active") {
      return NextResponse.json(
        { error: "Access Denied: Organization account is suspended or inactive" },
        { status: 403 }
      );
    }

    const db = tenantScope(tenantId);

    // Soft deletion by setting status to 'archived', ensuring historical references remain intact
    const archivedPackage = await db.Package.findOneAndUpdate(
      { _id: params.id },
      { status: "archived" },
      { new: true }
    );

    if (!archivedPackage) {
      return NextResponse.json({ error: "Package not found under this tenant" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Package archived successfully",
      package: archivedPackage,
    });
  } catch (error) {
    console.error("Failed to delete package:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
