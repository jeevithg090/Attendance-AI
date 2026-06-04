// ═══════════════════════════════════════════════════════════
// AttendAI — React Root & Router Setup
// ═══════════════════════════════════════════════════════════

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Layout
import Layout from './components/layout/Layout';

// Pages - Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Pages - Student
import StudentDashboard from './pages/student/StudentDashboard';
import MarkAttendance from './pages/student/MarkAttendance';
import MyAttendance from './pages/student/MyAttendance';

// Pages - Teacher
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TakeAttendance from './pages/teacher/TakeAttendance';
import ClassAttendance from './pages/teacher/ClassAttendance';
import ManageSubjects from './pages/teacher/ManageSubjects';

// Pages - Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageStudents from './pages/admin/ManageStudents';
import ManageTeachers from './pages/admin/ManageTeachers';
import AttendanceReports from './pages/admin/AttendanceReports';
import SystemSettings from './pages/admin/SystemSettings';

// Pages - Shared
import Profile from './pages/shared/Profile';
import Notifications from './pages/shared/Notifications';

import './index.css';

// ── Role-based Route Guard ────────────────────────────────
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <>{children}</>;
}

// ── App Router ────────────────────────────────────────────
function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <BrowserRouter>
      <Toaster 
        position="top-right" 
        toastOptions={{
          className: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-light)]',
          duration: 4000,
        }}
      />
      
      <Routes>
        <Route path="/login" element={
          isAuthenticated && user ? <Navigate to={`/${user.role}`} replace /> : <Login />
        } />
        
        {/* Protected Routes Wrapper */}
        <Route element={<Layout />}>
          
          {/* Default Route */}
          <Route path="/" element={
            <Navigate to={isAuthenticated && user ? `/${user.role}` : "/login"} replace />
          } />

          {/* ── Student Routes ── */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="/student/mark-attendance" element={
            <ProtectedRoute allowedRoles={['student']}><MarkAttendance /></ProtectedRoute>
          } />
          <Route path="/student/my-attendance" element={
            <ProtectedRoute allowedRoles={['student']}><MyAttendance /></ProtectedRoute>
          } />

          {/* ── Teacher Routes ── */}
          <Route path="/teacher" element={
            <ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>
          } />
          <Route path="/teacher/take-attendance" element={
            <ProtectedRoute allowedRoles={['teacher']}><TakeAttendance /></ProtectedRoute>
          } />
          <Route path="/teacher/class-attendance" element={
            <ProtectedRoute allowedRoles={['teacher']}><ClassAttendance /></ProtectedRoute>
          } />
          <Route path="/teacher/manage-subjects" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}><ManageSubjects /></ProtectedRoute>
          } />

          {/* ── Admin Routes ── */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/manage-students" element={
            <ProtectedRoute allowedRoles={['admin']}><ManageStudents /></ProtectedRoute>
          } />
          <Route path="/admin/manage-teachers" element={
            <ProtectedRoute allowedRoles={['admin']}><ManageTeachers /></ProtectedRoute>
          } />
          <Route path="/admin/attendance-reports" element={
            <ProtectedRoute allowedRoles={['admin']}><AttendanceReports /></ProtectedRoute>
          } />
          <Route path="/admin/system-settings" element={
            <ProtectedRoute allowedRoles={['admin']}><SystemSettings /></ProtectedRoute>
          } />
          <Route path="/admin/register-user" element={
            <ProtectedRoute allowedRoles={['admin']}><Register /></ProtectedRoute>
          } />

          {/* ── Shared Routes ── */}
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute><Notifications /></ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// ── Root Render ───────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
