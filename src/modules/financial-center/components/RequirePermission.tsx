import React from 'react';
import { useFinancialContext } from '../providers/FinancialProvider';

interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({ permission, children, fallback = null }) => {
  const { permissions } = useFinancialContext();

  if (permissions.includes(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
