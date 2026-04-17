import { Router } from "express";

import { requireAuth } from "../middleware/requireAuth.js";
import { PointTransaction } from "../models/PointTransaction.js";
import { User } from "../models/User.js";

export const rewardsRouter = Router();

rewardsRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.auth!.userId).lean();
  if (!user) return res.status(401).json({ error: "UNAUTHORIZED" });

  const history = await PointTransaction.find({ studentId: req.auth!.userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return res.json({
    rewardPoints: Number(user.rewardPoints || 0),
    totalRewardPointsEarned: Number(user.totalRewardPointsEarned || 0),
    history: history.map((h) => ({
      id: String(h._id),
      type: h.type,
      points: h.points,
      reason: h.reason,
      createdAt: h.createdAt
    }))
  });
});

