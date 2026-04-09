import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch, formatINR } from "../../api/client";

function isoDay(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type SummaryResponse = {
  day: string;
  totals: {
    orders: number;
    totalPaise: number;
    paidPaise: number;
    cashDuePaise: number;
    cashPaidPaise: number;
    onlinePaidPaise: number;
  };
  byStatus: Array<{ _id: string; count: number }>;
  topItems: Array<{ _id: string; quantity: number; salesPaise: number }>;
  byHour: Array<{ _id: string; count: number }>;
};

export function AdminSummaryPage() {
  const [day, setDay] = useState(() => isoDay());

  const q = useQuery({
    queryKey: ["adminSummary", day],
    queryFn: () => apiFetch<SummaryResponse>(`/api/admin/summary?day=${encodeURIComponent(day)}`),
    refetchInterval: 10_000
  });

  const status = useMemo(() => (q.data?.byStatus || []).sort((a, b) => a._id.localeCompare(b._id)), [q.data]);

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">Admin · Summary</h1>
        <div className="field" style={{ maxWidth: 220 }}>
          <label>Day</label>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
      </div>

      {q.isLoading ? <div className="card">Loading…</div> : null}
      {q.isError ? <div className="card">Failed to load summary.</div> : null}

      {q.data ? (
        <>
          <div className="card">
            <h2 className="h2">Totals</h2>
            <div className="stack mini">
              <div className="row row-between">
                <div className="muted">Orders</div>
                <div className="price">{q.data.totals.orders}</div>
              </div>
              <div className="row row-between">
                <div className="muted">Paid revenue</div>
                <div className="price">{formatINR(q.data.totals.paidPaise)}</div>
              </div>
              <div className="row row-between">
                <div className="muted">Cash due</div>
                <div className="price">{formatINR(q.data.totals.cashDuePaise)}</div>
              </div>
              <div className="row row-between">
                <div className="muted">Cash paid</div>
                <div className="price">{formatINR(q.data.totals.cashPaidPaise)}</div>
              </div>
              <div className="row row-between">
                <div className="muted">Online paid</div>
                <div className="price">{formatINR(q.data.totals.onlinePaidPaise)}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="h2">Status</h2>
            <div className="row">
              {status.map((s) => (
                <div key={s._id} className="pill">
                  {s._id}: {s.count}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="h2">Top Items</h2>
            <div className="stack mini">
              {q.data.topItems.map((it) => (
                <div key={it._id} className="row row-between">
                  <div>
                    <div className="item-title">{it._id}</div>
                    <div className="muted">Qty {it.quantity}</div>
                  </div>
                  <div className="price">{formatINR(it.salesPaise)}</div>
                </div>
              ))}
              {!q.data.topItems.length ? <div className="muted">No data.</div> : null}
            </div>
          </div>

          <div className="card">
            <h2 className="h2">Orders by Hour</h2>
            <div className="row">
              {q.data.byHour.map((h) => (
                <div key={h._id} className="pill">
                  {h._id}:00 · {h.count}
                </div>
              ))}
              {!q.data.byHour.length ? <div className="muted">No data.</div> : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

