import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';
import { Wallet, Plus, Eye, ShieldAlert } from 'lucide-react';
import { Modal } from '../common/Modal';

export const VendorWithdrawals: React.FC = () => {
  const { withdrawalRequests, submitWithdrawal, currentVendor, cards, networks, wallets, withdrawalMethods } = useAuth();
  
  const vendorId = currentVendor?.id || '';
  const vendorNetworks = vendorId ? networks.filter(n => n.vendor_id === vendorId) : [];
  const vendorCards = vendorNetworks.length ? cards.filter(c => vendorNetworks.some(n => n.id === c.network_id)) : [];

  const vendorWallet = wallets.find(w => w.user_id === vendorId);
  const availableBalance = Math.max(0, (vendorWallet?.balance || 0) - (vendorWallet?.held_balance || 0));

  const vendorWithdrawalRequests = vendorId ? withdrawalRequests.filter(w => w.vendor_id === vendorId) : [];
  const totalApprovedWithdrawn = vendorWithdrawalRequests
    .filter(w => w.status === 'approved')
    .reduce((sum, w) => sum + w.amount, 0);

  const totalPendingWithdrawn = vendorWithdrawalRequests
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0);

  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');

  const [formData, setFormData] = useState({
    amount: 0,
    account_number: '',
    account_name: '',
  });

  useEffect(() => {
    if (!selectedMethodId && withdrawalMethods.length > 0) {
      setSelectedMethodId(withdrawalMethods[0].id);
    }
  }, [withdrawalMethods, selectedMethodId]);

  const selectedMethod = withdrawalMethods.find(method => method.id === selectedMethodId);

  const handleSubmit = () => {
    if (formData.amount <= 0) {
      alert('يرجى كتابة مبلغ سحب صحيح أعلى من صفر');
      return;
    }
    if (formData.amount > availableBalance && availableBalance > 0) {
      alert(`المبلغ المطلوب (${formData.amount.toLocaleString()} YER) يتجاوز رصيدك المتاح للسحب (${availableBalance.toLocaleString()} YER)`);
      return;
    }
    if (!selectedMethod) {
      alert('يرجى اختيار طريقة السحب');
      return;
    }
    if (!formData.account_number.trim()) {
      alert('يرجى تحديد رقم الحساب البنكي أو المحفظة');
      return;
    }
    if (!formData.account_name.trim()) {
      alert('يرجى تحديد اسم المستفيد الكامل');
      return;
    }

    submitWithdrawal({
      vendor_id: vendorId,
      amount: formData.amount,
      bank_name: selectedMethod.name,
      account_number: formData.account_number,
      account_name: formData.account_name,
      method_id: selectedMethod.id,
    });
    setIsSubmitOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-400" />
            <span>طلب سحب وتسوية الأرباح (Earnings Withdrawal)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">طلب تحويل مستحقات المبيعات إلى حسابك البنكي أو محفظتك الإلكترونية</p>
        </div>

        <button
          onClick={() => {
            setFormData(prev => ({ ...prev, amount: Math.min(10000, availableBalance || 10000) }));
            setIsSubmitOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تقديم طلب سحب أرباح جديد</span>
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">الرصيد المتاح للسحب الحقيقي</span>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono">{availableBalance.toLocaleString()} YER</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">طلبات سحب قيد المعالجة</span>
          <span className="text-2xl font-extrabold text-amber-400 font-mono">{totalPendingWithdrawn.toLocaleString()} YER</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">إجمالي المسحوبات المصروفة</span>
          <span className="text-2xl font-extrabold text-cyan-400 font-mono">{totalApprovedWithdrawn.toLocaleString()} YER</span>
        </div>
      </div>

      {/* Requests History List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-bold text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-4">المبلغ المستحق</th>
                <th className="p-4">البنك / المحفظة</th>
                <th className="p-4">رقم الحساب / اسم المستفيد</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">إشعار السداد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {vendorWithdrawalRequests.map(req => (
                <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-bold text-emerald-400 font-mono text-base dir-ltr">
                    {req.amount.toLocaleString()} YER
                  </td>
                  <td className="p-4 text-slate-200">{req.bank_name || req.method_id}</td>
                  <td className="p-4">
                    <div className="font-mono text-cyan-300 text-xs dir-ltr">{req.account_number}</div>
                    <div className="text-[11px] text-slate-400">{req.account_name}</div>
                  </td>
                  <td className="p-4 text-xs text-slate-400">
                    {new Date(req.created_at).toLocaleDateString('ar-YE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-4"><StatusBadge status={req.status} /></td>
                  <td className="p-4 text-center">
                    {req.receipt_url ? (
                      <button
                        onClick={() => setSelectedReceiptUrl(req.receipt_url || null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>معاينة الإشعار</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">قيد المعالجة</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Withdrawal Modal */}
      <Modal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        title="تقديم طلب سحب أرباح"
      >
        <div className="space-y-4 text-sm">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">الرصيد المتاح للسحب الآن:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{availableBalance.toLocaleString()} YER</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">المبلغ المراد سحبه (YER):</label>
            <input
              type="number"
              step="1000"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-base text-emerald-400 font-bold font-mono focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">طريقة السحب:</label>
            <select
              value={selectedMethodId}
              onChange={e => setSelectedMethodId(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              {withdrawalMethods.map(method => (
                <option key={method.id} value={method.id}>{method.name}</option>
              ))}
            </select>
          </div>

          {selectedMethod && (
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-slate-300">
              <div className="font-semibold text-slate-200 mb-2">تعليمات السحب:</div>
              <div className="text-[11px] leading-5 text-slate-400">{selectedMethod.instructions}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">رقم الحساب / المحفظة:</label>
              <input
                type="text"
                value={formData.account_number}
                onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-cyan-300 font-mono focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">اسم المستفيد الثلاثي:</label>
              <input
                type="text"
                value={formData.account_name}
                onChange={e => setFormData({ ...formData, account_name: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsSubmitOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              إرسال طلب السحب
            </button>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      {selectedReceiptUrl && (
        <Modal
          isOpen={!!selectedReceiptUrl}
          onClose={() => setSelectedReceiptUrl(null)}
          title="إشعار وسند التحويل المالي المرفق من الإدارة"
        >
          <div className="p-2 bg-slate-950 rounded-xl text-center">
            <img src={selectedReceiptUrl} alt="سند التحويل" className="max-h-72 mx-auto rounded-lg object-contain" />
          </div>
        </Modal>
      )}
    </div>
  );
};
