import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";

import { apiFetch } from "../../api/client";

type QueueItem = {
  token: number;
  status: "NEW" | "PREPARING" | "READY";
  fulfillment: "PICKUP" | "STAFF_ROOM";
  staffRoomNumber: string | null;
  items: Array<{ name: string; quantity: number }>;
};

type QueueResponse = {
  day: string;
  updatedAt: string;
  queue: QueueItem[];
};

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || "";

export function DisplayBoardPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["displayQueue"],
    queryFn: () => apiFetch<QueueResponse>("/api/display/queue"),
    refetchInterval: 15_000
  });

  useEffect(() => {
    const socketUrl = API_BASE || window.location.origin;
    const s = io(socketUrl, { withCredentials: true });
    s.on("queue:update", () => {
      qc.invalidateQueries({ queryKey: ["displayQueue"] });
    });
    return () => {
      s.disconnect();
    };
  }, [qc]);

  const queue = q.data?.queue || [];
  const ready = queue.filter((x) => x.status === "READY");

  return (
    <div className="display">
      <div className="display-head">
        <div className="display-title">SIGCE Canteen Tokens</div>
        <div className="display-meta">
          {q.data?.day ?? ""} · Updated {q.data ? new Date(q.data.updatedAt).toLocaleTimeString() : "..."}
        </div>
      </div>

      <div className="display-grid">
        <Column title="READY" items={ready} />
      </div>
    </div>
  );
}

function Column(props: { title: string; items: QueueItem[] }) {
  return (
    <div className="display-col">
      <div className="display-col-title">{props.title}</div>
      <div className="display-col-body">
        {props.items.map((o) => (
          <div key={o.token} className={`token-card ${props.title === "READY" ? "ready" : ""}`}>
            <div className="token-big">{o.token}</div>
            <div className="token-items">
              {o.items.slice(0, 3).map((it, idx) => (
                <div key={idx}>
                  {it.quantity}× {it.name}
                </div>
              ))}
              {o.items.length > 3 ? <div>+{o.items.length - 3} more</div> : null}
            </div>
          </div>
        ))}
        {!props.items.length ? <div className="muted">—</div> : null}
      </div>
    </div>
  );
}

