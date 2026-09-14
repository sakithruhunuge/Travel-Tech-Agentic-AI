import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITravelRequest extends Document {
  tenantId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  packageId?: string;
  packageName: string;
  numberOfTravelers: number;
  preferredStartDate: Date;
  specialRequests?: string;
  pricingInputs?: Record<string, any>;
  submittedTotal?: number;
  aiItineraryMarkdown?: string;
  aiVibeQuery?: string;
  source?: "manual" | "ai-suggested";
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const TravelRequestSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: false },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    packageId: { type: String },
    packageName: { type: String, required: true },
    numberOfTravelers: { type: Number, required: true, min: 1 },
    preferredStartDate: { type: Date, required: true },
    specialRequests: { type: String, default: "" },
    pricingInputs: { type: Schema.Types.Mixed },
    submittedTotal: { type: Number },
    aiItineraryMarkdown: { type: String },
    aiVibeQuery: { type: String },
    source: {
      type: String,
      enum: ["manual", "ai-suggested"],
      default: "manual",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for tenant isolation and queries
TravelRequestSchema.index({ tenantId: 1 });
TravelRequestSchema.index({ tenantId: 1, userId: 1 });
TravelRequestSchema.index({ tenantId: 1, status: 1 });
TravelRequestSchema.index({ tenantId: 1, createdAt: -1 });

const TravelRequest: Model<ITravelRequest> =
  mongoose.models.TravelRequest || mongoose.model<ITravelRequest>("TravelRequest", TravelRequestSchema);

export default TravelRequest;
