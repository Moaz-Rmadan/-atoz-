import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppRole } from '../../types/auth';

interface RoleGateProps {
  allowedRoles: AppRole[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  allowedRoles,
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { user, isAuthenticated, hasRole, hasAnyRole, isAdmin } = useAuth();

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  // Admin bypass
  if (isAdmin()) {
    return <>{children}</>;
  }

  if (requireAll) {
    const hasAll = allowedRoles.every((role) => hasRole(role));
    return hasAll ? <>{children}</> : <>{fallback}</>;
  }

  const isAllowed = hasAnyRole(allowedRoles);
  return isAllowed ? <>{children}</> : <>{fallback}</>;
};
