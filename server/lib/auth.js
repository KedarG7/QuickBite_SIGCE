import { newToken, parseCookies, safeEqual, setHeader } from "./http.js";

const cookieName = "cms_session";

export function createAuth({ adminUsername, adminPassword }) {
  const sessions = new Map();

  function getSession(req) {
    const cookies = parseCookies(req);
    const token = cookies[cookieName];
    if (!token) return null;
    return sessions.get(token) || null;
  }

  function requireAdmin(req) {
    return Boolean(getSession(req));
  }

  function clearSession(res) {
    setHeader(
      res,
      "set-cookie",
      `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
    );
  }

  function createSession(res) {
    const token = newToken();
    sessions.set(token, { username: adminUsername, createdAt: Date.now() });
    setHeader(
      res,
      "set-cookie",
      `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 8}`
    );
  }

  function checkCredentials({ username, password }) {
    if (!safeEqual(username || "", adminUsername)) return false;
    if (!safeEqual(password || "", adminPassword)) return false;
    return true;
  }

  return {
    getSession,
    requireAdmin,
    createSession,
    clearSession,
    checkCredentials
  };
}

