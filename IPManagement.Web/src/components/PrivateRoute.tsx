import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const PrivateRoute = ({ children, requiredRoles }: PrivateRouteProps) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && user) {
    const hasRequiredRole = requiredRoles.some(role => user.roles?.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default PrivateRoute;