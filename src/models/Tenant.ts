import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITenant extends Document {
  name: string;
  slug: string;
  customDomain?: string;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    tagline?: string;
  };
  plan: "free" | "basic" | "premium" | "enterprise";
  status: "active" | "suspended" | "inactive";
  isolation: "shared" | "dedicated";
  allowRegistration: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    customDomain: { type: String, unique: true, sparse: true, index: true },
    branding: {
      logoUrl: { type: String, default: "" },
      primaryColor: { type: String, default: "#3b82f6" },
      secondaryColor: { type: String, default: "#1e3a8a" },
      tagline: { type: String, default: "" },
    },
    plan: {
      type: String,
      enum: ["free", "basic", "premium", "enterprise"],
      default: "free",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "inactive"],
      default: "active",
      required: true,
      index: true,
    },
    isolation: {
      type: String,
      enum: ["shared", "dedicated"],
      default: "shared",
      required: true,
    },
    allowRegistration: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Tenant: Model<ITenant> =
  mongoose.models.Tenant || mongoose.model<ITenant>("Tenant", TenantSchema);

export default Tenant;
