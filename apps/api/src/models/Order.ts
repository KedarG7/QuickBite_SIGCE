import mongoose from "mongoose";

export type PaymentMethod = "CASH" | "RAZORPAY";
export type PaymentStatus = "DUE" | "PENDING" | "PAID" | "FAILED";
export type OrderStatus = "AWAITING_PAYMENT" | "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
export type Fulfillment = "PICKUP" | "STAFF_ROOM";

type OrderLineItem = {
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  pricePaise: number;
  quantity: number;
  lineTotalPaise: number;
};

type RazorpayInfo = {
  orderId?: string;
  paymentId?: string;
};

type OrderDoc = {
  day: string;
  token: number;
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  roleAtOrder: "STUDENT" | "TEACHER";

  fulfillment: Fulfillment;
  staffRoomNumber?: string;
  slotKey: string;
  scheduledFor: Date;
  notes?: string;

  items: OrderLineItem[];
  subtotalPaise: number;
  discountPaise: number;
  pointsRedeemed: number;
  totalPaise: number;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpay?: RazorpayInfo;

  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
};

const lineItemSchema = new mongoose.Schema<OrderLineItem>(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: { type: String, required: true, maxlength: 80 },
    pricePaise: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 50 },
    lineTotalPaise: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const schema = new mongoose.Schema<OrderDoc>(
  {
    day: { type: String, required: true },
    token: { type: Number, required: true, min: 1 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userEmail: { type: String, required: true },
    roleAtOrder: { type: String, required: true, enum: ["STUDENT", "TEACHER"] },

    fulfillment: { type: String, required: true, enum: ["PICKUP", "STAFF_ROOM"] },
    staffRoomNumber: { type: String, required: false, trim: true, maxlength: 20 },
    slotKey: { type: String, required: true },
    scheduledFor: { type: Date, required: true },
    notes: { type: String, required: false, trim: true, maxlength: 240 },

    items: { type: [lineItemSchema], required: true },
    subtotalPaise: { type: Number, required: true, min: 0 },
    discountPaise: { type: Number, required: true, min: 0, default: 0 },
    pointsRedeemed: { type: Number, required: true, min: 0, default: 0 },
    totalPaise: { type: Number, required: true, min: 0 },

    paymentMethod: { type: String, required: true, enum: ["CASH", "RAZORPAY"] },
    paymentStatus: { type: String, required: true, enum: ["DUE", "PENDING", "PAID", "FAILED"] },
    razorpay: {
      orderId: { type: String, required: false },
      paymentId: { type: String, required: false }
    },

    status: {
      type: String,
      required: true,
      enum: ["AWAITING_PAYMENT", "NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"]
    }
  },
  { timestamps: true }
);

schema.index({ day: 1, token: 1 }, { unique: true });
schema.index({ userId: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });
schema.index({ day: 1, slotKey: 1, fulfillment: 1 });

export const Order = mongoose.model<OrderDoc>("Order", schema);
