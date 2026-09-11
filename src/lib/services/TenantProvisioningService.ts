import Tenant from "@/models/Tenant";
import User from "@/models/User";
import Package from "@/models/Package";
import bcrypt from "bcryptjs";

export interface ProvisioningPayload {
  name: string;
  slug: string;
  customDomain?: string;
  plan: "free" | "basic" | "premium" | "enterprise";
  adminName: string;
  adminEmail: string;
  adminPassword?: string;
}

export class TenantProvisioningService {
  /**
   * Atomic provisioning wrapper with rollback mechanics.
   */
  static async provision(payload: ProvisioningPayload) {
    let createdTenantId: any = null;
    let createdUserId: any = null;
    let createdPackageIds: any[] = [];

    // Normalize slug
    const normalizedSlug = payload.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (!normalizedSlug) {
      throw new Error("Slug must contain valid alphanumeric characters");
    }

    // Validate Custom Domain format
    if (payload.customDomain) {
      const normalizedDomain = payload.customDomain.toLowerCase().trim();
      const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,8}$/i;
      if (!domainRegex.test(normalizedDomain)) {
        throw new Error("Invalid custom domain format");
      }
    }

    try {
      // 1. Assert slug uniqueness globally
      const existingSlug = await Tenant.findOne({ slug: normalizedSlug });
      if (existingSlug) {
        throw new Error("This organization slug is already registered");
      }

      // 2. Assert custom domain uniqueness globally
      if (payload.customDomain) {
        const normalizedDomain = payload.customDomain.toLowerCase().trim();
        const existingDomain = await Tenant.findOne({ customDomain: normalizedDomain });
        if (existingDomain) {
          throw new Error("This custom domain is already registered");
        }
      }

      // 3. Create Tenant Workspace
      const tenant = await Tenant.create({
        name: payload.name.trim(),
        slug: normalizedSlug,
        customDomain: payload.customDomain ? payload.customDomain.toLowerCase().trim() : undefined,
        plan: payload.plan,
        status: "active",
        isolation: "shared",
        branding: {
          primaryColor: "#FF8B50",
          secondaryColor: "#25A5FE",
          tagline: "Explore Your Next Adventure",
        },
      });
      createdTenantId = tenant._id;

      // 4. Create Tenant Admin
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(payload.adminPassword || "adminpassword", salt);

      const adminUser = await User.create({
        name: payload.adminName.trim(),
        email: payload.adminEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: "tenant_admin",
        tenantId: tenant._id,
        status: "active",
        provider: "credentials",
      });
      createdUserId = adminUser._id;

      // 5. Seed default packages for the tenant
      const defaultPackages = [
        {
          tenantId: tenant._id,
          slug: "cultural-triangle",
          name: "Cultural Triangle & Ancient Cities",
          duration: "6 Days",
          destinations: ["Anuradhapura", "Polonnaruwa", "Sigiriya", "Dambulla", "Kandy"],
          includes: ["4-Star Hotels", "Private Guide", "Entrance Fees", "Daily Breakfast"],
          image: "https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800",
          priceRange: "$799 - $1199",
          rating: "4.9",
          status: "active",
        },
        {
          tenantId: tenant._id,
          slug: "scenic-highlands",
          name: "Scenic Highlands & Tea Trails",
          duration: "5 Days",
          destinations: ["Kandy", "Nuwara Eliya", "Ella"],
          includes: ["Scenic Train Ride", "Tea Plantation Tour", "Boutique Stays", "Half Board"],
          image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=800",
          priceRange: "$699 - $999",
          rating: "4.8",
          status: "active",
        },
      ];

      const seeded = await Package.insertMany(defaultPackages);
      createdPackageIds = seeded.map((p) => p._id);

      return { tenant, adminUser, packages: seeded };
    } catch (error: any) {
      // Rollback partially completed provisioning operations to prevent orphaned documents
      console.error("Tenant provisioning failed, initiating transactional rollback:", error);

      if (createdPackageIds.length > 0) {
        await Package.deleteMany({ _id: { $in: createdPackageIds } });
      }
      if (createdUserId) {
        await User.deleteOne({ _id: createdUserId });
      }
      if (createdTenantId) {
        await Tenant.deleteOne({ _id: createdTenantId });
      }

      throw error;
    }
  }
}
