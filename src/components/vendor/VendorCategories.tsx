import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CardCategory } from '../../types';
import { Ticket, Plus, Clock, Gauge, Edit3, Trash2, ShieldAlert, Upload, Download, FileSpreadsheet, Lock, CheckCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { isCardSold, isCardAvailable } from '../../lib/cardStatusUtils';

export const VendorCategories: React.FC = () => {
  const { currentVendor, categories, networks, cards, addCategory, updateCategory, deleteCategory, uploadCardsBulk } = useAuth();

  const vendorId = currentVendor?.id || '';
  const vendorNetworks = vendorId ? networks.filter(n => n.vendor_id === vendorId) : [];
  const vendorCategories = vendorNetworks.length ? categories.filter(c => vendorNetworks.some(n => n.id === c.network_id)) : [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CardCategory | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);

  // Upload Cards Modal
  const [uploadCat, setUploadCat] = useState<CardCategory | null>(null);
  const [uploadRawText, setUploadRawText] = useState('');
  const [uploadFileContent, setUploadFileContent] = useState<string[]>([]);
  const [uploadSuccessCount, setUploadSuccessCount] = useState<number | null>(null);

  const [dataUnit, setDataUnit] = useState<'MB' | 'GB'>('GB');
  const [dataValue, setDataValue] = useState<number>(1);

  const [formData, setFormData] = useState({
    network_id: vendorNetworks[0]?.id || '',
    name: '',
    price: 0,
    validity_days: 1,
    download_limit_mb: 0,
    upload_limit_mb: 0,
    speed_limit_kbps: 0,
  });

  const handleOpenAdd = () => {
    setEditingCat(null);
    setDataUnit('GB');
    setDataValue(1);
    setFormData({
      network_id: vendorNetworks[0]?.id || '',
      name: '',
      price: 0,
      validity_days: 1,
      download_limit_mb: 0,
      upload_limit_mb: 0,
      speed_limit_kbps: 0,
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (cat: CardCategory) => {
    setEditingCat(cat);
    const mb = cat.download_limit_mb || 1024;
    if (mb >= 1024 && mb % 1024 === 0) {
      setDataUnit('GB');
      setDataValue(mb / 1024);
    } else {
      setDataUnit('MB');
      setDataValue(mb);
    }

    setFormData({
      network_id: cat.network_id,
      name: cat.name,
      price: cat.price,
      validity_days: cat.validity_days,
      download_limit_mb: mb,
      upload_limit_mb: cat.upload_limit_mb || 512,
      speed_limit_kbps: cat.speed_limit_kbps || 4096,
    });
  };

  const handleSaveCategory = () => {
    if (!formData.name.trim()) {
      alert('يرجى كتابة اسم الفئة / الباقة');
      return;
    }

    const calculatedMB = dataUnit === 'GB' ? dataValue * 1024 : dataValue;
    const net = networks.find(n => n.id === formData.network_id);

    const payload = {
      network_id: formData.network_id,
      network_name: net?.name || 'شبكة الواي فاي',
      name: formData.name.trim(),
      price: formData.price,
      validity_days: formData.validity_days,
      download_limit_mb: calculatedMB,
      upload_limit_mb: formData.upload_limit_mb,
      speed_limit_kbps: formData.speed_limit_kbps,
    };

    if (editingCat) {
      updateCategory(editingCat.id, payload);
      setEditingCat(null);
    } else {
      addCategory(payload);
      setIsAddOpen(false);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteCatId) {
      deleteCategory(deleteCatId);
      setDeleteCatId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
        setUploadFileContent(lines);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadExcelTemplate = (catName?: string) => {
    const csvHeader = "رمز_بطاقة_الواي_فاي,ملاحظة\nYD-8890-1001,بطاقة 1000 ريال\nYD-8890-1002,بطاقة 1000 ريال\nYD-8890-1003,بطاقة 1000 ريال\n";
    const blob = new Blob(["\uFEFF" + csvHeader], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `قالب_رفع_كروت_${catName || 'شبكتي'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteUploadAndEncrypt = () => {
    if (!uploadCat) return;

    let allCodes: string[] = [];
    if (uploadRawText.trim()) {
      const manualLines = uploadRawText.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
      allCodes = [...allCodes, ...manualLines];
    }
    if (uploadFileContent.length > 0) {
      allCodes = [...allCodes, ...uploadFileContent];
    }

    if (allCodes.length === 0) {
      alert('يرجى اختيار ملف كشوفات الكروت أو إدخال الأكواد يدوياً في المربع النصي');
      return;
    }

    const count = uploadCardsBulk(uploadCat.id, uploadCat.network_id, allCodes);
    setUploadSuccessCount(count);
    setUploadRawText('');
    setUploadFileContent([]);

    setTimeout(() => {
      setUploadSuccessCount(null);
      setUploadCat(null);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Ticket className="w-6 h-6 text-amber-400" />
            <span>إدارة فئات وباقات كروت الواي فاي (Card Categories)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">تحديد أسعار الكروت، مدة الصلاحية، أحجام التحميل (GB/MB)، ورفع الأكواد المشفرة للمخزون</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/50 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة فئة جديدة</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendorCategories.map(cat => {
          const mb = cat.download_limit_mb || 1024;
          const displayData = mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB` : `${mb} MB`;

          // Statistics
          const catCards = cards.filter(c => c.category_id === cat.id);
          const soldCount = catCards.filter(isCardSold).length;
          const remainingCount = catCards.filter(isCardAvailable).length || (cat.available_cards_count || 0);
          const totalUploaded = soldCount + remainingCount;

          return (
            <div key={cat.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">{cat.name}</h3>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{cat.network_name}</span>
                  </div>

                  <div className="text-left font-bold text-amber-400 font-mono text-lg dir-ltr">
                    {cat.price.toLocaleString()} YER
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 text-[10px] block">الصلاحية:</span>
                      <span className="font-semibold text-white">{cat.validity_days} {cat.validity_days === 1 ? 'يوم' : 'أيام'}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 text-[10px] block">حجم التحميل:</span>
                      <span className="font-semibold text-white font-mono">{displayData}</span>
                    </div>
                  </div>
                </div>

                {/* Statistics Grid: Total Uploaded | Sold | Remaining */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">إجمالي المرفوع:</span>
                    <span className="font-bold text-cyan-300 font-mono text-xs">{totalUploaded} كرت</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">المباع:</span>
                    <span className="font-bold text-purple-400 font-mono text-xs">{soldCount} كرت</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">المتبقي:</span>
                    <span className="font-bold text-emerald-400 font-mono text-xs">{remainingCount} كرت</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80 mt-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:text-white text-cyan-400 border border-slate-700 cursor-pointer"
                    title="تعديل الفئة"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteCatId(cat.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:text-rose-400 text-slate-400 border border-slate-700 cursor-pointer"
                    title="حذف الفئة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setUploadCat(cat)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>رفع كروت</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload and Encrypt Cards Modal */}
      <Modal
        isOpen={!!uploadCat}
        onClose={() => setUploadCat(null)}
        title={`رفع وتشفير الكروت - فئة: ${uploadCat?.name}`}
      >
        <div className="space-y-4 text-sm">
          {uploadSuccessCount !== null && (
            <div className="p-3.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>تم تشفير ورفع {uploadSuccessCount} كرت جديد بنجاح إلى قاعدة البيانات وتحديث المخزون!</span>
            </div>
          )}

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block">الفئة المستهدفة:</span>
              <span className="text-white font-bold">{uploadCat?.name} ({uploadCat?.network_name})</span>
            </div>
            <div className="text-left font-mono font-bold text-amber-400">
              {uploadCat?.price.toLocaleString()} YER
            </div>
          </div>

          {/* Download Template Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-300">
              <span className="font-bold text-white block">تحميل قالب إكسل / CSV:</span>
              <span className="text-[11px] text-slate-400">تحميل القالب المعتمد الموحد لتجهيز كشوفات البطاقات.</span>
            </div>

            <button
              type="button"
              onClick={() => handleDownloadExcelTemplate(uploadCat?.name)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>تحميل قالب الإكسل</span>
            </button>
          </div>

          {/* Option A: File Picker */}
          <div className="p-4 rounded-xl bg-slate-950 border-2 border-dashed border-slate-800 hover:border-emerald-500/60 transition-colors text-center">
            <FileSpreadsheet className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
            <span className="text-xs font-bold text-slate-200 block">اختيار ملف CSV / Excel أو TXT</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">يتم قراءة وسحب جميع الأكواد تلقائياً</span>

            <input
              type="file"
              accept=".csv,.xlsx,.txt"
              onChange={handleFileUpload}
              className="mt-3 text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
            />
            {uploadFileContent.length > 0 && (
              <span className="block mt-2 text-xs text-emerald-400 font-bold font-mono">
                تم قراءة {uploadFileContent.length} كود من الملف
              </span>
            )}
          </div>

          <div className="text-center text-xs text-slate-500 font-bold">— أو الإدخال اليدوي للأكواد —</div>

          {/* Option B: Manual Textarea */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">لصق أكواد البطاقات (كل سطر يعتبر كرت):</label>
            <textarea
              rows={4}
              value={uploadRawText}
              onChange={e => setUploadRawText(e.target.value)}
              placeholder={`YD-9081-1101\nYD-9081-1102\nYD-9081-1103`}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500 dir-ltr"
            />
          </div>

          {/* Security Banner */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>تتم عملية الرفع والتشفير عبر حزم معالجة موحدة مع تطبيق الموبايل لضمان عدم كشف الأكواد إلا للمشتري.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setUploadCat(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleExecuteUploadAndEncrypt}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              <Lock className="w-4 h-4 text-emerald-200" />
              <span>رفع وتشفير الكروت</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isAddOpen || !!editingCat}
        onClose={() => { setIsAddOpen(false); setEditingCat(null); }}
        title={editingCat ? "تعديل فئة الكروت" : "إنشاء فئة كروت جديدة"}
      >
        <div className="space-y-4 text-sm">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">الشبكة التابعة لها:</label>
            <select
              value={formData.network_id}
              onChange={e => setFormData({ ...formData, network_id: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              {vendorNetworks.map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">اسم الفئة / الباقة:</label>
              <input
                type="text"
                placeholder="مثال: باقة اليوم 2 جيجا"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">السعر للجمهور (YER):</label>
              <input
                type="number"
                step="50"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-400 font-bold font-mono focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">الصلاحية (بالأيام):</label>
              <input
                type="number"
                value={formData.validity_days}
                onChange={e => setFormData({ ...formData, validity_days: parseInt(e.target.value) || 1 })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">حجم التحميل المسموح:</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={dataValue}
                  onChange={e => setDataValue(parseFloat(e.target.value) || 1)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-hidden focus:border-amber-500"
                />
                <select
                  value={dataUnit}
                  onChange={e => setDataUnit(e.target.value as 'MB' | 'GB')}
                  className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-400 font-bold cursor-pointer"
                >
                  <option value="GB">GB</option>
                  <option value="MB">MB</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => { setIsAddOpen(false); setEditingCat(null); }}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleSaveCategory}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-amber-950/50"
            >
              {editingCat ? 'تحديث الفئة' : 'حفظ الفئة'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Category Confirmation Modal */}
      <Modal
        isOpen={!!deleteCatId}
        onClose={() => setDeleteCatId(null)}
        title="تأكيد حذف فئة الكروت"
      >
        <div className="space-y-4 text-sm text-center">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <p className="text-slate-200">
            هل أنت أصل من حذف هذه الفئة؟ سيتم إزالتها من العروض المتاحة.
          </p>

          <div className="flex justify-center gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setDeleteCatId(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-rose-950/50"
            >
              حذف
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
