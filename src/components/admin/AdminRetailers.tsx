import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../lib/supabase';
import { Retailer, RetailerStatus, StoreType } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { 
  Store, 
  CheckCircle2, 
  XCircle, 
  Search, 
  AlertTriangle, 
  Clock, 
  Phone, 
  MapPin, 
  FileText,
  ShieldCheck,
  RefreshCw,
  Eye
} from 'lucide-react';

export const AdminRetailers: React.FC = () => {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRetailers = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching retailers:', error);
      } else if (data) {
        setRetailers(data as Retailer[]);
      }
    } catch (err) {
      console.error('Failed to load retailers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetailers();
  }, []);

  const handleAction = async (retailerId: string, action: string, reason?: string) => {
    setProcessingId(retailerId);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('admin_verify_retailer', {
        p_retailer_id: retailerId,
        p_action: action,
        p_reason: reason || null,
      });

      if (error) {
        alert(`فشل تنفيذ الإجراء: ${error.message}`);
      } else {
        await fetchRetailers();
        if (selectedRetailer?.id === retailerId) {
          setSelectedRetailer(null);
        }
        setShowRejectModal(false);
        setRejectionReason('');
      }
    } catch (err) {
      alert(`حدث خطأ غير متوقع: ${err}`);
    } finally {
      setProcessingId(null);
    }
  };

  const getStoreTypeLabel = (type: StoreType) => {
    const map: Record<StoreType, string> = {
      grocery: 'بقالة',
      supermarket: 'سوبر ماركت',
      commercial_center: 'مركز تجاري',
      telecom_shop: 'محل اتصالات',
      kiosk: 'كشك',
      pos_outlet: 'نقطة بيع',
      other: 'نشاط تجاري',
    };
    return map[type] || type;
  };

  const filtered = retailers.filter(r => {
    const matchesSearch = 
      r.store_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.retailer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.contact_phone.includes(searchTerm) ||
      (r.city && r.city.includes(searchTerm)) ||
      (r.zone && r.zone.includes(searchTerm));

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Store className="w-6 h-6 text-emerald-400" />
            <span>إدارة تجار التجزئة والبقالات (Retailers)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            اعتماد نقاط البيع والبقالات، التحقق من الوثائق، وتأهيلهم للشراء بالجملة
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <input
              type="text"
              placeholder="بحث بالكود، اسم المحل، أو الهاتف..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>

          <button
            onClick={fetchRetailers}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
        {[
          { id: 'all', label: 'كافة التجار' },
          { id: 'pending_verification', label: 'قيد المراجعة' },
          { id: 'active', label: 'المعتمدون (نشط)' },
          { id: 'suspended', label: 'المعلقون' },
          { id: 'rejected', label: 'المرفوضون' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === tab.id
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Retailers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-bold text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-4">كود التاجر / المنشأة</th>
                <th className="p-4">نوع النشاط</th>
                <th className="p-4">الموقع الجغرافي</th>
                <th className="p-4">أرقام التواصل</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    جاري تحميل بيانات تجار التجزئة...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    لا يوجد تجار تجزئة مسجلين يطابقون خيارات البحث
                  </td>
                </tr>
              ) : (
                filtered.map(retailer => (
                  <tr key={retailer.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white text-base">{retailer.store_name}</div>
                      <div className="text-xs font-mono text-emerald-400 font-semibold mt-0.5">
                        {retailer.retailer_code}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-md text-xs">
                        {getStoreTypeLabel(retailer.store_type)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{retailer.city} - {retailer.zone}</span>
                      </div>
                      {retailer.exact_address && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                          {retailer.exact_address}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-200 font-mono dir-ltr justify-end">
                        <span>{retailer.contact_phone}</span>
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </div>
                      {retailer.whatsapp_phone && retailer.whatsapp_phone !== retailer.contact_phone && (
                        <div className="text-[11px] text-emerald-400 font-mono dir-ltr text-right mt-0.5">
                          واتساب: {retailer.whatsapp_phone}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {retailer.status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 rounded-lg text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          معتمد ونشط
                        </span>
                      )}
                      {retailer.status === 'pending_verification' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-950/60 text-amber-400 border border-amber-800/60 rounded-lg text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          قيد المراجعة
                        </span>
                      )}
                      {retailer.status === 'suspended' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-950/60 text-blue-400 border border-blue-800/60 rounded-lg text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          معلق مؤقتاً
                        </span>
                      )}
                      {retailer.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-950/60 text-red-400 border border-red-800/60 rounded-lg text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          مرفوض
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedRetailer(retailer)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {retailer.status === 'pending_verification' && (
                          <>
                            <button
                              disabled={processingId === retailer.id}
                              onClick={() => handleAction(retailer.id, 'APPROVE')}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              اعتماد
                            </button>
                            <button
                              disabled={processingId === retailer.id}
                              onClick={() => {
                                setSelectedRetailer(retailer);
                                setShowRejectModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              رفض
                            </button>
                          </>
                        )}

                        {retailer.status === 'active' && (
                          <button
                            disabled={processingId === retailer.id}
                            onClick={() => handleAction(retailer.id, 'SUSPEND', 'إيقاف مؤقت من الإدارة')}
                            className="px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-300 border border-amber-700/60 rounded-lg text-xs transition-colors"
                          >
                            تعليق
                          </button>
                        )}

                        {retailer.status === 'suspended' && (
                          <button
                            disabled={processingId === retailer.id}
                            onClick={() => handleAction(retailer.id, 'ACTIVATE')}
                            className="px-2.5 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/60 rounded-lg text-xs transition-colors"
                          >
                            إعادة تفعيل
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedRetailer && !showRejectModal && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRetailer(null)}
          title={`تفاصيل متجر: ${selectedRetailer.store_name}`}
        >
          <div className="space-y-4 text-slate-300 text-sm">
            <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 text-xs block">كود التاجر الفريد</span>
                <span className="font-mono text-emerald-400 font-bold text-base">{selectedRetailer.retailer_code}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">نوع النشاط</span>
                <span className="font-semibold text-white">{getStoreTypeLabel(selectedRetailer.store_type)}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">المدينة والحي</span>
                <span>{selectedRetailer.city} - {selectedRetailer.zone}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">رقم السجل التجاري</span>
                <span className="font-mono">{selectedRetailer.commercial_registry || 'غير متوفر'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">هاتف التواصل</span>
                <span className="font-mono">{selectedRetailer.contact_phone}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">هاتف الواتساب</span>
                <span className="font-mono">{selectedRetailer.whatsapp_phone || 'غير متوفر'}</span>
              </div>
            </div>

            {selectedRetailer.exact_address && (
              <div>
                <span className="text-slate-500 text-xs block mb-1">العنوان التفصيلي</span>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                  {selectedRetailer.exact_address}
                </div>
              </div>
            )}

            {selectedRetailer.rejection_reason && (
              <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-lg text-xs text-red-300">
                <span className="font-bold block mb-0.5">سبب الرفض السابق:</span>
                {selectedRetailer.rejection_reason}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedRetailer(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                إغلاق
              </button>
              {selectedRetailer.status === 'pending_verification' && (
                <button
                  onClick={() => handleAction(selectedRetailer.id, 'APPROVE')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  اعتماد وتفعيل المتجر
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && selectedRetailer && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowRejectModal(false);
            setRejectionReason('');
          }}
          title="رفض طلب انضمام تاجر التجزئة"
        >
          <div className="space-y-4 text-sm">
            <p className="text-slate-300">
              يرجى إدخال سبب رفض طلب المتجر <span className="font-bold text-white">({selectedRetailer.store_name})</span> ليتم توثيقه وإبلاغ التاجر به:
            </p>

            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="سبب الرفض (مثال: نقص في وثائق النشاط أو العنوان غير دقيق)..."
              rows={3}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-red-500"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                disabled={!rejectionReason.trim() || processingId === selectedRetailer.id}
                onClick={() => handleAction(selectedRetailer.id, 'REJECT', rejectionReason)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                تأكيد الرفض
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
