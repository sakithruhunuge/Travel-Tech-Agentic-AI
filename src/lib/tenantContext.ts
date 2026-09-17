import { headers } from "next/headers";
import mongoose from "mongoose";
import User from "@/models/User";
import TravelRequest from "@/models/TravelRequest";
import Package from "@/models/Package";
import { resolveTenant } from "@/lib/tenantResolver";

export interface TenantContext {
  tenantId: string | null;
  tenantSlug: string | null;
}

/**
 * Retrieves the current tenant context from the request headers.
 * Works inside Server Components, Server Actions, Route Handlers, and Layouts.
 */
export function getTenantContext(): TenantContext {
  try {
    const headersList = headers();
    const tenantId = headersList.get("x-tenant-id");
    const tenantSlug = headersList.get("x-tenant-slug");
    return { tenantId, tenantSlug };
  } catch (error) {
    return { tenantId: null, tenantSlug: null };
  }
}

/**
 * Robustly resolves active tenantId across session, x-tenant-id header, and host header lookup.
 */
export async function resolveTenantId(sessionUser?: any): Promise<string | null> {
  if (sessionUser?.tenantId) {
    return sessionUser.tenantId;
  }
  const { tenantId: headerTenantId } = getTenantContext();
  if (headerTenantId) {
    return headerTenantId;
  }
  try {
    const requestHeaders = headers();
    const hostname = requestHeaders.get("host") || "";
    if (hostname) {
      const resolved = await resolveTenant({ hostname });
      return resolved.id;
    }
  } catch (err) {
    console.warn("resolveTenantId failed:", err);
  }
  return null;
}

/**
 * Creates a tenant-scoped database context object.
 * Returns pre-scoped wrappers around User, TravelRequest, and Package.
 */
export function tenantScope(tenantId: string | mongoose.Types.ObjectId) {
  const tId = typeof tenantId === "string" ? new mongoose.Types.ObjectId(tenantId) : tenantId;

  return {
    User: {
      find: (filter: any = {}) => {
        return User.find({ ...filter, tenantId: tId });
      },
      findOne: (filter: any = {}) => {
        return User.findOne({ ...filter, tenantId: tId });
      },
      findOneAndUpdate: (filter: any = {}, update: any, options?: any) => {
        return User.findOneAndUpdate({ ...filter, tenantId: tId }, update, options);
      },
      updateOne: (filter: any = {}, update: any, options?: any) => {
        return User.updateOne({ ...filter, tenantId: tId }, update, options);
      },
      updateMany: (filter: any = {}, update: any, options?: any) => {
        return User.updateMany({ ...filter, tenantId: tId }, update, options);
      },
      deleteOne: (filter: any = {}) => {
        return User.deleteOne({ ...filter, tenantId: tId });
      },
      deleteMany: (filter: any = {}) => {
        return User.deleteMany({ ...filter, tenantId: tId });
      },
      countDocuments: (filter: any = {}) => {
        return User.countDocuments({ ...filter, tenantId: tId });
      },
      create: (docs: any) => {
        if (Array.isArray(docs)) {
          return User.create(docs.map((doc) => ({ ...doc, tenantId: tId })));
        }
        return User.create({ ...docs, tenantId: tId });
      },
      raw: User,
    },
    TravelRequest: {
      find: (filter: any = {}) => {
        return TravelRequest.find({ ...filter, tenantId: tId });
      },
      findOne: (filter: any = {}) => {
        return TravelRequest.findOne({ ...filter, tenantId: tId });
      },
      findOneAndUpdate: (filter: any = {}, update: any, options?: any) => {
        return TravelRequest.findOneAndUpdate({ ...filter, tenantId: tId }, update, options);
      },
      updateOne: (filter: any = {}, update: any, options?: any) => {
        return TravelRequest.updateOne({ ...filter, tenantId: tId }, update, options);
      },
      updateMany: (filter: any = {}, update: any, options?: any) => {
        return TravelRequest.updateMany({ ...filter, tenantId: tId }, update, options);
      },
      deleteOne: (filter: any = {}) => {
        return TravelRequest.deleteOne({ ...filter, tenantId: tId });
      },
      deleteMany: (filter: any = {}) => {
        return TravelRequest.deleteMany({ ...filter, tenantId: tId });
      },
      countDocuments: (filter: any = {}) => {
        return TravelRequest.countDocuments({ ...filter, tenantId: tId });
      },
      create: (docs: any) => {
        if (Array.isArray(docs)) {
          return TravelRequest.create(docs.map((doc) => ({ ...doc, tenantId: tId })));
        }
        return TravelRequest.create({ ...docs, tenantId: tId });
      },
      raw: TravelRequest,
    },
    Package: {
      find: (filter: any = {}) => {
        return Package.find({ ...filter, tenantId: tId });
      },
      findOne: (filter: any = {}) => {
        return Package.findOne({ ...filter, tenantId: tId });
      },
      findOneAndUpdate: (filter: any = {}, update: any, options?: any) => {
        return Package.findOneAndUpdate({ ...filter, tenantId: tId }, update, options);
      },
      updateOne: (filter: any = {}, update: any, options?: any) => {
        return Package.updateOne({ ...filter, tenantId: tId }, update, options);
      },
      updateMany: (filter: any = {}, update: any, options?: any) => {
        return Package.updateMany({ ...filter, tenantId: tId }, update, options);
      },
      deleteOne: (filter: any = {}) => {
        return Package.deleteOne({ ...filter, tenantId: tId });
      },
      deleteMany: (filter: any = {}) => {
        return Package.deleteMany({ ...filter, tenantId: tId });
      },
      countDocuments: (filter: any = {}) => {
        return Package.countDocuments({ ...filter, tenantId: tId });
      },
      create: (docs: any) => {
        if (Array.isArray(docs)) {
          return Package.create(docs.map((doc) => ({ ...doc, tenantId: tId })));
        }
        return Package.create({ ...docs, tenantId: tId });
      },
      raw: Package,
    },
  };
}
