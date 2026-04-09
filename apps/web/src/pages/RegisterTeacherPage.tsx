import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function RegisterTeacherPage() {
  const { registerTeacher } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staffRoomNumber, setStaffRoomNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="card">
      <h1>Teacher Register</h1>
      <p className="muted">Use your SIGCE teacher email and staff room number.</p>

      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@sigce.edu.in" />
      </div>
      <div className="field">
        <label>Staff Room Number</label>
        <input value={staffRoomNumber} onChange={(e) => setStaffRoomNumber(e.target.value)} placeholder="e.g. SR-12" />
      </div>
      <div className="field">
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="hint">Minimum 8 characters</div>
      </div>

      {error ? <div className="notice danger">{error}</div> : null}

      <div className="row">
        <button
          className="btn primary"
          disabled={busy}
          onClick={async () => {
            setError(null);
            setBusy(true);
            try {
              await registerTeacher({ name, email, password, staffRoomNumber });
              navigate("/teacher/menu");
            } catch (e: any) {
              setError(e instanceof ApiError ? e.message : "Registration failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          Create account
        </button>
        <Link className="btn" to="/login">
          Back to login
        </Link>
      </div>
    </div>
  );
}

