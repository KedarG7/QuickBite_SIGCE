import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";

import { apiFetch, formatINR } from "../../api/client";

type Order = {
  id: string;
  day: string;
  token: number;
  status: string;
  fulfillment: "PICKUP" | "STAFF_ROOM";
  staffRoomNumber: string | null;
  scheduledFor: string;
  totalPaise: number;
  paymentMethod: "CASH" | "RAZORPAY";
  paymentStatus: "DUE" | "PENDING" | "PAID" | "FAILED";
  userEmail: string;
  items: Array<{ name: string; quantity: number; lineTotalPaise: number }>;
  createdAt: string;
};

function isoDay(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function AdminOrdersPage() {
  const qc = useQueryClient();
  const [day, setDay] = useState(() => isoDay());
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) || "";
    const socketUrl = apiBase || window.location.origin;
    const s = io(socketUrl, { withCredentials: true });
    s.on("order:new", () => qc.invalidateQueries({ queryKey: ["adminOrders"] }));
    s.on("queue:update", () => qc.invalidateQueries({ queryKey: ["adminOrders"] }));
    return () => s.disconnect();
  }, [qc]);

  const ordersQuery = useQuery({
    queryKey: ["adminOrders", day, status],
    queryFn: () =>
      apiFetch<{ orders: Order[] }>(
        `/api/admin/orders?day=${encodeURIComponent(day)}${status ? `&status=${encodeURIComponent(status)}` : ""}&limit=200`
      ),
    refetchInterval: 10_000
  });

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: string }) =>
      apiFetch(`/api/admin/orders/${input.id}/status`, { method: "PATCH", body: JSON.stringify({ status: input.status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminOrders"] })
  });

  const paymentMutation = useMutation({
    mutationFn: (input: { id: string; paymentStatus: "DUE" | "PAID" }) =>
      apiFetch(`/api/admin/orders/${input.id}/payment`, { method: "PATCH", body: JSON.stringify({ paymentStatus: input.paymentStatus }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminOrders"] })
  });

  const orders = ordersQuery.data?.orders || [];
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) map.set(o.status, (map.get(o.status) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [orders]);

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">Admin · Orders</h1>
        <div className="row">
          <div className="field" style={{ minWidth: 180 }}>
            <label>Day</label>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          <div className="field" style={{ minWidth: 180 }}>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="NEW">NEW</option>
              <option value="PREPARING">PREPARING</option>
              <option value="READY">READY</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="AWAITING_PAYMENT">AWAITING_PAYMENT</option>
            </select>
          </div>
        </div>
        {counts.length ? (
          <div className="row">
            {counts.map(([k, v]) => (
              <div key={k} className="pill">
                {k}: {v}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {ordersQuery.isLoading ? <div className="card">Loading…</div> : null}
      {ordersQuery.isError ? <div className="card">Failed to load orders.</div> : null}

      {orders.map((o) => (
        <div key={o.id} className="card">
          <div className="row row-between">
            <div className="token">TOKEN {o.token}</div>
            <div className="row" style={{ marginTop: 0 }}>
              <select
                value={o.status}
                onChange={(e) => statusMutation.mutate({ id: o.id, status: e.target.value })}
                disabled={statusMutation.isPending}
              >
                <option value="AWAITING_PAYMENT">AWAITING_PAYMENT</option>
                <option value="NEW">NEW</option>
                <option value="PREPARING">PREPARING</option>
                <option value="READY">READY</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>
          <div className="muted">
            {o.fulfillment === "STAFF_ROOM" ? `Staff room ${o.staffRoomNumber}` : "Pickup"} ·{" "}
            {new Date(o.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
            {o.userEmail}
          </div>
          <div className="muted">
            Payment: {o.paymentMethod} ({o.paymentStatus}) · Total: {formatINR(o.totalPaise)}
          </div>

          {o.paymentMethod === "CASH" ? (
            <div className="row">
              <button
                className="btn"
                disabled={paymentMutation.isPending}
                onClick={() =>
                  paymentMutation.mutate({ id: o.id, paymentStatus: o.paymentStatus === "PAID" ? "DUE" : "PAID" })
                }
              >
                {o.paymentStatus === "PAID" ? "Mark Due" : "Mark Paid"}
              </button>
            </div>
          ) : null}

          <div className="stack mini">
            {o.items.map((it, idx) => (
              <div key={idx} className="row row-between">
                <div>
                  {it.quantity}× {it.name}
                </div>
                <div className="price">{formatINR(it.lineTotalPaise)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
