import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/StudentDashboard";
import StudentAttendancePage from "./pages/StudentAttendancePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CoursesPage from "./pages/CoursesPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfessorDashboard from "./pages/ProfessorDashboard";
import TakeAttendancePage from "./pages/TakeAttendancePage";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import ClassroomPage from "./pages/ClassroomPage";
import StudentClassroomPage from "./pages/StudentClassroomPage";
import FaceRegistrationPage from "./pages/FaceRegistrationPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// A simple wrapper to protect routes based on auth status and roles
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>; // You can replace this with a beautiful loader later
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // Or to a unauthorized page
  }

  return <>{children}</>;
};

const App = () => (
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "691174506062-ht2dp63353ti85cosg3asiv9piu2n882.apps.googleusercontent.com"}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Student routes */}
              <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
              <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['student']}><StudentAttendancePage /></ProtectedRoute>} />
              <Route path="/student/courses" element={<ProtectedRoute allowedRoles={['student']}><CoursesPage /></ProtectedRoute>} />
              <Route path="/student/classroom" element={<Navigate to="/student/courses" replace />} />
              <Route path="/student/classroom/:courseCode" element={<ProtectedRoute allowedRoles={['student']}><StudentClassroomPage /></ProtectedRoute>} />
              <Route path="/student/notifications" element={<ProtectedRoute allowedRoles={['student']}><NotificationsPage role="student" /></ProtectedRoute>} />
              <Route path="/student/analytics" element={<ProtectedRoute allowedRoles={['student']}><AnalyticsPage role="student" /></ProtectedRoute>} />
              <Route path="/student/settings" element={<ProtectedRoute allowedRoles={['student']}><SettingsPage role="student" /></ProtectedRoute>} />
              <Route path="/student/face" element={<ProtectedRoute allowedRoles={['student']}><FaceRegistrationPage /></ProtectedRoute>} />

              {/* Professor routes */}
              <Route path="/professor" element={<ProtectedRoute allowedRoles={['professor']}><ProfessorDashboard /></ProtectedRoute>} />
              <Route path="/professor/classroom" element={<Navigate to="/professor/classes" replace />} />
              <Route path="/professor/classroom/:classCode" element={<ProtectedRoute allowedRoles={['professor']}><ClassroomPage /></ProtectedRoute>} />
              <Route path="/professor/attendance" element={<ProtectedRoute allowedRoles={['professor']}><TakeAttendancePage /></ProtectedRoute>} />
              <Route path="/professor/attendance/take/:classCode" element={<ProtectedRoute allowedRoles={['professor']}><TakeAttendancePage /></ProtectedRoute>} />
              <Route path="/professor/classes" element={<ProtectedRoute allowedRoles={['professor']}><ProfessorDashboard /></ProtectedRoute>} />
              <Route path="/professor/reports" element={<ProtectedRoute allowedRoles={['professor']}><AnalyticsPage role="professor" /></ProtectedRoute>} />
              <Route path="/professor/analytics" element={<ProtectedRoute allowedRoles={['professor']}><AnalyticsPage role="professor" /></ProtectedRoute>} />
              <Route path="/professor/notifications" element={<ProtectedRoute allowedRoles={['professor']}><NotificationsPage role="professor" /></ProtectedRoute>} />
              <Route path="/professor/settings" element={<ProtectedRoute allowedRoles={['professor']}><SettingsPage role="professor" /></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'college_admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin', 'college_admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/departments" element={<ProtectedRoute allowedRoles={['admin', 'college_admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin', 'college_admin']}><AnalyticsPage role="admin" /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin', 'college_admin']}><SettingsPage role="admin" /></ProtectedRoute>} />

              {/* Super Admin routes */}
              <Route path="/super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/super-admin/institutions" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/super-admin/users" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/super-admin/analytics" element={<ProtectedRoute allowedRoles={['super_admin']}><AnalyticsPage role="super-admin" /></ProtectedRoute>} />
              <Route path="/super-admin/settings" element={<ProtectedRoute allowedRoles={['super_admin']}><SettingsPage role="super-admin" /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

export default App;
