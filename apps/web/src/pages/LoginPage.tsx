import { useMemo, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staffRoomNumber, setStaffRoomNumber] = useState("");
  const [googlePendingToken, setGooglePendingToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const googleConfigured = useMemo(() => Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID), []);

  return (
    <div className="stack">
      <div className="card">
        <h1>Login</h1>
        <p className="muted">Use your college account to sign in.</p>

        <div className="field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="2024ci19f@sigce.edu.in" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
                await login({ email, password });
                navigate("/");
              } catch (e: any) {
                setError(e instanceof ApiError ? e.message : "Login failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Login
          </button>
          <Link className="btn" to="/register/student">
            Student Register
          </Link>
          <Link className="btn" to="/register/teacher">
            Teacher Register
          </Link>
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Google Login</h2>
        <p className="muted">Requires Google OAuth client id in `apps/web/.env`.</p>

        {!googleConfigured ? (
          <div className="notice warn">Google login is not configured.</div>
        ) : googlePendingToken ? (
          <>
            <div className="notice warn">Teacher first-time Google login needs your staff room number.</div>
            <div className="field">
              <label>Staff Room Number</label>
              <input
                value={staffRoomNumber}
                onChange={(e) => setStaffRoomNumber(e.target.value)}
                placeholder="e.g. SR-12"
              />
            </div>
            <div className="row">
              <button
                className="btn primary"
                disabled={busy}
                onClick={async () => {
                  setError(null);
                  setBusy(true);
                  try {
                    await googleLogin({ idToken: googlePendingToken, staffRoomNumber });
                    navigate("/");
                  } catch (e: any) {
                    setError(e instanceof ApiError ? e.message : "Google login failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Continue
              </button>
              <button className="btn" onClick={() => setGooglePendingToken(null)} disabled={busy}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <GoogleLogin
            onSuccess={async (cred) => {
              setError(null);
              setBusy(true);
              try {
                const idToken = cred.credential;
                if (!idToken) throw new Error("Missing Google credential");
                await googleLogin({ idToken });
                navigate("/");
              } catch (e: any) {
                if (e instanceof ApiError && e.payload?.error === "STAFF_ROOM_REQUIRED") {
                  setGooglePendingToken(cred.credential || null);
                } else {
                  setError(e instanceof ApiError ? e.message : "Google login failed");
                }
              } finally {
                setBusy(false);
              }
            }}
            onError={() => setError("Google login failed")}
          />
        )}
      </div>
    </div>
  );
}

