import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout/Layout';
import { LoginForm } from './components/Auth/LoginForm';
import { Dashboard } from './pages/Dashboard';
import { TeachersPage } from './pages/admin/TeachersPage';
import { StudentsPage } from './pages/admin/StudentsPage';
import { MajorsPage } from './pages/admin/MajorsPage';
import { ClassesPage } from './pages/admin/ClassesPage';
import { SubjectsPage } from './pages/admin/SubjectsPage';
import { SchedulesPage } from './pages/admin/SchedulesPage';
import { LocationSettingsPage } from './pages/admin/LocationSettingsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { AttendanceReportsPage } from './pages/admin/AttendanceReportsPage';
import { AnnouncementsPage } from './pages/admin/AnnouncementsPage';
import { AttendancePage } from './pages/teacher/AttendancePage';
import { StudentAttendancePage as TeacherStudentAttendancePage } from './pages/teacher/StudentAttendancePage';
import { MaterialsPage } from './pages/teacher/MaterialsPage';
import { TasksPage } from './pages/teacher/TasksPage';
import { JournalsPage } from './pages/teacher/JournalsPage';
import { PointsPage } from './pages/teacher/PointsPage';
import { AnnouncementsPage as TeacherAnnouncementsPage } from './pages/teacher/AnnouncementsPage';
import { ClassRankingPage } from './pages/teacher/ClassRankingPage';
import { SchedulePage } from './pages/student/SchedulePage';
import { AttendancePage as StudentAttendancePage } from './pages/student/AttendancePage';
import { MaterialsPage as StudentMaterialsPage } from './pages/student/MaterialsPage';
import { TasksPage as StudentTasksPage } from './pages/student/TasksPage';
import { PointsPage as StudentPointsPage } from './pages/student/PointsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <Routes>
                    <Route path="teachers" element={<TeachersPage />} />
                    <Route path="students" element={<StudentsPage />} />
                    <Route path="majors" element={<MajorsPage />} />
                    <Route path="classes" element={<ClassesPage />} />
                    <Route path="subjects" element={<SubjectsPage />} />
                    <Route path="schedules" element={<SchedulesPage />} />
                    <Route path="location-settings" element={<LocationSettingsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="attendance-reports" element={<AttendanceReportsPage />} />
                    <Route path="announcements" element={<AnnouncementsPage />} />
                    <Route path="*" element={
                      <div className="text-center py-12">
                        <h2 className="text-2xl font-bold text-gray-900">Fitur Admin</h2>
                        <p className="text-gray-600 mt-2">Pilih menu di sidebar</p>
                      </div>
                    } />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/*"
            element={
              <ProtectedRoute requiredRole="guru">
                <Layout>
                  <Routes>
                    <Route path="attendance" element={<AttendancePage />} />
                    <Route path="student-attendance" element={<TeacherStudentAttendancePage />} />
                    <Route path="materials" element={<MaterialsPage />} />
                    <Route path="tasks" element={<TasksPage />} />
                    <Route path="journals" element={<JournalsPage />} />
                    <Route path="points" element={<PointsPage />} />
                    <Route path="announcements" element={<TeacherAnnouncementsPage />} />
                    <Route path="class-ranking" element={<ClassRankingPage />} />
                    <Route path="*" element={
                      <div className="text-center py-12">
                        <h2 className="text-2xl font-bold text-gray-900">Fitur Guru</h2>
                        <p className="text-gray-600 mt-2">Pilih menu di sidebar</p>
                      </div>
                    } />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/*"
            element={
              <ProtectedRoute requiredRole="siswa">
                <Layout>
                  <Routes>
                    <Route path="schedule" element={<SchedulePage />} />
                    <Route path="attendance" element={<StudentAttendancePage />} />
                    <Route path="materials" element={<StudentMaterialsPage />} />
                    <Route path="tasks" element={<StudentTasksPage />} />
                    <Route path="points" element={<StudentPointsPage />} />
                    <Route path="*" element={
                      <div className="text-center py-12">
                        <h2 className="text-2xl font-bold text-gray-900">Fitur Siswa</h2>
                        <p className="text-gray-600 mt-2">Pilih menu di sidebar</p>
                      </div>
                    } />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;