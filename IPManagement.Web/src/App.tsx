import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useAppDispatch } from './hooks/useAppSelector';
import { fetchProfile } from './store/slices/authSlice';
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

function AuthChecker() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(fetchProfile())
        .unwrap()
        .catch(() => {
          localStorage.removeItem('token');
        });
    }
  }, [dispatch]);

  return null;
}

function AppContent() {
  return (
    <>
      <AuthChecker />
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
                   <Route path="users" element={<UsersPage />} />
                   <Route path="settings" element={<SettingsPage />} />
                   <Route path="roles" element={<RolesPage />} />
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
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
