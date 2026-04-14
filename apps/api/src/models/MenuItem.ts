import mongoose from "mongoose";

type MenuItemDoc = {
  name: string;
  category: string;
  pricePaise: number;
  available: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
};

const schema = new mongoose.Schema<MenuItemDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    pricePaise: { type: Number, required: true, min: 0 },
    available: { type: Boolean, required: true, default: true },
    imageUrl: { type: String, required: false, trim: true, maxlength: 200 }
  },
  { timestamps: true }
);

schema.index({ category: 1 });
schema.index({ available: 1 });

export const MenuItem = mongoose.model<MenuItemDoc>("MenuItem", schema);

