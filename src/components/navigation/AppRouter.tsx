import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoginPage } from '../auth/LoginPage';
import { RegisterPage } from '../auth/RegisterPage';
import { AdminSetupPage } from '../auth/AdminSetupPage';
import { ClubDiscovery } from '../clubs/ClubDiscovery';
import { ClubDetails } from '../clubs/ClubDetails';
import { EventDiscovery } from '../events/EventDiscovery';
import { EventDetails } from '../events/EventDetails';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { MessagingCenter } from '../messaging/MessagingCenter';
import { OfficerDashboard } from '../officer/OfficerDashboard';
import { MemberManagement } from '../officer/MemberManagement';
import { EventManagement } from '../officer/EventManagement';
import { AttendanceTracking } from '../officer/AttendanceTracking';
import { AdminDashboard } from '../admin/AdminDashboard';
import { VenueManagement } from '../admin/VenueManagement';
import { CreateContent } from '../officer/CreateContent';
import { UserProfilePage } from '../profile/UserProfilePage';
import { Dashboard } from '../dashboard/Dashboard';
import { MainLayout } from '../layout/MainLayout';
import { LoadingScreen } from '../shared/LoadingScreen';

// Placeholder Pages (To be implemented)
const Home = () => <Navigate to="/dashboard" replace />;
const Forbidden = () => <div>Forbidden (403) - Access Denied</div>;

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) return <LoadingScreen />;
    if (!user) return <Navigate to="/login" replace />;

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/forbidden" replace />;
    }

    return <Outlet />;
};

const LayoutWrapper: React.FC = () => (
    <MainLayout>
        <Outlet />
    </MainLayout>
);

export const AppRouter: React.FC = () => {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin/setup" element={<AdminSetupPage />} />
            <Route path="/forbidden" element={<Forbidden />} />

            {/* Protected Routes inside MainLayout */}
            <Route element={<ProtectedRoute />}>
                <Route element={<LayoutWrapper />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/clubs" element={<ClubDiscovery />} />
                    <Route path="/clubs/:clubId" element={<ClubDetails />} />
                    <Route path="/events" element={<EventDiscovery />} />
                    <Route path="/events/:eventId" element={<EventDetails />} />
                    <Route path="/messages" element={<MessagingCenter />} />
                    <Route path="/notifications" element={<NotificationCenter />} />
                    <Route path="/profile" element={<UserProfilePage />} />

                    {/* Officer Specific Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['CLUB_OFFICER', 'ADMINISTRATOR']} />}>
                        <Route path="/officer/dashboard" element={<OfficerDashboard />} />
                        <Route path="/officer/create-content" element={<CreateContent />} />
                        <Route path="/officer/members" element={<MemberManagement />} />
                        <Route path="/officer/events" element={<EventManagement />} />
                        <Route path="/officer/events/new" element={<EventManagement />} />
                        <Route path="/officer/events/:eventId" element={<EventManagement />} />
                        <Route path="/officer/attendance/:eventId" element={<AttendanceTracking />} />
                    </Route>

                    {/* Admin Only Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['ADMINISTRATOR']} />}>
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />
                        <Route path="/admin/requests" element={<Navigate to="/admin/dashboard?tab=requests" replace />} />
                        <Route path="/admin/clubs" element={<Navigate to="/admin/dashboard?tab=clubs" replace />} />
                        <Route path="/admin/venues" element={<VenueManagement />} />
                    </Route>
                </Route>
            </Route>

            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
};
