import React, { useEffect, useState } from 'react';
import { supabase } from '../../components/financial-ops/PermissionGuard';
import { X, CheckCircle, Clock, FileText, Globe, AlertTriangle, Activity } from 'lucide-react';

interface OperationDetailsModalProps {
  operationId: string;
  onClose: () => void;
}

export const OperationDetailsModal: React.FC<OperationDetailsModalProps> = ({ operationId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const { data: res, error } = await supabase.rpc('get_payment_operation_details', { p_operation_id: operationId });
        if (error) throw error;
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [operationId]);

  if (!operationId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Globe className="text-indigo-400 w-5 h-5" />
              Operation Details
            </h2>
            <p className="text-sm text-slate-400 font-mono mt-1">{operationId}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading ? (
            <div className="text-center p-12 text-slate-500">Loading details...</div>
          ) : data ? (
            <>
              {/* Summary Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-500 block mb-1">Internal Reference</span>
                  <span className="font-mono font-bold">{data.operation.internal_payment_id}</span>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-500 block mb-1">Provider Reference</span>
                  <span className="font-mono font-bold text-indigo-400">{data.operation.provider_reference || 'N/A'}</span>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-500 block mb-1">Amount</span>
                  <span className="font-bold text-green-400">{data.operation.amount} {data.operation.currency}</span>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-500 block mb-1">Created At</span>
                  <span className="text-sm">{new Date(data.operation.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Status Machine Section */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-400" /> State Machine
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-900 rounded border border-slate-700">
                    <span className="text-xs text-slate-500 block">System Status</span>
                    <span className={`font-bold mt-1 block ${
                      data.operation.system_status === 'LEDGER_POSTED' ? 'text-green-500' : 
                      data.operation.system_status === 'REJECTED' || data.operation.system_status === 'FAILED' ? 'text-red-500' : 'text-amber-500'
                    }`}>{data.operation.system_status}</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-slate-700">
                    <span className="text-xs text-slate-500 block">Verification Status</span>
                    <span className={`font-bold mt-1 block ${
                      data.operation.verification_status === 'VERIFIED' ? 'text-blue-500' : 
                      data.operation.verification_status === 'MANUAL_REVIEW_REQUIRED' ? 'text-purple-500' : 'text-slate-400'
                    }`}>{data.operation.verification_status}</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-slate-700">
                    <span className="text-xs text-slate-500 block">Journal ID (Ledger)</span>
                    <span className="font-mono text-xs mt-1 block text-emerald-400 break-all">
                      {data.operation.settlement_transaction_id || 'Not Settled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline Section */}
              <div>
                <h3 className="font-bold text-slate-300 mb-6 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" /> Operation Timeline
                </h3>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                  {data.timeline?.map((event: any, i: number) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-700 text-slate-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        {event.event_type.includes('SUCCESS') || event.event_type === 'LEDGER_POSTED' ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : event.event_type.includes('FAIL') || event.event_type.includes('REJECT') ? (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-700 bg-slate-800 shadow">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm text-indigo-300">{event.event_type}</span>
                          <time className="font-mono text-xs text-slate-400">{new Date(event.created_at).toLocaleTimeString()}</time>
                        </div>
                        {event.http_status && (
                          <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">HTTP {event.http_status}</span>
                        )}
                        {event.request && (
                          <pre className="mt-3 bg-slate-900 p-2 rounded text-xs font-mono text-slate-400 overflow-x-auto">
                            {JSON.stringify(event.request, null, 2)}
                          </pre>
                        )}
                        {event.response && (
                          <pre className="mt-2 bg-slate-900 p-2 rounded text-xs font-mono text-slate-400 overflow-x-auto">
                            {JSON.stringify(event.response, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center p-12 text-red-500">Failed to load operation details.</div>
          )}
        </div>
      </div>
    </div>
  );
};
