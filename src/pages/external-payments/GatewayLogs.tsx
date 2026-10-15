import React, { useEffect, useState } from 'react';
import { supabase } from '../../components/financial-ops/PermissionGuard';
import { Search, ChevronDown, ChevronUp, Copy, Check, Clock } from 'lucide-react';

export const GatewayLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vw_admin_payment_operation_logs')
        .select(`
          *,
          operation:operation_id (
            internal_payment_id,
            provider,
            provider_reference
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
        <h2 className="font-bold text-lg">System Audit Logs</h2>
        <button onClick={fetchLogs} className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">
          Refresh Logs
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center p-8 text-slate-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center p-8 bg-slate-800 rounded-xl border border-slate-700 text-slate-400">
            No logs found.
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedLog === log.id;
            const hasPayload = log.request || log.response;

            return (
              <div key={log.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div 
                  className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors ${isExpanded ? 'border-b border-slate-700 bg-slate-700/30' : ''}`}
                  onClick={() => hasPayload && setExpandedLog(isExpanded ? null : log.id)}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-48">
                      <span className="text-xs text-slate-400 block">{new Date(log.created_at).toLocaleString()}</span>
                      <span className="font-bold text-sm text-indigo-400">{log.event_type}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400">Reference</span>
                      <span className="font-mono text-sm">{log.operation?.internal_payment_id || log.operation_id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {log.latency_ms > 0 && (
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <Clock className="w-3 h-3" />
                        {log.latency_ms}ms
                      </div>
                    )}
                    {log.http_status && (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        log.http_status >= 200 && log.http_status < 300 ? 'bg-green-500/20 text-green-400' :
                        log.http_status >= 400 ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        HTTP {log.http_status}
                      </span>
                    )}
                    {hasPayload && (
                      isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                </div>

                {isExpanded && hasPayload && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/50">
                    
                    {log.request && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase">Request Payload</span>
                          <button onClick={() => handleCopy(JSON.stringify(log.request, null, 2), `req-${log.id}`)} className="text-slate-500 hover:text-slate-300">
                            {copiedId === `req-${log.id}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <pre className="bg-slate-950 p-3 rounded-lg overflow-x-auto text-xs font-mono text-blue-300 border border-slate-800">
                          {JSON.stringify(log.request, null, 2)}
                        </pre>
                      </div>
                    )}

                    {log.response && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase">Response Payload</span>
                          <button onClick={() => handleCopy(JSON.stringify(log.response, null, 2), `res-${log.id}`)} className="text-slate-500 hover:text-slate-300">
                            {copiedId === `res-${log.id}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <pre className="bg-slate-950 p-3 rounded-lg overflow-x-auto text-xs font-mono text-green-300 border border-slate-800">
                          {JSON.stringify(log.response, null, 2)}
                        </pre>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
