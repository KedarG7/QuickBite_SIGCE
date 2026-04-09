import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { studentEmailRegex } from "../lib/validators";

export function RegisterStudentPage() {
  const { registerStudent } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const invalidEmail = email.length > 3 && !studentEmailRegex.test(email.trim());

  return (
    <div className="card">
      <h1>Student Register</h1>
      <p className="muted">Only SIGCE student emails are allowed (example: 2024ci19f@sigce.edu.in).</p>

      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="2024ci19f@sigce.edu.in" />
        {invalidEmail ? <div className="hint danger">Email format is invalid for students.</div> : null}
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
          disabled={busy || invalidEmail}
          onClick={async () => {
            setError(null);
            setBusy(true);
            try {
              await registerStudent({ name, email, password });
              navigate("/student/menu");
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

