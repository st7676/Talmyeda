import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterInstitutionPage } from './pages/RegisterInstitutionPage';
import { JoinPage } from './pages/JoinPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { ParticipantsPage } from './pages/ParticipantsPage';
import { StaffPage } from './pages/StaffPage';
import { GroupsPage } from './pages/GroupsPage';
import { RegistrationRequestsPage } from './pages/RegistrationRequestsPage';
import { FieldDefinitionsPage } from './pages/FieldDefinitionsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { PlatformInstitutionsPage } from './pages/PlatformInstitutionsPage';
import { MessagesPage } from './pages/MessagesPage';
import { Role } from './types';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterInstitutionPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route
                path="/my-profile"
                element={
                  <ProtectedRoute roles={[Role.Participant, Role.Staff]}>
                    <MyProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/participants"
                element={
                  <ProtectedRoute roles={[Role.Admin, Role.Staff]}>
                    <ParticipantsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff"
                element={
                  <ProtectedRoute roles={[Role.Admin]}>
                    <StaffPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/groups" element={<GroupsPage />} />
              <Route
                path="/registration-requests"
                element={
                  <ProtectedRoute roles={[Role.Admin]}>
                    <RegistrationRequestsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/field-definitions"
                element={
                  <ProtectedRoute roles={[Role.Admin]}>
                    <FieldDefinitionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute roles={[Role.Admin]}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute roles={[Role.Admin]}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platform/institutions"
                element={
                  <ProtectedRoute roles={[Role.SuperAdmin]}>
                    <PlatformInstitutionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute roles={[Role.Admin, Role.Participant, Role.Staff]}>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<DashboardPage />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
