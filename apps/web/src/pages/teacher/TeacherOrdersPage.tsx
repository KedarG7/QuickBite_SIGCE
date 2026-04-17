import { useQuery } from "@tanstack/react-query";

import { apiFetch, formatINR } from "../../api/client";

type Order = {
  id: string;
  token: number;
  status: string;
  fulfillment: string;
  staffRoomNumber: string | null;
  scheduledFor: string;
  subtotalPaise?: number;
  discountPaise?: number;
  pointsRedeemed?: number;
  totalPaise: number;
  paymentMethod: string;
  paymentStatus: string;
  items: Array<{ name: string; quantity: number; lineTotalPaise: number }>;
  createdAt: string;
};

export function TeacherOrdersPage() {
  const q = useQuery({
    queryKey: ["myOrders"],
    queryFn: () => apiFetch<{ orders: Order[] }>("/api/orders/my"),
    refetchInterval: 10_000
  });

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">My Orders</h1>
        <p className="muted">Staff room delivery is available for lunch preorder before cutoff.</p>
      </div>

      {(q.data?.orders || []).map((o) => (
        <div key={o.id} className="card">
          <div className="row row-between">
            <div className="token">TOKEN {o.token}</div>
            <div className={`badge ${o.status === "READY" ? "ok" : o.status === "CANCELLED" ? "danger" : "warn"}`}>
              {o.status}
            </div>
          </div>
          <div className="muted">
            {o.fulfillment === "STAFF_ROOM" ? `Staff room ${o.staffRoomNumber}` : "Pickup"} ·{" "}
            {new Date(o.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Payment:{" "}
            {o.paymentMethod} ({o.paymentStatus})
          </div>
          <div className="stack mini">
            {o.items.map((it, idx) => (
              <div key={idx} className="row row-between">
                <div>
                  {it.quantity}x {it.name}
                </div>
                <div className="price">{formatINR(it.lineTotalPaise)}</div>
              </div>
            ))}
            {(o.discountPaise || 0) > 0 ? (
              <div className="row row-between">
                <div className="muted">Discount</div>
                <div className="price">- {formatINR(o.discountPaise || 0)}</div>
              </div>
            ) : null}
            <div className="row row-between">
              <div className="muted">Total</div>
              <div className="price">{formatINR(o.totalPaise)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

