import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminService } from '../../services/adminService';
import { DepositRequest } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { ArrowDownCircle, CheckCircle, XCircle, Eye, Search, Filter } from 'lucide-react';
import { formatMasterTransactionId } from '../../lib/ledgerUtils';

export const AdminDeposits: React.FC = () => {
  const { depositRequests, refetchFromDb } = useAuth();
  const [selectedReq, setSelectedReq] = useState<DepositRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const filtered = depositRequests.filter(d => {
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchesSearch = (d.user_name || '').includes(searchTerm) || 
                          (d.reference_number || '').includes(searchTerm) || 
                          (d.user_phone || '').includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const handleApprove = async () => {
    if (selectedReq) {
      try {
        await AdminService.approveDeposit(selectedReq.id, notes);
        await refetchFromDb();
        setSelectedReq(null);
        setNotes('');
      } catch (err: any) {
        alert('فشل اعتماد الإيداع: ' + err.message);
      }
    }
  };

  const handleReject = async () => {
    if (selectedReq) {
      if (!notes) {
        alert('يرجى كتابة سبب الرفض');
        return;
      }
      try {
        await AdminService.rejectDeposit(selectedReq.id, notes);
        await refetchFromDb();
        setSelectedReq(null);
        setNotes('');
      } catch (err: any) {
        alert('فشل رفض الإيداع: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ArrowDownCircle className="w-6 h-6 text-cyan-400" />
            <span>إدارة طلبات الإيداع اليدوي</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">مراجعة سندات الشحن اليدوي واعتماد إضافة الرصيد لحساب المشتركين</p>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="بحث بالاسم أو مرجع التحويل..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">كل الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="approved">المعتمدة</option>
            <option value="rejected">المرفوضة</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-bold text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-4 text-right">صاحب الطلب / الهاتف</th>
                <th className="p-4 text-right">طريقة التحويل</th>
                <th className="p-4 text-right">رقم المحفظة / المرجع</th>
                <th className="p-4 text-right">المبلغ (YER)</th>
                <th className="p-4 text-right">التاريخ والوقت</th>
                <th className="p-4 text-right">الحالة</th>
                <th className="p-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    لا توجد طلبات إيداع تنطبق مع الفلتر الحالي
                  </td>
                </tr>
              ) : (
                filtered.map(req => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 text-right">
                      <div className="font-semibold text-white">{req.user_name || 'عميل شبكتي'}</div>
                      <div className="text-xs text-slate-400 font-mono dir-ltr">{req.user_phone}</div>
                    </td>
                    <td className="p-4 text-right text-slate-300 font-medium">{req.method_name || req.method_id}</td>
                    <td className="p-4 text-right">
                      <div className="font-mono text-xs font-bold text-blue-400 dir-ltr">{formatMasterTransactionId(req.id)}</div>
                      <div className="text-[11px] font-mono text-cyan-300 dir-ltr">{req.reference_number}</div>
                    </td>
                    <td className="p-4 text-right font-bold text-emerald-400 font-mono dir-ltr">
                      {req.amount.toLocaleString()} YER
                    </td>
                    <td className="p-4 text-right text-xs text-slate-400 dir-ltr">
                      {new Date(req.created_at).toLocaleDateString('ar-YE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 text-right"><StatusBadge status={req.status} /></td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => { setSelectedReq(req); setNotes(req.admin_notes || ''); }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>معاينة وتأكيد</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {selectedReq && (
        <Modal
          isOpen={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={`تفاصيل طلب الإيداع - #${selectedReq.reference_number}`}
        >
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">المستخدم:</span>
                <span className="text-white font-semibold">{selectedReq.user_name} ({selectedReq.user_phone})</span>
              </div>
              <div>
                <span className="text-slate-400 block">المبلغ المطلوب:</span>
                <span className="text-emerald-400 font-bold font-mono text-base">{selectedReq.amount.toLocaleString()} YER</span>
              </div>
              <div>
                <span className="text-slate-400 block">جهة التحويل:</span>
                <span className="text-slate-200 font-medium">{selectedReq.method_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">رقم الإشعار / المرجع:</span>
                <span className="text-cyan-300 font-mono font-bold">{selectedReq.reference_number}</span>
              </div>
            </div>

            {/* Receipt Image */}
            {selectedReq.receipt_image_url && (
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">صورة السند المرفقة:</label>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <img
                    src={selectedReq.receipt_image_url}
                    alt="صورة إشعار الإيداع"
                    className="max-h-56 mx-auto rounded-lg object-contain shadow-md"
                  />
                </div>
              </div>
            )}

            {/* Admin Notes Input */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">ملاحظات أو بيان الإدارة:</label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="اكتب بيان التأكيد أو سبب الرفض في حال عدم صحة السند..."
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            {/* Action Buttons */}
            {selectedReq.status === 'pending' ? (
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  onClick={handleReject}
                  className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>رفض الطلب</span>
                </button>

                <button
                  onClick={handleApprove}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>اعتماد وإيداع الرصيد</span>
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
                <span>حالة الطلب الحالية:</span>
                <StatusBadge status={selectedReq.status} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
