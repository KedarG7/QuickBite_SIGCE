import { Router } from "express";

import { MenuItem } from "../models/MenuItem.js";

export const menuRouter = Router();

menuRouter.get("/", async (_req, res) => {
  const items = await MenuItem.find({ available: true }).sort({ category: 1, name: 1 }).lean();
  res.json({
    menuItems: items.map((i) => ({
      id: String(i._id),
      name: i.name,
      category: i.category,
      pricePaise: i.pricePaise,
      available: i.available
    }))
  });
});

