import { dbConnect } from "./mongodb";
import Tenant from "@/models/Tenant";

/**
 * Direct database resolver for Node.js environments.
 */
export async function resolveTenantFromDb(slug?: string, customDomain?: string) {
  await dbConnect();
  if (slug) {
    let tenant = await Tenant.findOne({ slug }).lean();
    if (!tenant && process.env.NODE_ENV === "development" && slug !== "admin") {
      const displayName = slug.charAt(0).toUpperCase() + slug.slice(1) + " Travel";
      try {
        const created = await Tenant.create({
          name: displayName,
          slug: slug,
          plan: "free",
          status: "active",
          isolation: "shared",
          branding: {
            primaryColor: "#FF8B50",
            secondaryColor: "#25A5FE",
            tagline: "Explore Your Next Adventure",
          },
        });
        tenant = created.toObject() as any;
      } catch (err) {
        console.warn(`Failed to auto-provision tenant "${slug}" in dev mode:`, err);
      }
    }
    return tenant;
  } else if (customDomain) {
    return await Tenant.findOne({ customDomain }).lean();
  }
  return null;
}
