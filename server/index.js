import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

import { getConfig } from "./lib/config.js";
import { projectRoot } from "./lib/paths.js";
import { createStore } from "./lib/store.js";
import { createAuth } from "./lib/auth.js";
import { readForm, readJson, redirect, send, sendHtml, sendJson, setHeader } from "./lib/http.js";
import { renderAdminDashboard, renderAdminLogin, renderCustomerHome, renderCustomerOrders } from "./lib/render.js";

const config = getConfig();

const dataDir = path.join(projectRoot, "data");
const dbPath = path.join(dataDir, "db.json");
const publicDir = path.join(projectRoot, "public");

const store = createStore({ dbPath });
const auth = createAuth({
  adminUsername: config.adminUsername,
  adminPassword: config.adminPassword
});

function asInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < 0) return null;
  return i;
}

function nowIso() {
  return new Date().toISOString();
}

function notFound(res) {
  send(res, 404, "Not found");
}

function methodNotAllowed(res) {
  send(res, 405, "Method not allowed");
}

function badRequest(res, message) {
  sendJson(res, { error: message }, 400);
}

function requireAdminOrRedirect(req, res) {
  if (auth.requireAdmin(req)) return true;
  redirect(res, "/admin/login");
  return false;
}

const mime = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

async function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") return methodNotAllowed(res);

  const rel = pathname.replace(/^\/static\//, "");
  const safePath = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) return notFound(res);

  try {
    const data = await fs.readFile(filePath);
    const type = mime[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    setHeader(res, "content-type", type);
    setHeader(res, "cache-control", "no-store");
    res.statusCode = 200;
    if (req.method === "HEAD") return res.end();
    res.end(data);
  } catch (err) {
    if (err?.code === "ENOENT") return notFound(res);
    throw err;
  }
}

async function handleCustomerHome(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const db = store.read();
  const html = renderCustomerHome({ menuItems: db.menuItems || [] });
  sendHtml(res, html);
}

async function handleCustomerOrders(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const db = store.read();
  const html = renderCustomerOrders({ orders: db.orders || [] });
  sendHtml(res, html);
}

async function handleApiMenu(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const db = store.read();
  sendJson(res, { menuItems: db.menuItems || [] });
}

async function handleApiOrders(req, res) {
  if (req.method === "GET") {
    const db = store.read();
    return sendJson(res, { orders: db.orders || [] });
  }

  if (req.method !== "POST") return methodNotAllowed(res);

  let body;
  try {
    body = await readJson(req, { maxBytes: 300_000 });
  } catch (err) {
    if (err.code === "BODY_TOO_LARGE") return badRequest(res, "Request too large");
    return badRequest(res, "Invalid JSON");
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return badRequest(res, "No items in order");
  if (items.length > 50) return badRequest(res, "Too many line items");

  const paymentMethod = String(body.paymentMethod || "CASH").toUpperCase();
  const notes = String(body.notes || "").slice(0, 240);

  const allowedPayment = new Set(["CASH", "UPI", "CARD"]);
  if (!allowedPayment.has(paymentMethod)) return badRequest(res, "Invalid payment method");

  let result;
  try {
    result = await store.update((db) => {
      const menu = db.menuItems || [];

      const normalized = items
        .map((x) => ({
          itemId: asInt(x.itemId),
          quantity: Math.max(1, Math.min(50, asInt(x.quantity) || 0))
        }))
        .filter((x) => x.itemId !== null && x.quantity > 0);

      if (!normalized.length) throw Object.assign(new Error("No valid items"), { code: "BAD_ORDER" });

      const lineItems = [];
      let total = 0;

      for (const line of normalized) {
        const item = menu.find((m) => m.id === line.itemId);
        if (!item) throw Object.assign(new Error("Item not found"), { code: "BAD_ITEM" });
        if (!item.available) throw Object.assign(new Error("Item unavailable"), { code: "BAD_ITEM" });

        const price = Number(item.price) || 0;
        const lineTotal = price * line.quantity;
        total += lineTotal;

        lineItems.push({
          itemId: item.id,
          name: String(item.name),
          price,
          quantity: line.quantity,
          lineTotal
        });
      }

      const orderId = db.nextIds.order++;
      const order = {
        id: orderId,
        items: lineItems,
        total: Math.round(total * 100) / 100,
        status: "NEW",
        paid: false,
        paymentMethod,
        notes,
        createdAt: nowIso()
      };

      db.orders.unshift(order);
      db.orders = db.orders.slice(0, 200); // keep it light for demos

      return { orderId };
    });
  } catch (err) {
    return badRequest(res, err?.message === "Item unavailable" ? "Some items are unavailable" : "Invalid order");
  }

  sendJson(res, result, 201);
}

async function handleAdmin(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  if (!requireAdminOrRedirect(req, res)) return;
  const db = store.read();
  const session = auth.getSession(req);
  const html = renderAdminDashboard({
    menuItems: db.menuItems || [],
    orders: db.orders || [],
    adminUser: session?.username || config.adminUsername
  });
  sendHtml(res, html);
}

async function handleAdminLoginGet(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  if (auth.requireAdmin(req)) return redirect(res, "/admin");
  sendHtml(res, renderAdminLogin({ error: "" }));
}

async function handleAdminLoginPost(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);
  const form = await readForm(req, { maxBytes: 50_000 });
  const username = String(form.username || "");
  const password = String(form.password || "");
  if (!auth.checkCredentials({ username, password })) {
    return sendHtml(res, renderAdminLogin({ error: "Invalid username or password." }), 401);
  }
  auth.createSession(res);
  redirect(res, "/admin");
}

