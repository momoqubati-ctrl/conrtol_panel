// src/modules/financial-center/api/financialClient.ts
export interface FinancialClientConfig {
  baseUrl: string;
  token: string;
  correlationId: string;
}

let clientConfig: FinancialClientConfig | null = null;

export const setFinancialClientConfig = (config: FinancialClientConfig) => {
  clientConfig = config;
};

export const fetchFinancialApi = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  if (!clientConfig) throw new Error('FinancialClient is not configured');
  
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${clientConfig.token}`);
  headers.set('X-Correlation-ID', clientConfig.correlationId);
  headers.set('Content-Type', 'application/json');

  if (options.method === 'POST') {
    headers.set('Idempotency-Key', crypto.randomUUID());
  }

  const url = `${clientConfig.baseUrl}${endpoint}`;
  
  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) errorMessage = errorData.error;
    } catch (e) {
      // Ignore parse error
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

export const dashboardApi = {
  getOverview: () => fetchFinancialApi<any>('/dashboard'),
};

export const settlementApi = {
  getPending: () => fetchFinancialApi<any[]>('/settlements/pending'),
  getVendorStatement: (vendorId: string) => fetchFinancialApi<any>(`/vendor/${vendorId}/statement`),
  approveBatch: (batchId: string, reason: string) => fetchFinancialApi<any>(`/settlements/${batchId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),
  executeBatch: (batchId: string, reason: string) => fetchFinancialApi<any>(`/settlements/${batchId}/execute`, {
    method: 'POST',
    body: JSON.stringify({ confirmation: 'EXECUTE', reason })
  })
};

export const auditApi = {
  getTimeline: () => fetchFinancialApi<any>('/audit/timeline'),
};
