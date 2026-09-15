import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Tenant from "@/models/Tenant";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const customDomain = searchParams.get("customDomain");

    if (!slug && !customDomain) {
      return NextResponse.json(
        { error: "Missing resolution parameter (slug or customDomain)" },
        { status: 400 }
      );
    }

    try {
      await dbConnect();
    } catch (dbErr) {
      if (slug === "default-tenant" || (!slug && !customDomain)) {
        return NextResponse.json({
          id: "6a9e5d42194e61198a6d9cf9",
          slug: "default-tenant",
          name: "Ceylon Travels",
          status: "active",
          isolation: "shared",
          branding: {
            primaryColor: "#FF8B50",
            secondaryColor: "#25A5FE",
            tagline: "Explore Sri Lanka",
          },
        });
      }
      throw dbErr;
    }

    let tenant = null;

    if (slug) {
      tenant = await Tenant.findOne({ slug }).lean();
    } else if (customDomain) {
      tenant = await Tenant.findOne({ customDomain }).lean();
    }

    if (!tenant) {
      if (slug === "default-tenant") {
        return NextResponse.json({
          id: "6a9e5d42194e61198a6d9cf9",
          slug: "default-tenant",
          name: "Ceylon Travels",
          status: "active",
          isolation: "shared",
          branding: {
            primaryColor: "#FF8B50",
            secondaryColor: "#25A5FE",
            tagline: "Explore Sri Lanka",
          },
        });
      }
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: (tenant as any)._id.toString(),
      slug: (tenant as any).slug,
      name: (tenant as any).name,
      status: (tenant as any).status,
      isolation: (tenant as any).isolation,
      branding: (tenant as any).branding,
    });
  } catch (error) {
    if (request.nextUrl.searchParams.get("slug") === "default-tenant") {
      return NextResponse.json({
        id: "6a9e5d42194e61198a6d9cf9",
        slug: "default-tenant",
        name: "Ceylon Travels",
        status: "active",
        isolation: "shared",
        branding: {
          primaryColor: "#FF8B50",
          secondaryColor: "#25A5FE",
          tagline: "Explore Sri Lanka",
        },
      });
    }
    console.error("Database lookup error in Tenant Resolution API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
