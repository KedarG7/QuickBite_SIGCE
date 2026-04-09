import { Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

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

export function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const { user, isLoading, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          SIGCE Canteen
        </Link>
        <nav className="topnav">
          {!isLoading && user?.role === "ADMIN" ? <Link to="/admin/orders">Admin</Link> : null}
          <Link to="/display">TV Display</Link>
          {!isLoading && user ? (
            <button className="link-btn" onClick={logout}>
              Logout
            </button>
          ) : (
            <Link to="/login">Login</Link>
          )}
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
          </Route>

          <Route path="/teacher" element={<RequireRole role="TEACHER" />}>
            <Route index element={<Navigate to="/teacher/menu" replace />} />
            <Route path="menu" element={<TeacherMenuPage />} />
            <Route path="cart" element={<TeacherCartPage />} />
            <Route path="orders" element={<TeacherOrdersPage />} />
          </Route>

          <Route path="/admin" element={<RequireAdmin />}>
            <Route index element={<Navigate to="/admin/orders" replace />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="menu" element={<AdminMenuPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="summary" element={<AdminSummaryPage />} />
          </Route>
          <Route path="/display" element={<DisplayBoardPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
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
