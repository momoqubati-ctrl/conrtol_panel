import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSupabase } from '../../lib/supabase';
import { WithdrawalRequest } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { ArrowUpCircle, CheckCircle, XCircle, Eye, Search, Upload, FileText } from 'lucide-react';

import { AdminService } from '../../services/adminService';
import { FileUploadService } from '../../services/fileUploadService';
import { formatMasterTransactionId } from '../../lib/ledgerUtils';

export const AdminWithdrawals: React.FC = () => {
  const { withdrawalRequests, refetchFromDb } = useAuth();
  const [selectedReq, setSelectedReq] = useState<WithdrawalRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>('');

  const filtered = withdrawalRequests.filter(w => {
    const matchesStatus = filterStatus === 'all' || w.status === filterStatus;
    const matchesSearch = (w.vendor_name || '').includes(searchTerm) || 
                          (w.account_number || '').includes(searchTerm) || 
                          (w.bank_name || '').includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const handleApprove = async () => {
    if (!selectedReq) return;

    if (!receiptFile && !receiptUrl) {
      alert('يرجى رفع سند التحويل أو إدخال رابط صالح');
      return;
    }

    try {
      let finalReceiptUrl = receiptUrl;

      if (receiptFile) {
        try {
          finalReceiptUrl = await FileUploadService.uploadFile(receiptFile, { bucket: 'profiles' }) || '';
        } catch (uploadErr: any) {
          console.warn('Storage upload fallback triggered:', uploadErr.message);
          finalReceiptUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(receiptFile);
          });
        }
      }

      await AdminService.approveWithdrawal(selectedReq.id, finalReceiptUrl || undefined);
      await refetchFromDb();
      setSelectedReq(null);
      setReceiptUrl('');
      setReceiptFile(null);
      setNotes('');
    } catch (err: any) {
      console.error('handleApprove error:', err);
      alert('حدث خطأ أثناء اعتماد طلب السحب: ' + err.message);
    }
  };

  const handleReject = async () => {
    if (selectedReq) {
      if (!notes) {
        alert('يرجى ذكر سبب الرفض لتوضيحه للتاجر');
        return;
      }
      try {
        await AdminService.rejectWithdrawal(selectedReq.id, notes);
        await refetchFromDb();
        setSelectedReq(null);
        setNotes('');
      } catch (err: any) {
        alert('فشل رفض السحب: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ArrowUpCircle className="w-6 h-6 text-purple-400" />
            <span>طلبات سحب أرباح التجار</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">الموافقة على تحويل مستحقات التجار وإرفاق إشعارات السداد البنكية</p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="بحث باسم التاجر أو رقم الحساب..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-purple-500 cursor-pointer"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">المعلقة</option>
            <option value="approved">المكتملة</option>
            <option value="rejected">المرفوضة</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-bold text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-4 text-right">التاجر / صاحب الطلب</th>
                <th className="p-4 text-right">المحفظة / البنك المستهدف</th>
                <th className="p-4 text-right">رقم الحساب / المحفظة المدخل</th>
                <th className="p-4 text-right">المبلغ المستحق (YER)</th>
                <th className="p-4 text-right">التاريخ والوقت</th>
                <th className="p-4 text-right">الحالة</th>
                <th className="p-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    لا توجد طلبات سحب تنطبق مع الفلتر
                  </td>
                </tr>
              ) : (
                filtered.map(req => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 text-right">
                      <div className="font-semibold text-white">{req.vendor_name}</div>
                      <div className="text-xs text-slate-400 font-mono dir-ltr">{req.vendor_phone}</div>
                    </td>
                    <td className="p-4 text-right text-slate-300 font-medium">{req.bank_name}</td>
                    <td className="p-4 text-right">
                      <div className="font-mono text-xs font-bold text-blue-400 dir-ltr">{formatMasterTransactionId(req.id)}</div>
                      <div className="font-mono text-cyan-300 text-xs dir-ltr">{req.account_number}</div>
                      <div className="text-[11px] text-slate-400">{req.account_name}</div>
                    </td>
                    <td className="p-4 text-right font-bold text-amber-400 font-mono dir-ltr">
                      {req.amount.toLocaleString()} YER
                    </td>
                    <td className="p-4 text-right text-xs text-slate-400 dir-ltr">
                      {new Date(req.created_at).toLocaleDateString('ar-YE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 text-right"><StatusBadge status={req.status} /></td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => { setSelectedReq(req); setNotes(req.admin_notes || ''); }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>معالجة السحب</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedReq && (
        <Modal
          isOpen={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={`معالجة طلب سحب التاجر - ${selectedReq.vendor_name}`}
        >
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">اسم التاجر:</span>
                <span className="text-white font-semibold">{selectedReq.vendor_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">المبلغ المطلوب سحبه:</span>
                <span className="text-amber-400 font-bold font-mono text-base">{selectedReq.amount.toLocaleString()} YER</span>
              </div>
              <div>
                <span className="text-slate-400 block">البنك / المحفظة:</span>
                <span className="text-slate-200 font-medium">{selectedReq.bank_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">رقم الحساب المستهدف:</span>
                <span className="text-cyan-300 font-mono font-bold">{selectedReq.account_number} ({selectedReq.account_name})</span>
              </div>
            </div>

            {/* Receipt URL / Image upload simulation */}
            {selectedReq.status === 'pending' && (
              <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">رفع سند التحويل البنكي:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-300 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white"
                />
                {receiptFile && (
                  <div className="text-[11px] text-slate-400 mt-2">تم اختيار الملف: {receiptFile.name}</div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">أو استخدم رابط سند الدفع:</label>
                <input
                  type="text"
                  value={receiptUrl}
                  onChange={e => setReceiptUrl(e.target.value)}
                  placeholder="رابط إشعار الدفع البنكي"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
                />
              </div>
            </div>
            )}

            {selectedReq.receipt_url && (
              <div>
                <span className="text-xs font-semibold text-slate-400 mb-1 block">إشعار السداد المرفق:</span>
                <img src={selectedReq.receipt_url} alt="سند تحويل" className="max-h-48 mx-auto rounded-lg border border-slate-700 object-contain" />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">ملاحظات الإدارة:</label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="اكتب رقم المرجع البنكي أو سبب الرفض..."
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
              />
            </div>

            {/* Actions */}
            {selectedReq.status === 'pending' ? (
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  onClick={handleReject}
                  className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>رفض وإعادة المبلغ لحساب التاجر</span>
                </button>

                <button
                  onClick={handleApprove}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-900/40 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>تأكيد تحويل أرباح التاجر</span>
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
                <span>الحالة النهائية:</span>
                <StatusBadge status={selectedReq.status} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
