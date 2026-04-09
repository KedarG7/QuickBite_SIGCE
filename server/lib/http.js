import crypto from "node:crypto";

export function setHeader(res, name, value) {
  res.setHeader(name, value);
}

export function send(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.statusCode = statusCode;
  setHeader(res, "content-type", contentType);
  setHeader(res, "x-content-type-options", "nosniff");
  res.end(body);
}

export function redirect(res, location, statusCode = 303) {
  res.statusCode = statusCode;
  setHeader(res, "location", location);
  res.end();
}

export function sendHtml(res, html, statusCode = 200) {
  send(res, statusCode, html, "text/html; charset=utf-8");
}

export function sendJson(res, obj, statusCode = 200) {
  send(res, statusCode, JSON.stringify(obj), "application/json; charset=utf-8");
}

export async function readBody(req, { maxBytes = 1_000_000 } = {}) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      const err = new Error("Body too large");
      err.code = "BODY_TOO_LARGE";
      throw err;
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function readJson(req, options) {
  const text = await readBody(req, options);
  try {
    return JSON.parse(text || "{}");
  } catch {
    const err = new Error("Invalid JSON");
    err.code = "BAD_JSON";
    throw err;
  }
}

export async function readForm(req, options) {
  const text = await readBody(req, options);
  const params = new URLSearchParams(text);
  const out = {};
  for (const [key, value] of params.entries()) out[key] = value;
  return out;
}

export function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const out = {};
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join("=") || "");
  }
  return out;
}

export function newToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

