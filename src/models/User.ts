import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  tenantId?: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  image?: string;
  provider: "google" | "credentials";
  role: "customer" | "tenant_admin";
  status: "active" | "suspended" | "pending";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: false },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true }, // unique constraint removed for multi-tenancy
    password: { type: String },
    image: { type: String },
    provider: {
      type: String,
      enum: ["google", "credentials"],
      default: "google",
      required: true,
    },
    role: {
      type: String,
      enum: ["customer", "tenant_admin"],
      default: "customer",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "pending"],
      default: "active",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for tenantId + email.
// Omitted/null tenantId represents the legacy/default namespace, preserving backward compatibility.
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
