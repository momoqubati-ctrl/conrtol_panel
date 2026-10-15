import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (assumes env variables exist)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);

interface PermissionGuardProps {
  requiredPermission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ requiredPermission, children, fallback }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user?.user) {
          setHasPermission(false);
          return;
        }

        // Call the RPC to check permission
        const { data, error } = await supabase.rpc('has_permission', {
          p_user_id: user.user.id,
          p_permission: requiredPermission
        });

        if (error) {
          console.error("Permission check failed:", error);
          setHasPermission(false);
        } else {
          setHasPermission(data === true);
        }
      } catch (err) {
        console.error("Unexpected error in permission check:", err);
        setHasPermission(false);
      }
    };

    checkPermission();
  }, [requiredPermission]);

  if (hasPermission === null) {
    return <div className="p-4 flex justify-center"><div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div></div>;
  }

  if (!hasPermission) {
    return fallback ? <>{fallback}</> : (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
        <h3 className="font-bold">FIN-SEC-1001: Unauthorized Access</h3>
        <p>You do not have the required permission ({requiredPermission}) to view this content.</p>
      </div>
    );
  }

  return <>{children}</>;
};
