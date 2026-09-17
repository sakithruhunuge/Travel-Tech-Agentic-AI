import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { resolveTenant } from "@/lib/tenantResolver";
import { tenantScope } from "@/lib/tenantContext";
import Tenant from "@/models/Tenant";

// GET /api/packages - Scoped list supporting search, pagination, and status filters
export async function GET(request: Request) {
  try {
    await dbConnect();

    // 1. Resolve host and tenant context
    const hostname = headers().get("host") || "";
    const tenant = await resolveTenant({ hostname });

    if (tenant.isAdmin) {
      return NextResponse.json({ packages: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const statusFilter = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // 2. Resolve authentication for admin checking
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;
    const isTenantAdmin = sessionUser?.role === "tenant_admin" && sessionUser?.tenantId === tenant.id;

    // 3. Construct query criteria
    const query: any = {};
    if (isTenantAdmin) {
      // Admins can filter by any status, defaulting to all status values
      if (statusFilter) {
        query.status = statusFilter;
      }
    } else {
      // Public users strictly only see active packages
      query.status = "active";
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { destinations: { $regex: search, $options: "i" } },
      ];
    }

    const db = tenantScope(tenant.id!);
    const totalCount = await db.Package.countDocuments(query);
    const packages = await db.Package.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const mappedPackages = packages.map((pkg: any) => ({
      id: pkg.slug,
      name: pkg.name,
      duration: pkg.duration,
      destinations: pkg.destinations,
      includes: pkg.includes,
      image: pkg.image,
      priceRange: pkg.priceRange,
      rating: pkg.rating,
      status: pkg.status,
      _id: pkg._id.toString(),
    }));

    return NextResponse.json({
      success: true,
      packages: mappedPackages,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch packages API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/packages - Tenant Admin creates a package
export async function POST(request: Request) {
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

    // Check if the resolved tenant is active (blocking mutations for suspended accounts)
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

    // Strict Request Payload Validations
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Invalid name payload" }, { status: 400 });
    }
    if (!slug || typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: "Slug is required and must be alphanumeric (dash allowed)" }, { status: 400 });
    }
    if (!duration || typeof duration !== "string" || duration.trim() === "") {
      return NextResponse.json({ error: "Invalid duration payload" }, { status: 400 });
    }
    if (!image || typeof image !== "string" || image.trim() === "") {
      return NextResponse.json({ error: "Invalid image URL payload" }, { status: 400 });
    }
    if (!priceRange || typeof priceRange !== "string" || priceRange.trim() === "") {
      return NextResponse.json({ error: "Invalid price range payload" }, { status: 400 });
    }
    if (!rating || typeof rating !== "string" || isNaN(parseFloat(rating))) {
      return NextResponse.json({ error: "Invalid rating payload" }, { status: 400 });
    }

    const db = tenantScope(tenantId);

    // Verify slug uniqueness within the active tenant boundaries
    const existingPackage = await db.Package.findOne({ slug: slug.toLowerCase().trim() });
    if (existingPackage) {
      return NextResponse.json({ error: "A package with this slug already exists" }, { status: 409 });
    }

    const newPackage = await db.Package.create({
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      duration: duration.trim(),
      destinations: Array.isArray(destinations) ? destinations : [],
      includes: Array.isArray(includes) ? includes : [],
      image: image.trim(),
      priceRange: priceRange.trim(),
      rating: rating.trim(),
      status: status || "active",
    });

    return NextResponse.json({ success: true, package: newPackage }, { status: 201 });
  } catch (error) {
    console.error("Failed to create package:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
