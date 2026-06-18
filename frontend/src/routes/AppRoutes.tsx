import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';

// Layout & Security
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import LandingPage from '../pages/admin/LandingPage';
import UnauthorizedPage from '../pages/auth/UnauthorizedPage';
import AdminDashboardPage from '../pages/admin/DashboardPage';
import UserManagementPage from '../pages/admin/UserManagementPage';
import CustomerManagementPage from '../pages/admin/CustomerManagementPage';
import EmployeeDirectoryPage from '../pages/admin/EmployeeDirectoryPage';
import BranchManagement from '../pages/admin/BranchManagement';
import ProductManagement from '../pages/admin/ProductManagement';
import InventoryView from '../pages/admin/InventoryView';
import SettingsPage from '../pages/admin/SettingsPage';
import AuditLogPage from '../pages/admin/AuditLogPage';

// Manager Pages
import ManagerDashboard from '../pages/manager/ManagerDashboard';
import ManagerOrderManagement from '../pages/manager/ManagerOrderManagement';
import ManagerInventoryManagement from '../pages/manager/ManagerInventoryManagement';
import ManagerEmployeeManagement from '../pages/manager/ManagerEmployeeManagement';
import ManagerBranchSettings from '../pages/manager/ManagerBranchSettings';
import ManagerShiftManagementPage from '../pages/manager/ManagerShiftManagementPage';

// Cashier Pages
import EnhancedPOSTerminal from '../pages/cashier/EnhancedPOSTerminal';
import OrderHistoryPage from '../pages/cashier/OrderHistoryPage';

// SuperAdmin Pages
import SuperAdminDashboard from '../pages/superadmin/SuperAdminDashboard';
import TenantsListPage from '../pages/superadmin/TenantsPage';
import SuperAdminSettingsPage from '../pages/superadmin/SuperAdminSettingsPage';
import SuperAdminLayout from '../components/layout/SuperLayout';

// Other Pages
import OrderManagement from '../pages/admin/OrderManagement';
import NotFoundPage from '../pages/NotFoundPage';
import VerifyEmail from '../components/layout/VerifyEmail';
import PendingVerification from '../components/layout/PendingVerification';
import SubscriptionInactivePage from '../pages/auth/SubscriptionInactivePage';

const AppRoutes: React.FC = () => {
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const hasUsableSession = Boolean(
    isLoggedIn &&
    user &&
    user.isEmailVerified !== false &&
    user.subscriptionStatus !== 'PENDING_PAYMENT',
  );

  const getDefaultRoute = () => {
    if (user?.accessMode === 'NO_ACCESS') return '/subscription-inactive';
    if (user?.accessMode === 'BILLING_ONLY') {
      if (user?.roles?.includes('ROLE_STORE_ADMIN')) return '/settings';
      return '/subscription-inactive';
    }
    if (user?.roles?.includes('ROLE_SUPER_ADMIN') || user?.isSuperAdmin) return '/superadmin/dashboard';
    if (user?.roles?.includes('ROLE_CASHIER')) return '/cashier/pos';
    if (user?.roles?.includes('ROLE_BRANCH_MANAGER')) return '/manager/dashboard';
    return '/dashboard';
  };

  return (
    <Routes>
      {/* --- PUBLIC ROUTES --- */}
      <Route
        path="/"
        element={hasUsableSession ? <Navigate to={getDefaultRoute()} /> : <LandingPage />}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/subscription-inactive" element={<SubscriptionInactivePage />} />
      <Route path= "/verify-email" element={<VerifyEmail/>}/>
      <Route path='/pending-verification' element={<PendingVerification/>}/>

      {/* SuperAdmin Routes */}
      <Route element={<SuperAdminLayout />}>
        <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/superadmin/tenants" element={<TenantsListPage />} />
        <Route path="/superadmin/settings" element={<SuperAdminSettingsPage />} />
      </Route>

      {/* --- PROTECTED ROUTES (Sidebar Layout applied to all children) --- */}
      <Route element={<MainLayout />}>
        {/* Shared Dashboard (Admin & Manager) */}
        <Route
          element={<ProtectedRoute allowedRoles={['ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER']} />}
        >
          <Route path="/dashboard" element={<AdminDashboardPage />} />
        </Route>

        {/* 🔐 STORE ADMIN ONLY */}
        <Route element={<ProtectedRoute allowedRoles={['ROLE_STORE_ADMIN']} />}>
          <Route path="/branches" element={<BranchManagement />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin/customers" element={<CustomerManagementPage />} />
          <Route path="/admin/employees" element={<EmployeeDirectoryPage />} />
          <Route path="/audit-logs" element={<AuditLogPage />} />
          {/* <Route path="/subscription/*" element={<SubscriptionRoutes />} />{' '} */}
          {/* Grouped for brevity */}
        </Route>

        {/* 🔐 BRANCH MANAGER & ADMIN */}
        <Route
          element={<ProtectedRoute allowedRoles={['ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER']} />}
        >
          <Route path="/customers" element={<CustomerManagementPage />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/inventory" element={<InventoryView />} />
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/orders" element={<ManagerOrderManagement />} />
          <Route path="/manager/inventory" element={<ManagerInventoryManagement />} />
          <Route path="/manager/employees" element={<ManagerEmployeeManagement />} />
          <Route path="/manager/shifts" element={<ManagerShiftManagementPage />} />
          <Route path="/manager/settings" element={<ManagerBranchSettings />} />
        </Route>

        {/* 🔐 CASHIER & UP */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['ROLE_CASHIER', 'ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER']}
            />
          }
        >
          <Route path="/cashier/pos" element={<EnhancedPOSTerminal />} />
          <Route path="/order-history" element={<OrderHistoryPage />} />
          <Route path="/orders" element={<OrderManagement />} />
        </Route>
      </Route>

      {/* 404 FALLBACK */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
