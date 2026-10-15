import React, { useEffect, useState } from 'react';
import { supabase } from '../../components/financial-ops/PermissionGuard';
import { ShieldAlert, Search, RefreshCw, CheckCircle, XCircle, DollarSign, Activity, FileText } from 'lucide-react';
import { OperationDetailsModal } from './OperationDetailsModal';

export const PendingOperations: React.FC = () => {
  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);

  const fetchPendingOperations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vw_admin_payment_operations')
        .select('*')
        .in('system_status', ['WAITING_PROVIDER', 'SUCCESS_PENDING_VERIFICATION', 'UNKNOWN', 'TIMEOUT', 'VERIFIED_SUCCESS'])
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setOperations(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOperations();
  }, []);

  const handleAction = async (operationId: string, actionType: string) => {
    if (actionType === 'settle') {
      const confirmed = window.confirm('Are you sure you want to settle this payment? This will create a financial journal.');
      if (!confirmed) return;
    } else if (actionType === 'reject') {
      const confirmed = window.confirm('Are you sure you want to reject this payment?');
      if (!confirmed) return;
    }

    setActionLoading(operationId);
    try {
      let rpcName = '';
      let payload = { p_operation_id: operationId };
      
      switch (actionType) {
        case 'query': rpcName = 'query_basgate_payment_status'; break;
        case 'settle': rpcName = 'settle_payment'; break;
        case 'retry': rpcName = 'retry_provider_query'; break;
        case 'reject': 
          rpcName = 'reject_payment'; 
          const reason = window.prompt('Enter rejection reason:');
          if (!reason) {
            setActionLoading(null);
            return;
          }
          (payload as any).p_reason = reason;
          break;
      }

      const { error } = await supabase.rpc(rpcName, payload);
      if (error) throw error;
      
      alert(`Action ${actionType} completed successfully.`);
      fetchPendingOperations();
    } catch (e: any) {
      alert(`Failed to perform action: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-4">
        <ShieldAlert className="w-6 h-6 text-amber-500 mt-0.5" />
        <div>
          <h3 className="text-amber-500 font-bold">Action Required</h3>
          <p className="text-sm text-amber-400/80 mt-1">
            The following payments require manual verification, settlement, or rejection. Do not reject payments before querying the provider status.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center p-8 text-slate-500">Loading pending operations...</div>
        ) : operations.length === 0 ? (
          <div className="text-center p-8 bg-slate-800 rounded-xl border border-slate-700 text-slate-400">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            No pending operations. All caught up!
          </div>
        ) : (
          operations.map((op) => (
            <div key={op.id} className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm bg-slate-900 px-3 py-1 rounded text-slate-300">
                    {op.internal_payment_id}
                  </span>
                  <span className="uppercase text-xs font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                    {op.provider}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 block text-xs">Amount</span>
                    <span className="font-bold text-lg">{op.amount} {op.currency}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Provider Ref</span>
                    <span className="font-mono">{op.provider_reference || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">System Status</span>
                    <span className="text-amber-400 font-semibold">{op.system_status}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Verification</span>
                    <span className="text-purple-400 font-semibold">{op.verification_status}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap md:flex-col gap-2 min-w-[160px]">
                <button 
                  disabled={actionLoading === op.id}
                  onClick={() => handleAction(op.id, 'query')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Search className="w-4 h-4" /> Query Status
                </button>
                
                {op.system_status === 'VERIFIED_SUCCESS' && op.verification_status === 'VERIFIED' && (
                  <button 
                    disabled={actionLoading === op.id}
                    onClick={() => handleAction(op.id, 'settle')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <DollarSign className="w-4 h-4" /> Settle
                  </button>
                )}

                {(op.system_status === 'TIMEOUT' || op.system_status === 'UNKNOWN') && (
                  <button 
                    disabled={actionLoading === op.id}
                    onClick={() => handleAction(op.id, 'retry')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" /> Retry Query
                  </button>
                )}

                <button 
                  disabled={actionLoading === op.id}
                  onClick={() => handleAction(op.id, 'reject')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button 
                  onClick={() => setSelectedOperationId(op.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm font-medium"
                >
                  <FileText className="w-4 h-4" /> Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedOperationId && (
        <OperationDetailsModal 
          operationId={selectedOperationId} 
          onClose={() => setSelectedOperationId(null)} 
        />
      )}
    </div>
  );
};

