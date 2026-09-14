import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { tenantScope, resolveTenantId } from "@/lib/tenantContext";
import SuperAdmin from "@/models/SuperAdmin";

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const sessionUser = session.user as any;
    const userId = sessionUser.id;
    const userRole = sessionUser.role;
    const tenantId = await resolveTenantId(sessionUser);

    if (!userId) {
      return NextResponse.json({ error: "Missing user identity" }, { status: 400 });
    }

    const body = await request.json();
    const { name, image } = body;

    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "A valid name is required" }, { status: 400 });
    }

    // 1. SuperAdmin updates bypass tenant-scoped models entirely
    if (userRole === "super_admin") {
      const updatedAdmin = await SuperAdmin.findByIdAndUpdate(
        userId,
        { name: name.trim() },
        { new: true }
      );

      if (!updatedAdmin) {
        return NextResponse.json({ error: "Administrator not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, user: updatedAdmin });
    }

    // 2. Tenant-Scoped updates
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context is required" }, { status: 400 });
    }

    const db = tenantScope(tenantId);
    const updatedUser = await db.User.findOneAndUpdate(
      { _id: userId },
      { name: name.trim(), image: typeof image === "string" ? image : undefined },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
