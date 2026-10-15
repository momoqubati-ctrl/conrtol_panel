import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { VendorService } from '../../services/vendorService';
import { DataTable, Column } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { Phone, PlusCircle, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { VendorLine } from '../../types';

export const VendorLines: React.FC = () => {
  const { currentVendor, lines, refetchFromDb } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [lineNumber, setLineNumber] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const vendorId = currentVendor?.id || '';
  const vendorLines = lines.filter(l => l.vendor_id === vendorId);

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineNumber.trim()) return;

    // Local duplicate check
    if (vendorLines.some(l => l.line_number.trim() === lineNumber.trim())) {
      setErrorMsg('رقم الخط هذا مسجل لديك مسبقاً');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await VendorService.addVendorLine(vendorId, lineNumber.trim(), note.trim());
      await refetchFromDb();
      setIsAddModalOpen(false);
      setLineNumber('');
      setNote('');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إضافة رقم الخط');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLine = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف رقم هذا الخط؟')) {
      try {
        await VendorService.deleteVendorLine(id);
        await refetchFromDb();
      } catch (err: any) {
        alert('فشل حذف الخط: ' + err.message);
      }
    }
  };

  const columns: Column<VendorLine>[] = [
    {
      header: 'رقم الخط / الهاتف',
      accessor: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-950/80 border border-blue-800/60 text-blue-400">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white font-mono text-sm">{row.line_number}</div>
            {row.note && <div className="text-xs text-slate-400 mt-0.5">{row.note}</div>}
          </div>
        </div>
      ),
    },
    {
      header: 'الحالة',
      accessor: (row) => (
        <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs font-bold flex items-center gap-1 w-max">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>نشط ومسجل</span>
        </span>
      ),
    },
    {
      header: 'تاريخ التسجيل',
      accessor: (row) => (
        <span className="text-xs text-slate-400">
          {row.created_at ? new Date(row.created_at).toLocaleDateString('ar-YE') : 'مسبق'}
        </span>
      ),
    },
    {
      header: 'الإجراءات',
      accessor: (row) => (
        <button
          onClick={() => handleDeleteLine(row.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
          title="حذف رقم الخط"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Phone className="w-6 h-6 text-blue-400" />
            <span>إدارة خطوط الإنترنت المباشرة (Vendor Lines)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            سجل متابعة خطوط الإنترنت التابعة لشبكتك للاستعلام وإدارة الاشتراكات والتغذية.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-950/50 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ إضافة رقم خط جديد</span>
        </button>
      </div>

      {/* Lines Table */}
      <DataTable
        data={vendorLines}
        columns={columns}
        title="قائمة الخطوط المسجلة"
        searchPlaceholder="بحث برقم الخط أو اسم صاحب الخط..."
        exportFilename="vendor_lines"
      />

      {/* Add Line Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setErrorMsg(null);
        }}
        title="إضافة رقم خط إنترنت جديد"
      >
        <form onSubmit={handleAddLine} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              رقم خط الإنترنت / الهاتف *
            </label>
            <input
              type="text"
              required
              value={lineNumber}
              onChange={(e) => setLineNumber(e.target.value)}
              placeholder="مثال: 01234567 أو 770000000"
              className="w-full px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              ملاحظة / اسم صاحب الخط (اختياري)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: خط الفرع الرئيسي / منزل علي"
              className="w-full px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
            >
              {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>إضافة الخط</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
