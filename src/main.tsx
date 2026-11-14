// React root & router setup.
import { lazy, StrictMode, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { useAuthStore } from './store/authStore';
import type { UserRole } from './types';
import './index.css';

// Route-level code splitting keeps face-api.js/recharts out of the initial bundle.
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const MarkAttendance = lazy(() => import('./pages/student/MarkAttendance'));
const MyAttendance = lazy(() => import('./pages/student/MyAttendance'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TakeAttendance = lazy(() => import('./pages/teacher/TakeAttendance'));
const ClassAttendance = lazy(() => import('./pages/teacher/ClassAttendance'));
const ManageSubjects = lazy(() => import('./pages/teacher/ManageSubjects'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageStudents = lazy(() => import('./pages/admin/ManageStudents'));
const ManageTeachers = lazy(() => import('./pages/admin/ManageTeachers'));
const AttendanceReports = lazy(() => import('./pages/admin/AttendanceReports'));
const SystemSettings = lazy(() => import('./pages/admin/SystemSettings'));
const Profile = lazy(() => import('./pages/shared/Profile'));
const Notifications = lazy(() => import('./pages/shared/Notifications'));
const NotFound = lazy(() => import('./pages/shared/NotFound'));

const PAGE_TITLES: Record<string, string> = {
  '/login': 'Sign in',
  '/student': 'Student dashboard',
  '/student/mark-attendance': 'Mark attendance',
  '/student/my-attendance': 'My attendance',
  '/teacher': 'Teacher dashboard',
  '/teacher/take-attendance': 'Take attendance',
  '/teacher/class-attendance': 'Class attendance',
  '/teacher/manage-subjects': 'Manage subjects',
  '/admin': 'Admin dashboard',
  '/admin/manage-students': 'Students',
  '/admin/manage-teachers': 'Teachers',
  '/admin/attendance-reports': 'Attendance reports',
  '/admin/system-settings': 'System settings',
  '/admin/register-user': 'Register user',
  '/profile': 'Profile',
  '/notifications': 'Notifications',
};

function RouteTitle() {
  const { pathname } = useLocation();
  useDocumentTitle(PAGE_TITLES[pathname]);
  return null;
}

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: UserRole[] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
}

const guard = (element: ReactNode, roles?: UserRole[]) => (
  <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>
);

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const home = isAuthenticated && user ? `/${user.role}` : '/login';

  return (
    <BrowserRouter>
      <RouteTitle />
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-light)]',
          duration: 4000,
        }}
      />

      <Suspense fallback={<LoadingSpinner message="Loading..." />}>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated && user ? <Navigate to={home} replace /> : <Login />}
          />

          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to={home} replace />} />

            <Route path="/student" element={guard(<StudentDashboard />, ['student'])} />
            <Route path="/student/mark-attendance" element={guard(<MarkAttendance />, ['student'])} />
            <Route path="/student/my-attendance" element={guard(<MyAttendance />, ['student'])} />

            <Route path="/teacher" element={guard(<TeacherDashboard />, ['teacher'])} />
            <Route path="/teacher/take-attendance" element={guard(<TakeAttendance />, ['teacher'])} />
            <Route path="/teacher/class-attendance" element={guard(<ClassAttendance />, ['teacher'])} />
            <Route
              path="/teacher/manage-subjects"
              element={guard(<ManageSubjects />, ['teacher', 'admin'])}
            />

            <Route path="/admin" element={guard(<AdminDashboard />, ['admin'])} />
            <Route path="/admin/manage-students" element={guard(<ManageStudents />, ['admin'])} />
            <Route path="/admin/manage-teachers" element={guard(<ManageTeachers />, ['admin'])} />
            <Route path="/admin/attendance-reports" element={guard(<AttendanceReports />, ['admin'])} />
            <Route path="/admin/system-settings" element={guard(<SystemSettings />, ['admin'])} />
            <Route path="/admin/register-user" element={guard(<Register />, ['admin'])} />

            <Route path="/profile" element={guard(<Profile />)} />
            <Route path="/notifications" element={guard(<Notifications />)} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
