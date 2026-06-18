import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';

export type UserRole = 'ROLE_CASHIER' | 'ROLE_BRANCH_MANAGER' | 'ROLE_STORE_ADMIN';

/**
 * Custom hook for checking user permissions based on role
 */
export const usePermissions = () => {
  const user = useAppSelector((state) => state.auth.user);

  const userRole = useMemo(() => {
    return user?.role as UserRole | undefined;
  }, [user]);

  const hasRole = (role: UserRole): boolean => {
    return userRole === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return userRole ? roles.includes(userRole) : false;
  };

  const isCashier = useMemo(() => hasRole('ROLE_CASHIER'), [userRole]);
  const isManager = useMemo(() => hasRole('ROLE_BRANCH_MANAGER'), [userRole]);
  const isAdmin = useMemo(() => hasRole('ROLE_STORE_ADMIN'), [userRole]);

  const canAccessCashier = useMemo(
    () => hasAnyRole(['ROLE_CASHIER', 'ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN']),
    [userRole]
  );

  const canAccessManager = useMemo(
    () => hasAnyRole(['ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN']),
    [userRole]
  );

  const canAccessAdmin = useMemo(() => hasRole('ROLE_STORE_ADMIN'), [userRole]);

  return {
    userRole,
    hasRole,
    hasAnyRole,
    isCashier,
    isManager,
    isAdmin,
    canAccessCashier,
    canAccessManager,
    canAccessAdmin,
  };
};

export default usePermissions;
