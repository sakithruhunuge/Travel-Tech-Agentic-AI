import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "super_admin") {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Access Denied: SuperAdmin role required" },
        { status: 403 }
      ),
    };
  }
  return { authorized: true, session };
}
