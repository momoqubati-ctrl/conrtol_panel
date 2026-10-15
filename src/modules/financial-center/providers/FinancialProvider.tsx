import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { setFinancialClientConfig } from '../api/financialClient';

// Initialize Supabase Client (assuming env vars exist)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

interface FinancialContextValue {
  user: any;
  permissions: string[];
  correlationId: string;
}

const FinancialContext = createContext<FinancialContextValue | null>(null);

export const useFinancialContext = () => {
  const ctx = useContext(FinancialContext);
  if (!ctx) throw new Error('useFinancialContext must be used within a FinancialProvider');
  return ctx;
};

// We mock the backend JWT resolving into a claims array for the UI to consume.
// In a real system, `user.app_metadata.permissions` would be injected by a Supabase Hook.
const getPermissionsFromRole = (role: string): string[] => {
  const matrix: Record<string, string[]> = {
    'financial_auditor': ['dashboard.view', 'audit.view'],
    'operations_manager': ['reconciliation.review'],
    'settlement_operator': ['settlement.prepare', 'settlement.view'],
    'settlement_approver': ['settlement.approve', 'settlement.view'],
    'financial_controller': ['dashboard.view', 'audit.view', 'settlement.execute', 'settlement.view', 'vendor.statement.view']
  };
  return matrix[role] || [];
};

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate a unique Correlation ID for this session/mount
  const correlationId = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const role = session.user.app_metadata?.role || 'unassigned';
        const perms = getPermissionsFromRole(role);
        setPermissions(perms);

        setFinancialClientConfig({
          baseUrl: `${supabaseUrl}/functions/v1/financial-api`,
          token: session.access_token,
          correlationId
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const role = session.user.app_metadata?.role || 'unassigned';
        const perms = getPermissionsFromRole(role);
        setPermissions(perms);

        setFinancialClientConfig({
          baseUrl: `${supabaseUrl}/functions/v1/financial-api`,
          token: session.access_token,
          correlationId
        });
      } else {
        setUser(null);
        setPermissions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [correlationId]);

  if (loading) return <div>Loading Financial Environment...</div>;

  return (
    <QueryClientProvider client={queryClient}>
      <FinancialContext.Provider value={{ user, permissions, correlationId }}>
        {children}
      </FinancialContext.Provider>
    </QueryClientProvider>
  );
};
