import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Radio, Send, Users, CheckCircle, BellRing } from 'lucide-react';

export const AdminBroadcast: React.FC = () => {
  const { broadcasts, sendBroadcast } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'customer' | 'vendor'>('all');
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSend = () => {
    if (!title || !body) {
      alert('يرجى ملء عنوان ونص الإشعار الجماعي');
      return;
    }
    sendBroadcast(title, body, targetRole);
    setTitle('');
    setBody('');
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Radio className="w-6 h-6 text-rose-400" />
          <span>مركز البث المباشر للإشعارات الجماعية (Broadcast Notifications)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">إرسال تنبيهات وفلاشات عاجلة لكافة مستخدمي التطبيق أو شريحة التجار حصراً</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>تم إرسال البث الجماعي بنجاح عبر FCM وSupabase Database!</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">الفئة المستهدفة:</label>
            <select
              value={targetRole}
              onChange={e => setTargetRole(e.target.value as any)}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-rose-500 cursor-pointer"
            >
              <option value="all">جميع المستخدمين (عملاء وتجار)</option>
              <option value="vendor">أصحاب الشبكات والتجار فقط</option>
              <option value="customer">العملاء والمشتركون فقط</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">عنوان الإشعار:</label>
            <input
              type="text"
              placeholder="مثال: تحديث هام بشأن أسعار بطاقات النت..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">محتوى الإشعار:</label>
            <textarea
              rows={4}
              placeholder="اكتب تفاصيل التنبيه الموجه للتطبيق..."
              value={body}
              onChange={e => setBody(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
            />
          </div>

          <button
            onClick={handleSend}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer transition-all"
          >
            <Send className="w-4 h-4" />
            <span>إرسال البث الفوري</span>
          </button>
        </div>

        {/* History Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <BellRing className="w-4 h-4 text-amber-400" />
            <span>سجل الإشعارات المرسلة سابقاً</span>
          </h3>

          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {broadcasts.length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-8">لم يتم إرسال أي بث جماعي مؤخراً</div>
            ) : (
              broadcasts.map(bc => (
                <div key={bc.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs space-y-1">
                  <div className="font-bold text-white">{bc.title}</div>
                  <div className="text-slate-300 leading-relaxed">{bc.body}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>المستهدف: {bc.target_role}</span>
                    <span>{new Date(bc.created_at).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
