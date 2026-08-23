import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppPermission } from '../../types/auth';

interface PermissionGateProps {
  requiredPermissions: AppPermission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  requiredPermissions,
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { user, isAuthenticated, hasPermission, hasAnyPermission, isAdmin } = useAuth();

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  // Admin bypass
  if (isAdmin()) {
    return <>{children}</>;
  }

  if (requireAll) {
    const hasAll = requiredPermissions.every((perm) => hasPermission(perm));
    return hasAll ? <>{children}</> : <>{fallback}</>;
  }

  const isAllowed = hasAnyPermission(requiredPermissions);
  return isAllowed ? <>{children}</> : <>{fallback}</>;
};
