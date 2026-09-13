import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { tenantScope } from "@/lib/tenantContext";
import SuperAdmin from "@/models/SuperAdmin";

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    const userRole = (session.user as any).role;
    const tenantId = (session.user as any).tenantId;

    if (!userId) {
      return NextResponse.json({ error: "Missing user identity" }, { status: 400 });
    }

    const body = await request.json();
    const { password } = body;

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    await dbConnect();

    // 1. SuperAdmin updates bypass tenant-scoped models entirely
    if (userRole === "super_admin") {
      const superAdmin = await SuperAdmin.findById(userId);
      if (!superAdmin) {
        return NextResponse.json({ error: "Administrator not found" }, { status: 404 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      superAdmin.password = hashedPassword;
      await superAdmin.save();

      return NextResponse.json({ success: true });
    }

    // 2. Tenant-Scoped updates
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context is required" }, { status: 400 });
    }

    const db = tenantScope(tenantId);
    const dbUser = await db.User.findOne({ _id: userId });

    if (!dbUser || dbUser.provider !== "credentials") {
      return NextResponse.json(
        { error: "Password update is only available for email/password accounts" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    dbUser.password = hashedPassword;
    await dbUser.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
