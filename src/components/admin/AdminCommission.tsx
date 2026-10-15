import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { DataTable, Column } from '../common/DataTable';
import { AdminService } from '../../services/adminService';
import { Percent, ShieldCheck, Edit3 } from 'lucide-react';
import { Vendor } from '../../types';
import { validateCommissionRate, formatCommissionRate } from '../../lib/commissionUtils';

export const AdminCommission: React.FC = () => {
  const { vendors, refetchFromDb } = useAuth();

  const handleUpdateCommission = async (vendorId: string, currentRate: number) => {
    const input = window.prompt(
      `تعديل نسبة عمولة المنصة للتاجر (%):\n(ملاحظة: إدخال 5 يعني 5%، وإدخال 0.05 يعني 0.05%)`,
      String(currentRate)
    );
    if (input !== null) {
      const validation = validateCommissionRate(input);
      if (validation.valid) {
        if (validation.warning) {
          const proceed = window.confirm(`${validation.warning}\n\nهل تريد المتابعة بحفظ هذه النسبة؟`);
          if (!proceed) return;
        }
        try {
          await AdminService.updateVendorCommission(vendorId, validation.normalizedRate);
          await refetchFromDb();
          alert('تم تحديث نسبة العمولة بنجاح');
        } catch (err: any) {
          alert('فشل تحديث العمولة: ' + err.message);
        }
      } else {
        alert(validation.error || 'نسبة العمولة غير صالحة');
      }
    }
  };

  const columns: Column<Vendor>[] = [
    {
      header: 'التاجر / المتجر',
      accessor: (row) => (
        <div>
          <div className="font-bold text-white text-sm">{row.business_name}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">{row.user_name} ({row.user_phone})</div>
        </div>
      ),
    },
    {
      header: 'نسبة عمولة المنصة (%)',
      accessor: (row) => (
        <span className="px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-800/60 text-amber-300 text-sm font-bold font-mono">
          {formatCommissionRate(row.commission_rate)}
        </span>
      ),
    },
    {
      header: 'صافي نسبة التاجر (%)',
      accessor: (row) => (
        <span className="px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-sm font-bold font-mono">
          {100 - row.commission_rate}%
        </span>
      ),
    },
    {
      header: 'تعديل العمولة',
      accessor: (row) => (
        <button
          onClick={() => handleUpdateCommission(row.id, row.commission_rate)}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Edit3 className="w-4 h-4" />
          <span>تعديل</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border border-amber-900/40 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Percent className="w-6 h-6 text-amber-400" />
            <span>إدارة عمولات المنصة والتجار (Admin Commission Rules)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            النسب المئوية المستقطعة آلياً لصالح المنصة عند كل عملية شراء كرت واي فاي.
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={vendors}
        columns={columns}
        title="قائمة عمولات التجار المعتمدين"
        searchPlaceholder="بحث باسم التاجر..."
        exportFilename="vendor_commissions"
      />
    </div>
  );
};
