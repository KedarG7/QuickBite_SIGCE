import { useState } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import { InstallPrompt } from "./components/InstallPrompt";
import { LoginPage } from "./pages/LoginPage";
import { RegisterStudentPage } from "./pages/RegisterStudentPage";
import { RegisterTeacherPage } from "./pages/RegisterTeacherPage";
import { AdminAnnouncementsPage } from "./pages/admin/AdminAnnouncementsPage";
import { AdminMenuPage } from "./pages/admin/AdminMenuPage";
import { AdminOrdersPage } from "./pages/admin/AdminOrdersPage";
import { AdminSummaryPage } from "./pages/admin/AdminSummaryPage";
import { DisplayBoardPage } from "./pages/display/DisplayBoardPage";
import { StudentCartPage } from "./pages/student/StudentCartPage";
import { StudentMenuPage } from "./pages/student/StudentMenuPage";
import { StudentOrdersPage } from "./pages/student/StudentOrdersPage";
import { TeacherCartPage } from "./pages/teacher/TeacherCartPage";
import { TeacherMenuPage } from "./pages/teacher/TeacherMenuPage";
import { TeacherOrdersPage } from "./pages/teacher/TeacherOrdersPage";
import { TeacherRewardsPage } from "./pages/teacher/TeacherRewardsPage";
import { StudentRewardsPage } from "./pages/student/StudentRewardsPage";

