import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISuperAdmin extends Document {
  name: string;
  email: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SuperAdminSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

const SuperAdmin: Model<ISuperAdmin> =
  mongoose.models.SuperAdmin || mongoose.model<ISuperAdmin>("SuperAdmin", SuperAdminSchema);

export default SuperAdmin;
