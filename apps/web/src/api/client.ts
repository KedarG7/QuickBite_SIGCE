export type ApiErrorPayload = { error?: string; message?: string } | null;

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload;

  constructor(message: string, status: number, payload: ApiErrorPayload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || "";
const SOCKET_BASE = (import.meta.env.VITE_SOCKET_BASE as string | undefined) || API_BASE;
const SOCKET_ENABLED = (import.meta.env.VITE_ENABLE_SOCKET as string | undefined) !== "false";

export function getSocketBase() {
  return SOCKET_BASE || window.location.origin;
}

export function isSocketEnabled() {
  return SOCKET_ENABLED;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {})
    },
    credentials: "include"
  });

  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";
  let data: any = null;
  if (text) {
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: "Invalid JSON response" };
      }
    } else {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

export function formatINR(paise: number) {
  const rupees = paise / 100;
  return rupees.toLocaleString("en-IN", { style: "currency", currency: "INR" });
}

