import { UserRole } from '../types';

export type PermissionAction = 
  | 'canView'
  | 'canEdit'
  | 'canDelete'
  | 'canApprove'
  | 'canReject'
  | 'canExport'
  | 'canManageUsers'
  | 'canManageSettings'
  | 'canManageWallets';

export const ROLE_PERMISSIONS: Record<UserRole, Record<PermissionAction, boolean>> = {
  admin: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canApprove: true,
    canReject: true,
    canExport: true,
    canManageUsers: true,
    canManageSettings: true,
    canManageWallets: true,
  },
  vendor: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canApprove: false,
    canReject: false,
    canExport: true,
    canManageUsers: false,
    canManageSettings: false,
    canManageWallets: false,
  },
  customer: {
    canView: true,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    canReject: false,
    canExport: false,
    canManageUsers: false,
    canManageSettings: false,
    canManageWallets: false,
  },
  retailer: {
    canView: true,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    canReject: false,
    canExport: true,
    canManageUsers: false,
    canManageSettings: false,
    canManageWallets: false,
  },
  wholesale_merchant: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canApprove: false,
    canReject: false,
    canExport: true,
    canManageUsers: false,
    canManageSettings: false,
    canManageWallets: false,
  },
};

export function hasPermission(role: UserRole | undefined, action: PermissionAction): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.[action] ?? false;
}
