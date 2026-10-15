import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, CheckCircle2, Clock, Info, ShieldCheck } from 'lucide-react';

export const VendorNotifications: React.FC = () => {
  const { currentVendor, withdrawalRequests, cards } = useAuth();

  const vendorId = currentVendor?.id || '';
  const myWithdrawals = withdrawalRequests.filter(w => w.vendor_id === vendorId);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/40 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-400" />
            <span>مركز الإشعارات والتنبيهات المباشرة</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            سجل التنبيهات الفورية الخاصة بحسابك، سحوباتك المالية، وملاحظات الإدارة.
          </p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Info className="w-5 h-5 text-blue-400" />
          <span>التنبيهات الأخيرة</span>
        </h3>

        <div className="space-y-3">
          {/* Welcome Notification */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">تم اعتماد حسابك كتاجر معتمد</div>
              <div className="text-xs text-slate-300 mt-1">
                مرحباً بك في شبكتي! حسابك معتمد ومُفعل بنسبة عمولة منفذة {currentVendor?.commission_rate || 5}%.
              </div>
              <div className="text-[11px] text-slate-500 mt-1">منذ التسجيل</div>
            </div>
          </div>

          {/* Withdrawal Notifications */}
          {myWithdrawals.map(w => (
            <div key={w.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${
                w.status === 'approved' ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' :
                w.status === 'rejected' ? 'bg-red-950 border border-red-800 text-red-400' :
                'bg-amber-950 border border-amber-800 text-amber-400'
              }`}>
                {w.status === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>

              <div>
                <div className="font-bold text-white text-sm">
                  {w.status === 'approved' ? 'تم اعتماد طلب السحب وإرفاق السند' :
                   w.status === 'rejected' ? 'تم رفض طلب السحب' :
                   'طلب السحب قيد المعالجة'}
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  طلب سحب بمبلغ <span className="font-bold text-amber-400 font-mono">{w.amount.toLocaleString()} YER</span> إلى حساب <span className="font-mono text-white">{w.account_number}</span>.
                  {w.admin_notes && <span className="block mt-1 text-slate-400">ملاحظة الإدارة: {w.admin_notes}</span>}
                  {w.reject_reason && <span className="block mt-1 text-red-400">سبب الرفض: {w.reject_reason}</span>}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{new Date(w.created_at).toLocaleDateString('ar-YE')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
