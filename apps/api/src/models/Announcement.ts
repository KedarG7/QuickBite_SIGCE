import mongoose from "mongoose";

type AnnouncementDoc = {
  day: string; // yyyy-mm-dd in TIMEZONE
  breakfast: string;
  lunch: string;
  updatedByUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const schema = new mongoose.Schema<AnnouncementDoc>(
  {
    day: { type: String, required: true, unique: true },
    breakfast: { type: String, required: true, default: "", maxlength: 800 },
    lunch: { type: String, required: true, default: "", maxlength: 800 },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }
  },
  { timestamps: true }
);

export const Announcement = mongoose.model<AnnouncementDoc>("Announcement", schema);

