import mongoose from "mongoose";

export type PointTransactionType = "GRANT" | "REDEEM";

type PointTransactionDoc = {
  studentId: mongoose.Types.ObjectId;
  teacherId?: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  type: PointTransactionType;
  points: number;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
};

const schema = new mongoose.Schema<PointTransactionDoc>(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: false },
    type: { type: String, required: true, enum: ["GRANT", "REDEEM"] },
    points: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true, maxlength: 200 }
  },
  { timestamps: true }
);

schema.index({ studentId: 1, createdAt: -1 });
schema.index({ teacherId: 1, createdAt: -1 });
schema.index({ orderId: 1 });

export const PointTransaction = mongoose.model<PointTransactionDoc>("PointTransaction", schema);

