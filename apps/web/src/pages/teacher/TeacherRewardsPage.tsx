import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "../../api/client";

type Student = {
  id: string;
  name: string;
  email: string;
  rewardPoints: number;
};

const REASON_PRESETS = [
  "Timely assignment submission",
  "Excellent attendance",
  "Class participation",
  "Discipline and punctuality"
];

export function TeacherRewardsPage() {
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [points, setPoints] = useState(10);
  const [reasonPreset, setReasonPreset] = useState(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const studentsQuery = useQuery({
    queryKey: ["teacherStudents", search],
    queryFn: () => apiFetch<{ students: Student[] }>(`/api/teacher/students${search ? `?q=${encodeURIComponent(search)}` : ""}`)
  });

  const selectedStudent = useMemo(
    () => (studentsQuery.data?.students || []).find((s) => s.id === selectedStudentId) || null,
    [studentsQuery.data, selectedStudentId]
  );

  const grantMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: true; student: Student }>("/api/teacher/points/grant", {
        method: "POST",
        body: JSON.stringify({
          studentId: selectedStudentId,
          points,
          reason: reasonPreset === "Custom" ? customReason.trim() : reasonPreset
        })
      }),
    onSuccess: (res) => {
      setMessage(`Assigned ${points} points to ${res.student.name}. New balance: ${res.student.rewardPoints}`);
      setError(null);
    },
    onError: (e: unknown) => {
      setMessage(null);
      setError(e instanceof ApiError ? e.message : "Failed to assign points");
    }
  });

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">Student Reward Points</h1>
        <p className="muted">Allocate points to students for timely submissions and attendance.</p>

        <div className="field">
          <label>Search Student</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or college email"
          />
        </div>

        <div className="field">
          <label>Select Student</label>
          <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
            <option value="">Choose student</option>
            {(studentsQuery.data?.students || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email}) - {s.rewardPoints} pts
              </option>
            ))}
          </select>
        </div>

        <div className="row">
          <div className="field" style={{ minWidth: 120 }}>
            <label>Points</label>
            <input
              type="number"
              min={1}
              max={500}
              value={points}
              onChange={(e) => setPoints(Math.max(1, Math.min(500, Number(e.target.value || 0))))}
            />
          </div>
          <div className="field" style={{ minWidth: 240 }}>
            <label>Reason</label>
            <select value={reasonPreset} onChange={(e) => setReasonPreset(e.target.value)}>
              {REASON_PRESETS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="Custom">Custom</option>
            </select>
          </div>
        </div>

        {reasonPreset === "Custom" ? (
          <div className="field">
            <label>Custom Reason</label>
            <input
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Type reason"
            />
          </div>
        ) : null}

        {selectedStudent ? (
          <div className="notice">Current balance: {selectedStudent.rewardPoints} points</div>
        ) : null}

        {message ? <div className="notice">{message}</div> : null}
        {error ? <div className="notice danger">{error}</div> : null}

        <div className="row">
          <button
            className="btn primary"
            disabled={
              !selectedStudentId ||
              grantMutation.isPending ||
              (reasonPreset === "Custom" ? !customReason.trim() : !reasonPreset.trim())
            }
            onClick={() => grantMutation.mutate()}
          >
            Assign Points
          </button>
        </div>
      </div>
    </div>
  );
}
