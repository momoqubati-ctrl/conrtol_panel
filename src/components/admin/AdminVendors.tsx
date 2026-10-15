import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';
import { Store, CheckCircle2, XCircle, Search, Edit3, ShieldAlert, Percent, AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { AdminService } from '../../services/adminService';
import { 
  validateCommissionRate, 
  calculateCommissionBreakdown, 
  formatCommissionRate 
} from '../../lib/commissionUtils';

export const AdminVendors: React.FC = () => {
  const { vendors, approveVendor, rejectVendor, updateVendorCommission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [newCommissionRate, setNewCommissionRate] = useState<number>(5.0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filtered = vendors.filter(v => 
    v.business_name.includes(searchTerm) || 
    (v.user_name || '').includes(searchTerm) || 
    (v.user_phone || '').includes(searchTerm)
  );

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  const handleOpenEditModal = (vendor: any) => {
    setSelectedVendorId(vendor.id);
    setNewCommissionRate(Number(vendor.commission_rate) || 0);
    setValidationError(null);
  };

  const handleSaveCommission = async () => {
    if (!selectedVendorId) return;

    const validation = validateCommissionRate(newCommissionRate);
    if (!validation.valid) {
      setValidationError(validation.error || 'نسبة العمولة غير صالحة');
      return;
    }

    setIsSaving(true);
    setValidationError(null);
    try {
      await AdminService.updateVendorCommission(selectedVendorId, validation.normalizedRate);
      updateVendorCommission(selectedVendorId, validation.normalizedRate);
      setSelectedVendorId(null);
    } catch (err: any) {
      setValidationError(err?.message || 'فشل حفظ نسبة العمولة في قاعدة البيانات');
    } finally {
      setIsSaving(false);
    }
  };

  const validation = validateCommissionRate(newCommissionRate);
  const sampleBreakdown100 = calculateCommissionBreakdown(100, validation.normalizedRate);
  const sampleBreakdown1000 = calculateCommissionBreakdown(1000, validation.normalizedRate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Store className="w-6 h-6 text-amber-400" />
            <span>إدارة أصحاب الشبكات والتجار (Vendors)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">اعتماد المنشآت التجارية، مراجعة السجلات، وتعديل نسب العمولات المستقطعة</p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="بحث بجهة المنشأة، الهاتف، أو السجل..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-bold text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-4">المنشأة التجاريّة</th>
                <th className="p-4">صاحب الحساب / الهاتف</th>
                <th className="p-4">السجل التجاري</th>
                <th className="p-4">نسبة عمولة المنصة</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">الإجراءات والاعتماد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(vendor => (
                <tr key={vendor.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white text-base">{vendor.business_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">ID: {vendor.id}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-200">{vendor.user_name || 'مالك الشبكة'}</div>
                    <div className="text-xs text-slate-400 font-mono dir-ltr">{vendor.user_phone}</div>
                  </td>
                  <td className="p-4 font-mono text-xs text-cyan-300">{vendor.commercial_registry || 'لا يوجد سجل'}</td>
                  <td className="p-4">
                    <div className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/60 text-xs font-mono">
                      <Percent className="w-3.5 h-3.5" />
                      <span>{formatCommissionRate(vendor.commission_rate)}</span>
                    </div>
                  </td>
                  <td className="p-4"><StatusBadge status={vendor.status} /></td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {vendor.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveVendor(vendor.id)}
                            className="p-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 transition-colors cursor-pointer"
                            title="اعتماد التاجر"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => rejectVendor(vendor.id)}
                            className="p-1.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 transition-colors cursor-pointer"
                            title="رفض طلب الانضمام"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleOpenEditModal(vendor)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل العمولة</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Commission Modal */}
      {selectedVendor && (
        <Modal
          isOpen={!!selectedVendor}
          onClose={() => setSelectedVendorId(null)}
          title={`تعديل نسبة عمولة المنصة - ${selectedVendor.business_name}`}
        >
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-amber-200/90 leading-relaxed">
              <span className="font-bold block mb-1">قاعدة إدخال العمولة:</span>
              القيمة المدخلة تمثل نسبة مئوية مباشرة (%). مثال: إدخال <strong className="text-white">5</strong> يعني <strong className="text-white">5%</strong>، وإدخال <strong className="text-white">0</strong> يعني <strong className="text-white">0%</strong>، وإدخال <strong className="text-white">0.05</strong> يعني <strong className="text-white">0.05%</strong> (خمسة بالمئة من المئة).
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">نسبة العمولة المقتطعة (%):</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="50"
                value={newCommissionRate}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  setNewCommissionRate(isNaN(val) ? 0 : val);
                  setValidationError(null);
                }}
                className={`w-full p-3 bg-slate-950 border rounded-xl text-base text-amber-400 font-bold font-mono focus:outline-hidden ${
                  validationError ? 'border-rose-500' : 'border-slate-700 focus:border-amber-500'
                }`}
              />
            </div>

            {/* Validation Error Message */}
            {validationError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Warning when fractional rate entered */}
            {validation.warning && (
              <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800 text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{validation.warning}</span>
              </div>
            )}

            {/* Live Calculation Previews */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-slate-200">معاينة الاحتساب الفعلي:</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-700">
                <div className="space-y-1">
                  <div className="text-slate-400 font-semibold">لكرت بسعر 100 YER:</div>
                  <div>• عمولة المنصة: <span className="text-amber-400 font-bold font-mono">{sampleBreakdown100.commissionAmount} YER</span></div>
                  <div>• صافي التاجر: <span className="text-emerald-400 font-bold font-mono">{sampleBreakdown100.vendorNetAmount} YER</span></div>
                </div>
                <div className="space-y-1">
                  <div className="text-slate-400 font-semibold">لكرت بسعر 1,000 YER:</div>
                  <div>• عمولة المنصة: <span className="text-amber-400 font-bold font-mono">{sampleBreakdown1000.commissionAmount} YER</span></div>
                  <div>• صافي التاجر: <span className="text-emerald-400 font-bold font-mono">{sampleBreakdown1000.vendorNetAmount} YER</span></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedVendorId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                disabled={isSaving}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveCommission}
                disabled={isSaving || !validation.valid}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs cursor-pointer shadow-lg shadow-amber-900/40"
              >
                {isSaving ? 'جارٍ الحفظ...' : 'حفظ التحديث'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
