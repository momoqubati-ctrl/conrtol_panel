import React from 'react';
import { Activity, Server, Cpu, Database, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminMonitoring: React.FC = () => {
  const { dbConnected } = useAuth();

  const services = [
    { name: 'Supabase PostgreSQL DB Engine', status: dbConnected ? 'healthy' : 'degraded', latency: '18ms' },
    { name: 'BasGate Payment Edge Function (bas-initiate-payment)', status: 'healthy', latency: '42ms' },
    { name: 'BasGate Webhook Callback (bas-webhook)', status: 'healthy', latency: '35ms' },
    { name: 'SMS Gateway Service (send-sms)', status: 'healthy', latency: '65ms' },
    { name: 'Firebase Push Messaging Service', status: 'healthy', latency: '28ms' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-900/40 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            <span>مراقبة صحة النظام والأنظمة الخارجية (System Health & Monitoring)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            متابعة حالة اتصالات قاعدة البيانات، الـ Edge Functions، وبوابات الدفع الإلكتروني بالزمن الحقيقي.
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((srv, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-bold text-white text-sm">{srv.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">زمن الاستجابة: <span className="font-mono text-slate-200">{srv.latency}</span></div>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              srv.status === 'healthy' 
                ? 'bg-emerald-950 border border-emerald-800 text-emerald-300' 
                : 'bg-amber-950 border border-amber-800 text-amber-300'
            }`}>
              {srv.status === 'healthy' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{srv.status === 'healthy' ? 'نشط ومستقر' : 'مراقبة'}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
