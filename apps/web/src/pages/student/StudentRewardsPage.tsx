import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../../api/client";

type RewardHistory = {
  id: string;
  type: "GRANT" | "REDEEM";
  points: number;
  reason: string;
  createdAt: string;
};

type RewardsResponse = {
  rewardPoints: number;
  totalRewardPointsEarned: number;
  history: RewardHistory[];
};

export function StudentRewardsPage() {
  const q = useQuery({
    queryKey: ["rewardMe"],
    queryFn: () => apiFetch<RewardsResponse>("/api/rewards/me"),
    refetchInterval: 15000
  });

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">My Reward Points</h1>
        <p className="muted">Teachers can assign points for attendance and timely submissions.</p>
      </div>

      <div className="card">
        <div className="row">
          <div className="pill">Current points: {q.data?.rewardPoints ?? 0}</div>
          <div className="pill">Total earned: {q.data?.totalRewardPointsEarned ?? 0}</div>
        </div>
      </div>

      <div className="card">
        <h2 className="h2">History</h2>
        <div className="stack mini">
          {(q.data?.history || []).map((h) => (
            <div key={h.id} className="row row-between">
              <div>
                <div className="item-title">{h.type === "GRANT" ? `+${h.points} points` : `-${h.points} points`}</div>
                <div className="muted">{h.reason}</div>
              </div>
              <div className="muted">{new Date(h.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {!q.isLoading && !(q.data?.history || []).length ? <div className="muted">No points activity yet.</div> : null}
        </div>
      </div>
    </div>
  );
}

