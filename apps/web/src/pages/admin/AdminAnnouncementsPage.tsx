import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiFetch, ApiError } from "../../api/client";

type Announcement = { day: string; breakfast: string; lunch: string };

function isoDay(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(day: string, delta: number) {
  const [y, m, d] = day.split("-").map((x) => Number(x));
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return isoDay(date);
}

export function AdminAnnouncementsPage() {
  const [day, setDay] = useState(() => addDays(isoDay(), 1)); // tomorrow by default
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["announcements", day],
    queryFn: () => apiFetch<{ announcements: Announcement[] }>(`/api/announcements?from=${encodeURIComponent(day)}&days=1`)
  });

  useEffect(() => {
    const a = q.data?.announcements?.[0];
    if (a && a.day === day) {
      setBreakfast(a.breakfast);
      setLunch(a.lunch);
    } else {
      setBreakfast("");
      setLunch("");
    }
  }, [day, q.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/announcements/${day}`, { method: "PUT", body: JSON.stringify({ breakfast, lunch }) }),
    onSuccess: () => setError(null)
  });

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">Admin · Announcements</h1>
        <p className="muted">Update what will be for breakfast and lunch (tomorrow).</p>
        <div className="field" style={{ maxWidth: 220 }}>
          <label>Day</label>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="field">
          <label>Breakfast</label>
          <textarea value={breakfast} onChange={(e) => setBreakfast(e.target.value)} placeholder="Breakfast menu..." />
        </div>
        <div className="field">
          <label>Lunch</label>
          <textarea value={lunch} onChange={(e) => setLunch(e.target.value)} placeholder="Lunch menu..." />
        </div>

        {error ? <div className="notice danger">{error}</div> : null}
        <div className="row">
          <button
            className="btn primary"
            disabled={saveMutation.isPending}
            onClick={async () => {
              setError(null);
              try {
                await saveMutation.mutateAsync();
              } catch (e: any) {
                setError(e instanceof ApiError ? e.message : "Failed to save");
              }
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

