import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useAppDispatch } from './hooks/useAppSelector';
import { fetchProfile } from './store/slices/authSlice';
import { useUserActivity } from './hooks/useUserActivity';
import { useSignalR } from './hooks/useSignalR';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UnitsPage from './pages/UnitsPage';
import UnitDetailPage from './pages/UnitDetailPage';
import IPManagementPage from './pages/IPManagementPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import RolesPage from './pages/RolesPage';
import DrawingPage from './pages/DrawingPage';
import NetworkSystemPage from './pages/NetworkSystemPage';

function ActivityTracker() {
  useUserActivity();
  return null;
}

function SignalRConnector() {
  useSignalR();
  return null;
}

function AuthChecker() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('[AuthChecker] Token exists:', !!token);
    if (token) {
      console.log('[AuthChecker] Fetching profile...');
      dispatch(fetchProfile())
        .unwrap()
        .then((user) => {
          console.log('[AuthChecker] Profile fetched successfully:', user);
        })
        .catch((error) => {
          console.error('[AuthChecker] Failed to fetch profile:', error);
          localStorage.removeItem('token');
        });
    }
  }, [dispatch]);

  return null;
}

function AppContent() {
  return (
    <>
      <ActivityTracker />
      <AuthChecker />
      <SignalRConnector />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
          <Route
          path="*"
          element={
            <PrivateRoute>
              <MainLayout>
                  <Routes>
                    <Route index element={<DashboardPage />} />
                    <Route path="ip-management" element={<IPManagementPage />} />
                    <Route path="units" element={<UnitsPage />} />
                    <Route path="units/:id" element={<UnitDetailPage />} />
                    <Route path="units/:id/drawings" element={<DrawingPage />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="roles" element={<RolesPage />} />
                    <Route path="network-systems" element={<NetworkSystemPage />} />
                  </Routes>
              </MainLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter basename={import.meta.env.BASE_URL || '/'}>
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
