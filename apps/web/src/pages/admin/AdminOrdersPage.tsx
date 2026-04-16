import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";

import { apiFetch, formatINR, getSocketBase, isSocketEnabled } from "../../api/client";

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
  const statusList = ["AWAITING_PAYMENT", "NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"] as const;
  const statusActions = ["NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"] as const;
  const [lastReadyId, setLastReadyId] = useState<string | null>(null);

  const statusTone = (value: string) => {
    if (value === "READY" || value === "COMPLETED") return "ok";
    if (value === "CANCELLED" || value === "FAILED") return "danger";
    return "warn";
  };

  useEffect(() => {
    if (!isSocketEnabled()) return;
    const socketUrl = getSocketBase();
    const s = io(socketUrl, { withCredentials: true });
    s.on("order:new", () => qc.invalidateQueries({ queryKey: ["adminOrders"] }));
    s.on("queue:update", () => qc.invalidateQueries({ queryKey: ["adminOrders"] }));
    return () => {
      s.disconnect();
    };
  }, [qc]);

  const ordersQuery = useQuery({
    queryKey: ["adminOrders", day],
    queryFn: () =>
      apiFetch<{ orders: Order[] }>(
        `/api/admin/orders?day=${encodeURIComponent(day)}&limit=200`
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

  const mutationError =
    (statusMutation.error as Error | undefined)?.message || (paymentMutation.error as Error | undefined)?.message;

  const orders = ordersQuery.data?.orders || [];
  const pendingQueue = useMemo(
    () =>
      orders
        .filter((o) => o.status === "NEW" || o.status === "PREPARING")
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [orders]
  );
  const readyQueue = useMemo(
    () =>
      orders
        .filter((o) => o.status === "READY")
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [orders]
  );
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) map.set(o.status, (map.get(o.status) ?? 0) + 1);
    return statusList.map((statusKey) => [statusKey, map.get(statusKey) ?? 0] as const);
  }, [orders]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (statusMutation.isPending) return;

      const currentReady = lastReadyId ? readyQueue.find((o) => o.id === lastReadyId) : null;
      if (currentReady) {
        statusMutation.mutate({ id: currentReady.id, status: "COMPLETED" });
        setLastReadyId(null);
        return;
      }

      if (pendingQueue.length) {
        const next = pendingQueue[0];
        statusMutation.mutate({ id: next.id, status: "READY" });
        setLastReadyId(next.id);
        return;
      }

      if (readyQueue.length) {
        statusMutation.mutate({ id: readyQueue[0].id, status: "COMPLETED" });
        setLastReadyId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lastReadyId, pendingQueue, readyQueue, statusMutation]);

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">Admin · Orders</h1>
        <div className="row">
          <div className="field" style={{ minWidth: 180 }}>
            <label>Day</label>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
        </div>
        <div className="muted">
          Quick action: press Enter once to mark the next pending order READY, press Enter again to complete it.
        </div>
        <div className="row">
          {counts.map(([k, v]) => (
            <div key={k} className={`badge ${statusTone(k)}`}>
              {k}: {v}
            </div>
          ))}
        </div>
      </div>

      {ordersQuery.isLoading ? <div className="card">Loading…</div> : null}
      {ordersQuery.isError ? <div className="card">Failed to load orders.</div> : null}
      {mutationError ? <div className="notice danger">{mutationError}</div> : null}

      {orders.map((o) => (
        <div key={o.id} className="card">
          <div className="row row-between">
            <div className="token">TOKEN {o.token}</div>
            <div className={`badge ${statusTone(o.status)}`}>{o.status}</div>
          </div>
          <div className="status-actions">
            {statusActions.map((next) => (
              <button
                key={next}
                className={`btn small status-action ${o.status === next ? "primary" : "ghost"}`}
                disabled={statusMutation.isPending}
                onClick={() => {
                  if ((next === "CANCELLED" || next === "COMPLETED") && !window.confirm(`Mark order ${o.token} as ${next}?`)) {
                    return;
                  }
                  statusMutation.mutate({ id: o.id, status: next });
                }}
              >
                {next}
              </button>
            ))}
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
