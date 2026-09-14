import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import { resolveTenant } from "@/lib/tenantResolver";
import { tenantScope } from "@/lib/tenantContext";

export async function POST(request: Request) {
  try {
    await dbConnect();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, email, password } = body;

    // Field Validations
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const formattedEmail = email.toLowerCase().trim();

    // 1. Host/Tenant Resolution
    const hostname = request.headers.get("host") || "";
    const tenant = await resolveTenant({ hostname });

    // Block registrations on the SuperAdmin portal
    if (tenant.isAdmin) {
      return NextResponse.json({ error: "Self-registration is not allowed on this portal" }, { status: 400 });
    }

    // Verify tenant status is active
    if (tenant.status !== "active") {
      return NextResponse.json({ error: "Registration is temporarily disabled on this portal" }, { status: 400 });
    }

    // Check allowRegistration settings (on tenant branding or tenant model)
    const brandingAllowRegistration = (tenant.branding as any)?.allowRegistration !== false && (tenant as any).allowRegistration !== false;
    if (!brandingAllowRegistration) {
      return NextResponse.json({ error: "Self-registration is disabled for this organization" }, { status: 400 });
    }

    // 2. Data Access Scoping (db.User)
    const db = tenantScope(tenant.id!);

    // Check if user already exists under this tenant
    const existingUser = await db.User.findOne({ email: formattedEmail });
    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the customer user scoped to the tenant
    const newUser = (await db.User.create({
      name: name.trim(),
      email: formattedEmail,
      password: hashedPassword,
      provider: "credentials",
      role: "customer",
      status: "active",
    })) as any;

    const userResponse = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      provider: newUser.provider,
      createdAt: newUser.createdAt,
    };

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: userResponse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
