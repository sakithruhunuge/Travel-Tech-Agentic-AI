export class TenantNotFoundError extends Error {
  constructor(message = "Tenant not found or inactive") {
    super(message);
    this.name = "TenantNotFoundError";
  }
}

export class TenantSuspendedError extends Error {
  constructor(message = "Tenant is suspended") {
    super(message);
    this.name = "TenantSuspendedError";
  }
}

export interface ResolvedTenant {
  id: string | null;
  slug: string;
  name: string;
  status: "active" | "suspended" | "inactive";
  isolation: "shared" | "dedicated";
  plan: "free" | "basic" | "premium" | "enterprise";
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    tagline?: string;
  };
  isAdmin?: boolean;
}

interface CachedTenant {
  tenant: ResolvedTenant;
  expiry: number;
}

// In-memory cache for resolved tenants
const cache = new Map<string, CachedTenant>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateTenantCache(key: string) {
  cache.delete(key.toLowerCase());
}

export function clearTenantCache() {
  cache.clear();
}

/**
 * Parses the hostname to extract tenant slug or custom domain.
 */
export function parseTenantHostname(hostname: string): {
  slug?: string;
  customDomain?: string;
  isAdmin: boolean;
} {
  const host = hostname.split(":")[0].toLowerCase();

  // 1. Admin Subdomain Bypass Check
  if (host === "admin.localhost" || host.startsWith("admin.")) {
    return { isAdmin: true };
  }

  // 2. Default Localhost Tenant
  if (host === "localhost" || host === "127.0.0.1") {
    return { slug: "default-tenant", isAdmin: false };
  }

  // 3. Tenant.localhost Check
  if (host.endsWith(".localhost")) {
    const subdomain = host.split(".")[0];
    return { slug: subdomain, isAdmin: false };
  }

  // 4. Production Subdomain Check
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || "travelcompany.com";
  if (host.endsWith(`.${mainDomain}`)) {
    const subdomain = host.slice(0, -(mainDomain.length + 1));
    return { slug: subdomain, isAdmin: false };
  }

  // 5. Custom Domain Check
  return { customDomain: host, isAdmin: false };
}

/**
 * Resolves tenant details from the parsed hostname.
 * Uses direct database access in Node.js, and HTTP resolution in Edge middleware.
 */
export async function resolveTenant(options: {
  hostname: string;
  origin?: string;
}): Promise<ResolvedTenant> {
  const { hostname, origin } = options;
  const parsed = parseTenantHostname(hostname);

  // If admin subdomain, return global bypass config
  if (parsed.isAdmin) {
    return {
      id: null,
      slug: "admin",
      name: "Global Platform Admin",
      status: "active",
      isolation: "shared",
      plan: "enterprise",
      isAdmin: true,
    };
  }

  // If localhost default tenant, return immediately without self-referential network fetch
  if (parsed.slug === "default-tenant") {
    return {
      id: "6a9e5d42194e61198a6d9cf9",
      slug: "default-tenant",
      name: "Ceylon Travel Platform",
      status: "active",
      isolation: "shared",
      plan: "free",
      branding: {
        primaryColor: "#FF8B50",
        secondaryColor: "#25A5FE",
        tagline: "Explore Sri Lanka",
      },
    };
  }

  const cacheKey = parsed.slug ? `slug:${parsed.slug}` : `domain:${parsed.customDomain}`;
  const now = Date.now();

  // Check Cache
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > now) {
    const cachedTenant = cached.tenant;
    if (cachedTenant.status === "suspended") {
      throw new TenantSuspendedError(`Tenant "${cachedTenant.name}" is suspended.`);
    }
    return cachedTenant;
  }

  let resolvedData: any = null;

  // Determine environment runtime to switch connection strategy
  if (process.env.NEXT_RUNTIME === "edge" || typeof window !== "undefined") {
    // Edge / Client Context -> Fetch through HTTP Resolver API
    const queryParams = parsed.slug
      ? `slug=${encodeURIComponent(parsed.slug)}`
      : `customDomain=${encodeURIComponent(parsed.customDomain || "")}`;

    const baseUrl = origin || "http://localhost:3000";
    try {
      const res = await fetch(`${baseUrl}/api/tenant/resolve?${queryParams}`);

      if (res.status === 404) {
        if (parsed.slug === "default-tenant") {
          resolvedData = {
            id: "6a9e5d42194e61198a6d9cf9",
            slug: "default-tenant",
            name: "Ceylon Travel Platform",
            status: "active",
            isolation: "shared",
            plan: "free",
            branding: { primaryColor: "#FF8B50", secondaryColor: "#25A5FE", tagline: "Explore Sri Lanka" },
          };
        } else {
          throw new TenantNotFoundError(`Tenant resolving for "${hostname}" was not found.`);
        }
      } else if (!res.ok) {
        if (parsed.slug === "default-tenant") {
          resolvedData = {
            id: "6a9e5d42194e61198a6d9cf9",
            slug: "default-tenant",
            name: "Ceylon Travel Platform",
            status: "active",
            isolation: "shared",
            plan: "free",
            branding: { primaryColor: "#FF8B50", secondaryColor: "#25A5FE", tagline: "Explore Sri Lanka" },
          };
        } else {
          throw new Error(`Failed to resolve tenant (status ${res.status}).`);
        }
      } else {
        resolvedData = await res.json();
      }
    } catch (fetchErr) {
      if (parsed.slug === "default-tenant") {
        resolvedData = {
          id: "default-tenant-id",
          slug: "default-tenant",
          name: "Ceylon Travel Platform",
          status: "active",
          isolation: "shared",
          plan: "free",
          branding: { primaryColor: "#FF8B50", secondaryColor: "#25A5FE", tagline: "Explore Sri Lanka" },
        };
      } else {
        throw fetchErr;
      }
    }
  } else {
    // Node.js Context -> Direct Database Lookup (prevents HTTP roundtrip overhead)
    const { resolveTenantFromDb } = await import("./tenantDbResolver");
    const tenantDoc = await resolveTenantFromDb(parsed.slug, parsed.customDomain);

    if (!tenantDoc) {
      throw new TenantNotFoundError(`Tenant resolving for "${hostname}" was not found.`);
    }

    resolvedData = {
      id: (tenantDoc as any)._id.toString(),
      slug: (tenantDoc as any).slug,
      name: (tenantDoc as any).name,
      status: (tenantDoc as any).status,
      isolation: (tenantDoc as any).isolation,
      plan: (tenantDoc as any).plan,
      branding: (tenantDoc as any).branding,
    };
  }

  const tenantResult: ResolvedTenant = {
    id: resolvedData.id,
    slug: resolvedData.slug,
    name: resolvedData.name,
    status: resolvedData.status,
    isolation: resolvedData.isolation,
    plan: resolvedData.plan,
    branding: resolvedData.branding,
  };

  // Populate Cache
  cache.set(cacheKey, {
    tenant: tenantResult,
    expiry: now + CACHE_TTL_MS,
  });

  // Suspend Validation Check
  if (tenantResult.status === "suspended") {
    throw new TenantSuspendedError(`Tenant "${tenantResult.name}" is suspended.`);
  }

  if (tenantResult.status !== "active") {
    throw new TenantNotFoundError(`Tenant "${tenantResult.name}" is inactive.`);
  }

  return tenantResult;
}
