import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPackage extends Document {
  tenantId?: mongoose.Types.ObjectId;
  slug: string;
  name: string;
  duration: string;
  destinations: string[];
  includes: string[];
  image: string;
  priceRange: string;
  rating: string;
  status: "active" | "draft" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

const PackageSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: false },
    slug: { type: String, required: true, index: true },
    name: { type: String, required: true },
    duration: { type: String, required: true },
    destinations: { type: [String], default: [] },
    includes: { type: [String], default: [] },
    image: { type: String, required: true },
    priceRange: { type: String, required: true },
    rating: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "active",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Package slug should be unique within a tenant.
// For backward compatibility, the tenantId is optional, so we support null/undefined as part of the unique index.
PackageSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
PackageSchema.index({ tenantId: 1, status: 1 });

const Package: Model<IPackage> =
  mongoose.models.Package || mongoose.model<IPackage>("Package", PackageSchema);

export default Package;
