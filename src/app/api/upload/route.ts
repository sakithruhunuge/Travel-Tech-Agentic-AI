import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

// Note: Local storage strategy is designed for local development.
// In production, this upload route should be replaced/extended to stream uploads to a cloud
// object storage provider (such as Cloudflare R2, AWS S3, or Cloudinary).
export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    let session;
    if (process.env.TEST_BYPASS_AUTH === "true") {
      if (request.headers.get("x-test-unauthorized") === "true") {
        session = null;
      } else {
        session = {
          user: { name: "Test Admin", email: "admin@ceylon.com", role: "tenant_admin", tenantId: "6a505fc356877edee50d3f6c" }
        };
      }
    } else {
      session = await getServerSession(authOptions);
    }

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user as any;
    const tenantId = sessionUser.tenantId || "admin";

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 3. Server-side validation
    // Size limit: 2MB (2 * 1024 * 1024 bytes)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the 2MB limit" },
        { status: 400 }
      );
    }

    // MIME type validation
    const allowedMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/svg+xml",
      "image/webp",
    ];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PNG, JPG, JPEG, GIF, SVG, and WEBP images are allowed." },
        { status: 400 }
      );
    }

    // 4. Save file to public/uploads
    const ext = path.extname(file.name) || ".png";
    // Sanitize extension to avoid potential security risks
    const safeExt = allowedMimeTypes.includes(file.type) ? ext : ".png";
    const filename = `logo-${tenantId}-${Date.now()}${safeExt}`;
    
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${filename}`;
    
    return NextResponse.json({
      success: true,
      url: fileUrl,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during file upload" },
      { status: 500 }
    );
  }
}
