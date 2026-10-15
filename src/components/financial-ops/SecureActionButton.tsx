import React, { useState } from 'react';
import { PermissionGuard } from './PermissionGuard';
import { Loader2 } from 'lucide-react';

interface SecureActionButtonProps {
  requiredPermission: string;
  onClick: () => Promise<void>;
  label: string;
  loadingLabel?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'danger' | 'outline';
  disabled?: boolean;
}

export const SecureActionButton: React.FC<SecureActionButtonProps> = ({
  requiredPermission,
  onClick,
  label,
  loadingLabel = 'Processing...',
  icon,
  variant = 'primary',
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onClick();
    } finally {
      setIsLoading(false);
    }
  };

  let btnClass = "flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
  
  switch (variant) {
    case 'primary':
      btnClass += " text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
      break;
    case 'danger':
      btnClass += " text-white bg-red-600 hover:bg-red-700 focus:ring-red-500";
      break;
    case 'outline':
      btnClass += " text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-blue-500";
      break;
  }

  const ButtonContent = (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={btnClass}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </>
      )}
    </button>
  );

  return (
    <PermissionGuard requiredPermission={requiredPermission} fallback={<></>}>
      {ButtonContent}
    </PermissionGuard>
  );
};
