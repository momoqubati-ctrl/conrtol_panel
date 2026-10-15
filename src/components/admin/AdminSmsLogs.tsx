import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Search, CheckCircle2, AlertTriangle } from 'lucide-react';

export const AdminSmsLogs: React.FC = () => {
  const { smsLogs } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = smsLogs.filter(s => 
    s.recipient_phone.includes(searchTerm) || 
    s.message.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-cyan-400" />
            <span>سجلات وتتبع الرسائل النصية (SMS Logs)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">مراقبة الرسائل النصية القصيرة لإشعار المعاملات ورسائل التحقق OTP</p>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="بحث بالرقم أو نص الرسالة..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-bold text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-4">رقم المستلم</th>
                <th className="p-4">محتوى الرسالة النصية</th>
                <th className="p-4">استجابة المزود</th>
                <th className="p-4">التاريخ والوقت</th>
                <th className="p-4 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-mono text-cyan-300 text-xs dir-ltr">{log.recipient_phone}</td>
                  <td className="p-4 text-slate-200 text-xs max-w-md">{log.message}</td>
                  <td className="p-4 font-mono text-[11px] text-slate-400">{log.provider_response || 'Deliverd'}</td>
                  <td className="p-4 text-xs text-slate-400">
                    {new Date(log.sent_at).toLocaleDateString('ar-YE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-4 text-center">
                    {log.status === 'sent' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تم الإرسال</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-xs font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>فشلت</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