export function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const displayName = user?.name || user?.email || "User";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          SIGCE Canteen
        </Link>
        <nav className="topnav">
          {!isLoading && user?.role === "ADMIN" ? <Link to="/admin/orders">Admin</Link> : null}
          {!isLoading && user?.role === "ADMIN" ? <Link to="/display">TV Display</Link> : null}
          {!isLoading && user ? (
            <button type="button" className="user-chip" onClick={() => setProfileOpen(true)}>
              <span className="user-avatar" aria-hidden="true">
                {avatarInitial}
              </span>
              <span className="user-name">{displayName}</span>
            </button>
          ) : null}
          {!isLoading && !user ? <Link to="/login">Login</Link> : null}
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/student" element={<RegisterStudentPage />} />
          <Route path="/register/teacher" element={<RegisterTeacherPage />} />

          <Route path="/student" element={<RequireRole role="STUDENT" />}>
            <Route index element={<Navigate to="/student/menu" replace />} />
            <Route path="menu" element={<StudentMenuPage />} />
            <Route path="cart" element={<StudentCartPage />} />
            <Route path="orders" element={<StudentOrdersPage />} />
            <Route path="rewards" element={<StudentRewardsPage />} />
          </Route>

          <Route path="/teacher" element={<RequireRole role="TEACHER" />}>
            <Route index element={<Navigate to="/teacher/menu" replace />} />
            <Route path="menu" element={<TeacherMenuPage />} />
            <Route path="cart" element={<TeacherCartPage />} />
            <Route path="orders" element={<TeacherOrdersPage />} />
            <Route path="rewards" element={<TeacherRewardsPage />} />
          </Route>

          <Route path="/admin" element={<RequireAdmin />}>
            <Route index element={<Navigate to="/admin/orders" replace />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="menu" element={<AdminMenuPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="summary" element={<AdminSummaryPage />} />
          </Route>
          <Route
            path="/display"
            element={
              <RequireAdminOnly>
                <DisplayBoardPage />
              </RequireAdminOnly>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {profileOpen && user ? (
        <div className="modal-backdrop" onClick={() => setProfileOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="h2">Profile</div>
                <div className="muted">
                  {user.role === "STUDENT" ? "Student" : user.role === "TEACHER" ? "Teacher" : "Admin"}
                </div>
              </div>
              <button type="button" className="btn small" onClick={() => setProfileOpen(false)}>
                Close
              </button>
            </div>
            <div className="modal-body">
              <div className="card profile-summary">
                <div className="row row-between">
                  <div>
                    <div className="item-title">{displayName}</div>
                    {user.email ? <div className="muted">{user.email}</div> : null}
                  </div>
                  <div className="user-avatar" aria-hidden="true">
                    {avatarInitial}
                  </div>
                </div>
              </div>

              {user.role === "STUDENT" ? (
                <StudentOrdersPage />
              ) : user.role === "TEACHER" ? (
                <TeacherOrdersPage />
              ) : (
                <div className="card">
                  <div className="h2">Admin Shortcuts</div>
                  <div className="stack mini">
                    <Link className="btn" to="/admin/orders" onClick={() => setProfileOpen(false)}>
                      View Orders
                    </Link>
                    <Link className="btn" to="/admin/menu" onClick={() => setProfileOpen(false)}>
                      Manage Menu
                    </Link>
                    <Link className="btn" to="/admin/announcements" onClick={() => setProfileOpen(false)}>
                      Update Announcements
                    </Link>
                    <Link className="btn" to="/admin/summary" onClick={() => setProfileOpen(false)}>
                      View Summary
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn"
                type="button"
                onClick={async () => {
                  setProfileOpen(false);
                  await logout();
                  navigate("/login", { replace: true });
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Home() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    if (user.role === "STUDENT") return <Navigate to="/student/menu" replace />;
    if (user.role === "TEACHER") return <Navigate to="/teacher/menu" replace />;
    if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
  }

  return (
    <div className="stack">
      <div className="card">
        <h1>Welcome</h1>
        <p className="muted">Order food from the canteen with a token-based pickup queue.</p>
        <div className="row">
          <Link className="btn primary" to="/login">
            Login
          </Link>
          <Link className="btn" to="/register/student">
            Student Register
          </Link>
          <Link className="btn" to="/register/teacher">
            Teacher Register
          </Link>
        </div>
      </div>
      <InstallPrompt />
    </div>
  );
}

function NotFound() {
  return (
    <div className="card">
      <h1>404</h1>
      <p className="muted">Page not found.</p>
    </div>
  );
}

function RequireRole(props: { role: "STUDENT" | "TEACHER" | "ADMIN" }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="card">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== props.role) {
    if (user.role === "STUDENT") return <Navigate to="/student/menu" replace />;
    if (user.role === "TEACHER") return <Navigate to="/teacher/menu" replace />;
    if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return <RoleShell />;
}

function RoleShell() {
  const { user } = useAuth();
  const location = useLocation();

  const base = user?.role === "STUDENT" ? "/student" : user?.role === "TEACHER" ? "/teacher" : "";
  const active = location.pathname;

  return (
    <div className="panel">
      <div className="panel-nav">
        <Link className={active.includes("/menu") ? "navlink active" : "navlink"} to={`${base}/menu`}>
          Menu
        </Link>
        <Link className={active.includes("/cart") ? "navlink active" : "navlink"} to={`${base}/cart`}>
          Cart
        </Link>
        <Link className={active.includes("/orders") ? "navlink active" : "navlink"} to={`${base}/orders`}>
          My Orders
        </Link>
        {user?.role === "STUDENT" ? (
          <Link className={active.includes("/rewards") ? "navlink active" : "navlink"} to="/student/rewards">
            Rewards
          </Link>
        ) : null}
        {user?.role === "TEACHER" ? (
          <Link className={active.includes("/rewards") ? "navlink active" : "navlink"} to="/teacher/rewards">
            Student Points
          </Link>
        ) : null}
      </div>
      <Outlet />
    </div>
  );
}

function RequireAdmin() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="card">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;

  return <AdminShell />;
}

function RequireAdminOnly(props: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="card">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;

  return props.children;
}

function AdminShell() {
  const location = useLocation();

  return (
    <div className="panel">
      <div className="panel-nav">
        <Link className={location.pathname.includes("/orders") ? "navlink active" : "navlink"} to="/admin/orders">
          Orders
        </Link>
        <Link className={location.pathname.includes("/menu") ? "navlink active" : "navlink"} to="/admin/menu">
          Menu
        </Link>
        <Link
          className={location.pathname.includes("/announcements") ? "navlink active" : "navlink"}
          to="/admin/announcements"
        >
          Announcements
        </Link>
        <Link className={location.pathname.includes("/summary") ? "navlink active" : "navlink"} to="/admin/summary">
          Summary
        </Link>
      </div>
      <Outlet />
    </div>
  );
}