async function handleAdminLogout(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);
  auth.clearSession(res);
  redirect(res, "/");
}

async function handleAdminMenuNew(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!requireAdminOrRedirect(req, res)) return;
  const form = await readForm(req, { maxBytes: 50_000 });

  const name = String(form.name || "").trim().slice(0, 80);
  const category = String(form.category || "").trim().slice(0, 40);
  const price = Number(form.price);

  if (!name) return redirect(res, "/admin");
  if (!Number.isFinite(price) || price < 0) return redirect(res, "/admin");

  await store.update((db) => {
    const id = db.nextIds.menuItem++;
    db.menuItems.push({
      id,
      name,
      category,
      price: Math.round(price * 100) / 100,
      available: true,
      createdAt: nowIso()
    });
  });

  redirect(res, "/admin");
}

async function handleAdminMenuToggle(req, res, id) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!requireAdminOrRedirect(req, res)) return;
  const itemId = asInt(id);
  if (itemId === null) return redirect(res, "/admin");

  await store.update((db) => {
    const item = (db.menuItems || []).find((m) => m.id === itemId);
    if (!item) return;
    item.available = !item.available;
  });

  redirect(res, "/admin");
}

async function handleAdminMenuDelete(req, res, id) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!requireAdminOrRedirect(req, res)) return;
  const itemId = asInt(id);
  if (itemId === null) return redirect(res, "/admin");

  await store.update((db) => {
    db.menuItems = (db.menuItems || []).filter((m) => m.id !== itemId);
  });

  redirect(res, "/admin");
}

async function handleAdminOrderStatus(req, res, id) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!requireAdminOrRedirect(req, res)) return;
  const orderId = asInt(id);
  if (orderId === null) return redirect(res, "/admin");

  const form = await readForm(req, { maxBytes: 50_000 });
  const status = String(form.status || "").toUpperCase();
  const allowed = new Set(["NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"]);
  if (!allowed.has(status)) return redirect(res, "/admin");

  await store.update((db) => {
    const order = (db.orders || []).find((o) => o.id === orderId);
    if (!order) return;
    order.status = status;
  });

  redirect(res, "/admin");
}

async function handleAdminOrderPaid(req, res, id) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!requireAdminOrRedirect(req, res)) return;
  const orderId = asInt(id);
  if (orderId === null) return redirect(res, "/admin");

  await store.update((db) => {
    const order = (db.orders || []).find((o) => o.id === orderId);
    if (!order) return;
    order.paid = !order.paid;
  });

  redirect(res, "/admin");
}

function router(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const pathname = url.pathname;

  if (pathname === "/health") return sendJson(res, { ok: true });
  if (pathname.startsWith("/static/")) return serveStatic(req, res, pathname);

  if (pathname === "/") return handleCustomerHome(req, res);
  if (pathname === "/orders") return handleCustomerOrders(req, res);

  if (pathname === "/api/menu") return handleApiMenu(req, res);
  if (pathname === "/api/orders") return handleApiOrders(req, res);

  if (pathname === "/admin") return handleAdmin(req, res);
  if (pathname === "/admin/login" && req.method === "GET") return handleAdminLoginGet(req, res);
  if (pathname === "/admin/login" && req.method === "POST") return handleAdminLoginPost(req, res);
  if (pathname === "/admin/logout") return handleAdminLogout(req, res);

  const menuToggle = pathname.match(/^\/admin\/menu\/(\d+)\/toggle$/);
  if (menuToggle) return handleAdminMenuToggle(req, res, menuToggle[1]);
  const menuDelete = pathname.match(/^\/admin\/menu\/(\d+)\/delete$/);
  if (menuDelete) return handleAdminMenuDelete(req, res, menuDelete[1]);
  if (pathname === "/admin/menu/new") return handleAdminMenuNew(req, res);

  const orderStatus = pathname.match(/^\/admin\/orders\/(\d+)\/status$/);
  if (orderStatus) return handleAdminOrderStatus(req, res, orderStatus[1]);
  const orderPaid = pathname.match(/^\/admin\/orders\/(\d+)\/paid$/);
  if (orderPaid) return handleAdminOrderPaid(req, res, orderPaid[1]);

  return notFound(res);
}

async function main() {
  await store.ready;

  const server = http.createServer((req, res) => {
    Promise.resolve()
      .then(() => router(req, res))
      .catch((err) => {
        console.error(err);
        send(res, 500, "Internal server error");
      });
  });

  server.listen(config.port, () => {
    console.log(`Canteen Manager running on http://localhost:${config.port}`);
    console.log(`Admin: http://localhost:${config.port}/admin (username: ${config.adminUsername})`);
    if (!process.env.ADMIN_PASSWORD) console.log("Tip: Set ADMIN_PASSWORD env var to change the password.");
  });
}

main();

