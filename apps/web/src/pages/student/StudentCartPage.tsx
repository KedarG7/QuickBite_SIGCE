import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { ApiError, apiFetch, formatINR } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useGeoLocation } from "../../hooks/useGeoLocation";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";

type CartItem = { id: string; name: string; category: string; pricePaise: number; quantity: number };
type SlotsResponse = {
  now: string;
  pickup: Array<{ start: string; slotKey: string; remaining: number }>;
  staffRoomLunch: Array<{ start: string; slotKey: string; remaining: number }>;
};
type RewardsResponse = { rewardPoints: number };

export function StudentCartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const geofenceEnabled = String(import.meta.env.VITE_ENFORCE_GEOFENCE) === "true";
  const razorpayEnabled = String(import.meta.env.VITE_RAZORPAY_ENABLED) === "true";
  const pointsPerRupeeDiscount = Number(import.meta.env.VITE_POINTS_PER_RUPEE_DISCOUNT || 10);
  const geo = useGeoLocation(geofenceEnabled);

  const [cart, setCart] = useLocalStorageState<{ items: CartItem[] }>("cart_student_v1", { items: [] });
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "RAZORPAY">("CASH");
  const [slotStart, setSlotStart] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const slotsQuery = useQuery({
    queryKey: ["slots"],
    queryFn: () => apiFetch<SlotsResponse>("/api/slots")
  });
  const rewardsQuery = useQuery({
    queryKey: ["rewardMe"],
    queryFn: () => apiFetch<RewardsResponse>("/api/rewards/me")
  });

  const subtotalPaise = useMemo(() => cart.items.reduce((sum, it) => sum + it.pricePaise * it.quantity, 0), [cart.items]);
  const availablePoints = rewardsQuery.data?.rewardPoints ?? user?.rewardPoints ?? 0;
  const effectivePoints = Math.max(0, Math.min(pointsToRedeem, availablePoints));
  const previewDiscountPaise = Math.min(subtotalPaise, Math.floor(effectivePoints / pointsPerRupeeDiscount) * 100);
  const previewTotalPaise = Math.max(0, subtotalPaise - previewDiscountPaise);
  const itemCount = useMemo(() => cart.items.reduce((sum, it) => sum + it.quantity, 0), [cart.items]);

  const availableSlots = (slotsQuery.data?.pickup || []).filter((s) => s.remaining > 0);
  const selectedSlot = availableSlots.find((s) => s.start === slotStart) ?? availableSlots[0];

  useEffect(() => {
    if (!slotStart && availableSlots.length) setSlotStart(availableSlots[0].start);
  }, [availableSlots, slotStart]);

  useEffect(() => {
    if (!razorpayEnabled && paymentMethod === "RAZORPAY") setPaymentMethod("CASH");
  }, [paymentMethod, razorpayEnabled]);

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">Cart</h1>
        {!cart.items.length ? <p className="muted">Your cart is empty.</p> : null}
      </div>

      {!!cart.items.length ? (
        <div className="card">
          <div className="stack">
            {cart.items.map((it) => (
              <div key={it.id} className="row row-between">
                <div>
                  <div className="item-title">{it.name}</div>
                  <div className="muted">
                    {it.category} · {formatINR(it.pricePaise)}
                  </div>
                </div>
                <div className="row">
                  <button className="btn" onClick={() => setCart({ items: cart.items.filter((x) => x.id !== it.id) })}>
                    Remove
                  </button>
                  <button
                    className="btn"
                    onClick={() =>
                      setCart({
                        items: cart.items.map((x) => (x.id === it.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))
                      })
                    }
                  >
                    -
                  </button>
                  <div className="qty">{it.quantity}</div>
                  <button
                    className="btn"
                    onClick={() => setCart({ items: cart.items.map((x) => (x.id === it.id ? { ...x, quantity: x.quantity + 1 } : x)) })}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <div className="row row-between">
              <div className="muted">Subtotal</div>
              <div className="price">{formatINR(subtotalPaise)}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <h2 className="h2">Pickup Slot</h2>
        {slotsQuery.isLoading ? <div className="muted">Loading slots...</div> : null}
        {slotsQuery.isError ? <div className="notice danger">Failed to load slots.</div> : null}
        {selectedSlot ? (
          <div className="notice">
            Pickup at {new Date(selectedSlot.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Remaining{" "}
            {selectedSlot.remaining}
          </div>
        ) : null}
      </div>

      <div className="card">
        <h2 className="h2">Payment and Rewards</h2>
        <div className="row">
          <button className={`btn ${paymentMethod === "CASH" ? "primary" : ""}`} onClick={() => setPaymentMethod("CASH")}>
            Cash
          </button>
          <button
            className={`btn ${paymentMethod === "RAZORPAY" ? "primary" : ""}`}
            disabled={!razorpayEnabled}
            onClick={() => setPaymentMethod("RAZORPAY")}
          >
            Online
          </button>
        </div>

        <div className="field">
          <label>Redeem Points</label>
          <input
            type="number"
            min={0}
            max={availablePoints}
            value={pointsToRedeem}
            onChange={(e) => setPointsToRedeem(Math.max(0, Number(e.target.value || 0)))}
          />
          <div className="hint">
            Available: {availablePoints} points. {pointsPerRupeeDiscount} points gives Rs 1 discount.
          </div>
        </div>

        {previewDiscountPaise > 0 ? (
          <div className="notice">
            Discount: {formatINR(previewDiscountPaise)}. Payable total: {formatINR(previewTotalPaise)}.
          </div>
        ) : null}

        {geofenceEnabled ? (
          <div className="notice warn">
            {geo.status === "ok" ? "Location captured." : geo.status === "loading" ? "Getting your location..." : "Location is required inside canteen premises."}
          </div>
        ) : null}

        {error ? <div className="notice danger">{error}</div> : null}

        <div className="order-cta">
          <div className="row row-between">
            <div>
              <div className="h3">Fast checkout</div>
              <div className="muted">{itemCount} items</div>
            </div>
            <div className="price">{formatINR(previewTotalPaise)}</div>
          </div>
          <button
            className="btn primary block"
            disabled={busy || !cart.items.length || !slotStart}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const clientLocation = geo.status === "ok" ? { lat: geo.lat, lng: geo.lng } : undefined;
                const res = await apiFetch<any>("/api/orders", {
                  method: "POST",
                  body: JSON.stringify({
                    items: cart.items.map((it) => ({ menuItemId: it.id, quantity: it.quantity })),
                    paymentMethod,
                    fulfillment: "PICKUP",
                    scheduledFor: slotStart,
                    pointsToRedeem: effectivePoints,
                    clientLocation
                  })
                });

                if (res.razorpay) {
                  await openRazorpayCheckout({
                    keyId: res.razorpay.keyId,
                    orderId: res.razorpay.orderId,
                    amount: res.razorpay.amount,
                    currency: res.razorpay.currency,
                    name: user?.name || "SIGCE",
                    email: user?.email || "",
                    onSuccess: async (payload) => {
                      await apiFetch("/api/payments/razorpay/verify", {
                        method: "POST",
                        body: JSON.stringify({
                          orderId: res.order.id,
                          razorpayOrderId: payload.razorpay_order_id,
                          razorpayPaymentId: payload.razorpay_payment_id,
                          razorpaySignature: payload.razorpay_signature
                        })
                      });
                    }
                  });
                }

                setCart({ items: [] });
                navigate("/student/orders");
              } catch (e) {
                setError(e instanceof ApiError ? e.message : "Failed to place order");
              } finally {
                setBusy(false);
              }
            }}
          >
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: any;
  }
}

async function loadRazorpayScript() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

async function openRazorpayCheckout(opts: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  email: string;
  onSuccess: (payload: RazorpaySuccess) => Promise<void>;
}) {
  await loadRazorpayScript();
  return new Promise<void>((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: opts.keyId,
      amount: opts.amount,
      currency: opts.currency,
      name: "SIGCE Canteen",
      description: "Canteen order",
      order_id: opts.orderId,
      prefill: { name: opts.name, email: opts.email },
      handler: async (response: RazorpaySuccess) => {
        try {
          await opts.onSuccess(response);
          resolve();
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled"))
      }
    });
    rzp.open();
  });
}

