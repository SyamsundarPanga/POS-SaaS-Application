import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';

// Define the shape of the props for the component
interface ProtectedRouteProps {
  allowedRoles: string[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, loading } = useAppSelector((state) => state.auth);
  const activationComplete = Boolean(user) && user.isEmailVerified !== false && user.subscriptionStatus !== 'PENDING_PAYMENT';
  const isAuthenticated = !!user && activationComplete;
  const location = useLocation();

  // 1. Loading Guard: Prevents redirecting to login while Redux is initializing
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Verifying Session...
          </span>
        </div>
      </div>
    );
  }

  // 2. Auth Guard: Redirect to login if the user is not authenticated
  if (!isAuthenticated || !user) {
    if (user && !activationComplete) {
      localStorage.removeItem('user');
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Permission Guard: Check if user has at least one of the required roles
  const hasAccess = user.roles?.some((role: string) => allowedRoles.includes(role));

  // 3.5 Subscription access-mode guard
  const accessMode = user.accessMode || 'FULL_ACCESS';
  if (accessMode === 'NO_ACCESS') {
    return <Navigate to="/subscription-inactive" replace />;
  }

  if (accessMode === 'BILLING_ONLY') {
    const isStoreAdmin = user.roles?.includes('ROLE_STORE_ADMIN');
    if (!isStoreAdmin) {
      return <Navigate to="/subscription-inactive" replace />;
    }
    if (location.pathname !== '/settings') {
      return <Navigate to="/settings" replace />;
    }
  }

  if (!hasAccess) {
    // Redirect to unauthorized if they don't have the right permissions
    return <Navigate to="/unauthorized" replace />;
  }

  // 4. Render children via Outlet if all checks pass
  return <Outlet />;
};

export default ProtectedRoute;
