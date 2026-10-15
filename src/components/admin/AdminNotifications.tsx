import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DataTable, Column } from '../common/DataTable';
import { Bell, Send, CheckCircle2, Users } from 'lucide-react';
import { BroadcastNotification } from '../../types';

export const AdminNotifications: React.FC = () => {
  const { broadcasts, sendBroadcast } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'customer' | 'vendor'>('all');
  const [sending, setSending] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSending(true);
    sendBroadcast(title.trim(), body.trim(), targetRole);
    setTitle('');
    setBody('');
    setSending(false);
    alert('تم إرسال البث المباشر للإشعار بنجاح');
  };

  const columns: Column<BroadcastNotification>[] = [
    {
      header: 'عنوان الإشعار',
      accessor: (row) => <div className="font-bold text-white text-sm">{row.title}</div>,
    },
    {
      header: 'محتوى الإشعار',
      accessor: (row) => <div className="text-xs text-slate-300">{row.body}</div>,
    },
    {
      header: 'الفئة المستهدفة',
      accessor: (row) => (
        <span className="px-2.5 py-1 rounded-full bg-blue-950 border border-blue-800 text-blue-300 text-xs font-bold">
          {row.target_role === 'all' ? 'جميع المستخدمين' : row.target_role === 'vendor' ? 'التجار فقط' : 'العملاء فقط'}
        </span>
      ),
    },
    {
      header: 'التوقيت',
      accessor: (row) => (
        <span className="text-xs text-slate-400 font-mono dir-ltr">
          {new Date(row.created_at).toLocaleString('ar-YE')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/40 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-400" />
            <span>مركز البث المباشر للإشعارات (Notification Broadcast Center)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            صياغة وإرسال تنبيهات Push الجماعية لكافة مستخدمي المنصة أو التابعين لدور محدد.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Send className="w-5 h-5 text-blue-400" />
          <span>صياغة إشعار جديد</span>
        </h3>

        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان الإشعار *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: تحديث جديد في أسعار فئات الواي فاي"
                className="w-full px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">الفئة المستهدفة *</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
                className="w-full px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="all">جميع المستخدمين والتجار (All)</option>
                <option value="vendor">أصحاب الشبكات والتجار فقط (Vendors)</option>
                <option value="customer">العملاء والمشتركين فقط (Customers)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">محتوى الرسالة *</label>
            <textarea
              required
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="اكتب نص الإشعار الذي سيظهر على جوالات المستخدمين..."
              className="w-full px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>إرسال البث المباشر الآن</span>
            </button>
          </div>
        </form>
      </div>

      {/* Broadcast History Table */}
      <DataTable
        data={broadcasts}
        columns={columns}
        title="سجل الإشعارات المرسلة سابقاً"
        searchPlaceholder="بحث في عناوين الإشعارات..."
      />
    </div>
  );
};
