import mongoose from "mongoose";

type TokenCounterDoc = {
  day: string;
  lastToken: number;
  createdAt: Date;
  updatedAt: Date;
};

const schema = new mongoose.Schema<TokenCounterDoc>(
  {
    day: { type: String, required: true, unique: true },
    lastToken: { type: Number, required: true, default: 0, min: 0 }
  },
  { timestamps: true }
);

export const TokenCounter = mongoose.model<TokenCounterDoc>("TokenCounter", schema);

