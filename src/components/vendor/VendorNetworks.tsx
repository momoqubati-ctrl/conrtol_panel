import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Network, VendorLine, CardCategory } from '../../types';
import { 
  Wifi, Plus, MapPin, Edit3, Trash2, Radio, 
  CheckCircle2, ShieldAlert, Layers, Ticket, Download, 
  Upload, FileSpreadsheet, Lock, Clock, Gauge, CheckCircle 
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { isCardSold, isCardAvailable } from '../../lib/cardStatusUtils';

const YEMEN_GOVERNORATES = [
  'أمانة العاصمة', 'صنعاء', 'عدن', 'تعز', 'الحديدة', 'حضرموت', 'إب',
  'ذمار', 'مأرب', 'شبوة', 'أبين', 'لحج', 'صعدة', 'حجة', 'عمران',
  'المحويت', 'البيضاء', 'الضالع', 'ريمة', 'الجوف', 'سقطرى'
];

export const VendorNetworks: React.FC = () => {
  const { 
    currentVendor, networks, lines, categories, cards, 
    addNetwork, updateNetwork, deleteNetwork, 
    addLine, deleteLine, addCategory, updateCategory, deleteCategory, uploadCardsBulk 
  } = useAuth();
  
  const vendorId = currentVendor?.id || '';
  const vendorNetworks = vendorId ? networks.filter(n => n.vendor_id === vendorId) : [];
  const vendorLines = vendorId ? lines.filter(l => l.vendor_id === vendorId) : [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingNet, setEditingNet] = useState<Network | null>(null);
  const [deleteNetId, setDeleteNetId] = useState<string | null>(null);

  // Manage Categories for a specific network
  const [managingCategoriesNet, setManagingCategoriesNet] = useState<Network | null>(null);

  // Add / Edit Category State
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CardCategory | null>(null);
  const [dataUnit, setDataUnit] = useState<'MB' | 'GB'>('GB');
  const [dataValue, setDataValue] = useState<number>(1);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    price: 300,
    validity_days: 1,
    download_limit_mb: 1024,
    upload_limit_mb: 512,
    speed_limit_kbps: 4096,
  });

  // Upload Cards Modal State
  const [uploadCat, setUploadCat] = useState<CardCategory | null>(null);
  const [uploadRawText, setUploadRawText] = useState('');
  const [uploadFileContent, setUploadFileContent] = useState<string[]>([]);
  const [uploadSuccessCount, setUploadSuccessCount] = useState<number | null>(null);

  // Internet Line Modal State
  const [isAddLineOpen, setIsAddLineOpen] = useState(false);
  const [lineFormData, setLineFormData] = useState({ line_number: '', note: '' });

  // Network Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    governorate: 'أمانة العاصمة',
    district: 'حدة',
    street: 'شارع حدة - بجوار المصباحي',
    ssids: 'Yemen_Digital_5G, Yemen_Digital_Free',
    latitude: 15.3521,
    longitude: 44.2075,
    radius_meters: 500,
    logo_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200&auto=format&fit=crop&q=80',
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      description: '',
      governorate: 'أمانة العاصمة',
      district: '',
      street: '',
      ssids: '',
      latitude: 0,
      longitude: 0,
      radius_meters: 0,
      logo_url: '',
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (net: Network) => {
    setEditingNet(net);
    setFormData({
      name: net.name || '',
      description: net.description || '',
      governorate: net.governorate || 'أمانة العاصمة',
      district: net.district || 'حدة',
      street: net.street || '',
      ssids: net.ssids ? net.ssids.join(', ') : '',
      latitude: net.latitude || 15.3521,
      longitude: net.longitude || 44.2075,
      radius_meters: net.radius_meters || 500,
      logo_url: net.logo_url || 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200&auto=format&fit=crop&q=80',
    });
  };

  const handleSaveNetwork = () => {
    if (!formData.name.trim()) {
      alert('يرجى إدخال اسم الشبكة الرئيسي');
      return;
    }

    const netPayload = {
      vendor_id: vendorId,
      name: formData.name.trim(),
      description: formData.description.trim(),
      governorate: formData.governorate,
      district: formData.district,
      street: formData.street,
      ssids: formData.ssids.split(',').map(s => s.trim()).filter(Boolean),
      latitude: formData.latitude,
      longitude: formData.longitude,
      radius_meters: formData.radius_meters,
      logo_url: formData.logo_url,
    };

    if (editingNet) {
      updateNetwork(editingNet.id, netPayload);
      setEditingNet(null);
    } else {
      addNetwork(netPayload);
      setIsAddOpen(false);
    }
  };

  const handleConfirmDeleteNet = () => {
    if (deleteNetId) {
      deleteNetwork(deleteNetId);
      setDeleteNetId(null);
    }
  };

  const handleSaveLine = () => {
    if (!lineFormData.line_number.trim()) {
      alert('يرجى كتابة رقم خط الإنترنت الأرضي/الفايبر');
      return;
    }
    addLine({
      vendor_id: vendorId,
      line_number: lineFormData.line_number.trim(),
      status: 'active',
    });
    setIsAddLineOpen(false);
    setLineFormData({ line_number: '', note: '' });
  };

  // Open Manage Categories for Network
  const handleOpenManageCategories = (net: Network) => {
    setManagingCategoriesNet(net);
  };

  // Open Add Category for specific network
  const handleOpenAddCategoryForNet = () => {
    setEditingCat(null);
    setDataUnit('GB');
    setDataValue(1);
    setCategoryFormData({
      name: '',
      price: 300,
      validity_days: 1,
      download_limit_mb: 1024,
      upload_limit_mb: 512,
      speed_limit_kbps: 4096,
    });
    setIsAddCategoryOpen(true);
  };

  const handleSaveCategory = () => {
    if (!categoryFormData.name.trim() || !managingCategoriesNet) {
      alert('يرجى كتابة اسم الفئة / الباقة');
      return;
    }

    const calculatedMB = dataUnit === 'GB' ? dataValue * 1024 : dataValue;

    const payload = {
      network_id: managingCategoriesNet.id,
      network_name: managingCategoriesNet.name,
      name: categoryFormData.name.trim(),
      price: categoryFormData.price,
      validity_days: categoryFormData.validity_days,
      download_limit_mb: calculatedMB,
      upload_limit_mb: categoryFormData.upload_limit_mb,
      speed_limit_kbps: categoryFormData.speed_limit_kbps,
    };

    if (editingCat) {
      updateCategory(editingCat.id, payload);
      setEditingCat(null);
    } else {
      addCategory(payload);
      setIsAddCategoryOpen(false);
    }
  };

  // Handle File Upload Parsing
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

  // Download Excel / CSV Template
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

  // Execute Upload and Encrypt
  const handleExecuteUploadAndEncrypt = () => {
    if (!uploadCat) return;

    let allCodes: string[] = [];

    // Parse textarea
    if (uploadRawText.trim()) {
      const manualLines = uploadRawText.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
      allCodes = [...allCodes, ...manualLines];
    }

    // Include file lines
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
            <Wifi className="w-6 h-6 text-purple-400" />
            <span>إدارة شبكات الواي فاي ونقاط التغطية الجغرافية</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تحديد المحافظات والمديريات اليمنية، أسماء الـ SSIDs المعلنة، إدارة الفئات ورفع الأكواد بالمخزون
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-950/50 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة شبكة جديدة</span>
        </button>
      </div>

      {/* Networks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vendorNetworks.map(net => {
          const netCategories = categories.filter(c => c.network_id === net.id);
          
          return (
            <div key={net.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {net.logo_url && (
                      <img src={net.logo_url} alt={net.name} className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-sm" />
                    )}
                    <div>
                      <h3 className="font-bold text-white text-base">{net.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{net.description || 'تغطية واسعة النطاق'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(net)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                      title="تعديل الشبكة"
                    >
                      <Edit3 className="w-4 h-4 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => setDeleteNetId(net.id)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 border border-slate-700 cursor-pointer"
                      title="أرشفة / حذف الشبكة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Location & SSIDs */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>
                      {net.governorate || 'صنعاء'} - {net.district || 'حدة'} {net.street ? `(${net.street})` : ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {net.ssids?.map((ssid, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono text-xs">
                        {ssid}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span className="text-slate-400 font-mono">الفئات التابعة: <strong className="text-amber-400">{netCategories.length} فئة</strong></span>
                  <span className="font-bold text-emerald-400 font-mono">{net.sales_count || 0} عملية شراء</span>
                </div>
              </div>

              {/* Manage Categories Action Button */}
              <button
                onClick={() => handleOpenManageCategories(net)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer transition-all mt-2"
              >
                <Layers className="w-4 h-4" />
                <span>إدارة الفئات والكروت ({netCategories.length})</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Manage Network Categories Modal / Window */}
      <Modal
        isOpen={!!managingCategoriesNet}
        onClose={() => setManagingCategoriesNet(null)}
        title={`إدارة فئات وباقات شبكة: ${managingCategoriesNet?.name}`}
      >
        <div className="space-y-5 text-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block">فئات وباقات الإنترنت النشطة لـ</span>
              <span className="text-sm font-bold text-purple-300">{managingCategoriesNet?.name}</span>
            </div>

            <button
              onClick={handleOpenAddCategoryForNet}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة فئة جديدة لهذه الشبكة</span>
            </button>
          </div>

          {/* Categories Grid inside Modal */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {categories.filter(c => c.network_id === managingCategoriesNet?.id).length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
                <Ticket className="w-10 h-10 text-amber-500/60 mx-auto" />
                <p className="font-semibold text-xs">لا توجد فئات مضافة لهذه الشبكة حتى الآن.</p>
                <button
                  onClick={handleOpenAddCategoryForNet}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold cursor-pointer"
                >
                  اضغط هنا لإضافة أول فئة
                </button>
              </div>
            ) : (
              categories.filter(c => c.network_id === managingCategoriesNet?.id).map(cat => {
                const mb = cat.download_limit_mb || 1024;
                const displayData = mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB` : `${mb} MB`;

                // Statistics
                const catCards = cards.filter(c => c.category_id === cat.id);
                const soldCount = catCards.filter(isCardSold).length;
                const remainingCount = catCards.filter(isCardAvailable).length || (cat.available_cards_count || 0);
                const totalUploaded = soldCount + remainingCount;

                return (
                  <div key={cat.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 hover:border-slate-700 transition-all">
                    <div className="flex items-start justify-between border-b border-slate-800 pb-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">{cat.name}</h4>
                        <span className="text-[11px] text-slate-400">صلاحية {cat.validity_days} يوم | سعة {displayData}</span>
                      </div>
                      <div className="font-bold text-amber-400 font-mono text-base dir-ltr">
                        {cat.price.toLocaleString()} YER
                      </div>
                    </div>

                    {/* Detailed Statistics Grid: Total Uploaded | Sold | Remaining */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">إجمالي المرفوع:</span>
                        <span className="font-bold text-cyan-300 font-mono text-xs">{totalUploaded} كرت</span>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">المباع:</span>
                        <span className="font-bold text-purple-400 font-mono text-xs">{soldCount} كرت</span>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">المتبقي:</span>
                        <span className="font-bold text-emerald-400 font-mono text-xs">{remainingCount} كرت</span>
                      </div>
                    </div>

                    {/* Category Action: Upload Cards */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCat(cat);
                            setCategoryFormData({
                              name: cat.name,
                              price: cat.price,
                              validity_days: cat.validity_days,
                              download_limit_mb: cat.download_limit_mb || 1024,
                              upload_limit_mb: cat.upload_limit_mb || 512,
                              speed_limit_kbps: cat.speed_limit_kbps || 4096,
                            });
                            setIsAddCategoryOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:text-white text-cyan-400 border border-slate-800 text-[11px] font-semibold cursor-pointer"
                        >
                          تعديل الفئة
                        </button>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:text-rose-400 text-slate-400 border border-slate-800 text-[11px] font-semibold cursor-pointer"
                        >
                          حذف
                        </button>
                      </div>

                      <button
                        onClick={() => setUploadCat(cat)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-950/40 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>رفع كروت لهذه الفئة</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        title={editingCat ? "تعديل فئة الكروت" : `إضافة فئة جديدة لشبكة ${managingCategoriesNet?.name}`}
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">اسم الفئة / الباقة:</label>
              <input
                type="text"
                placeholder="مثال: باقة 1000 ريال 3 جيجا"
                value={categoryFormData.name}
                onChange={e => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">السعر للجمهور (YER):</label>
              <input
                type="number"
                step="50"
                value={categoryFormData.price}
                onChange={e => setCategoryFormData({ ...categoryFormData, price: parseInt(e.target.value) || 0 })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-400 font-bold font-mono focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">الصلاحية (بالأيام):</label>
              <input
                type="number"
                value={categoryFormData.validity_days}
                onChange={e => setCategoryFormData({ ...categoryFormData, validity_days: parseInt(e.target.value) || 1 })}
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
              onClick={() => setIsAddCategoryOpen(false)}
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

      {/* Internet Lines Tracker Section */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>خطوط الإنترنت المزودة للشبكات (Vendor Internet Lines)</span>
          </h3>

          <button
            onClick={() => setIsAddLineOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة خط جديد</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {vendorLines.map(line => (
            <div key={line.id} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">رقم الخط الأرضي/الفايبر:</span>
                <span className="text-white font-mono font-bold text-sm">{line.line_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold text-[10px]">نشط</span>
                <button
                  onClick={() => deleteLine(line.id)}
                  className="p-1 hover:text-rose-400 text-slate-500 cursor-pointer"
                  title="حذف الخط"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Network Modal */}
      <Modal
        isOpen={isAddOpen || !!editingNet}
        onClose={() => { setIsAddOpen(false); setEditingNet(null); }}
        title={editingNet ? "تعديل بيانات شبكة الواي فاي" : "إضافة شبكة واي فاي جديدة"}
      >
        <div className="space-y-4 text-sm">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">اسم الشبكة الرئيسي:</label>
            <input
              type="text"
              placeholder="مثال: شبكة اليمن الرقمية - فرع حدة"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">المحافظة:</label>
              <select
                value={formData.governorate}
                onChange={e => setFormData({ ...formData, governorate: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-purple-500 cursor-pointer"
              >
                {YEMEN_GOVERNORATES.map(gov => (
                  <option key={gov} value={gov}>{gov}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">المديرية / الحي:</label>
              <input
                type="text"
                placeholder="مثال: حدة / خورمكسر / المعلا"
                value={formData.district}
                onChange={e => setFormData({ ...formData, district: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">الشارع أو المعلم المباشر:</label>
            <input
              type="text"
              placeholder="مثال: شارع حدة الرئيسي بجوار جولة المصباحي"
              value={formData.street}
              onChange={e => setFormData({ ...formData, street: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">أسماء الـ SSIDs (مفصولة بفواصل):</label>
            <input
              type="text"
              placeholder="Yemen_Digital_5G, Yemen_Digital_Free"
              value={formData.ssids}
              onChange={e => setFormData({ ...formData, ssids: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-purple-300 font-mono focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">وصف نطاق التغطية والخدمات:</label>
            <textarea
              rows={2}
              placeholder="وصف التغطية والأماكن القريبة..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">نطاق التغطية (قطر بالمتر):</label>
              <input
                type="number"
                value={formData.radius_meters}
                onChange={e => setFormData({ ...formData, radius_meters: parseInt(e.target.value) || 500 })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-hidden focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">رابط الشعار (Logo Image):</label>
              <input
                type="text"
                value={formData.logo_url}
                onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 font-mono focus:outline-hidden focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => { setIsAddOpen(false); setEditingNet(null); }}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleSaveNetwork}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-purple-950/50"
            >
              {editingNet ? 'تحديث بيانات الشبكة' : 'حفظ الشبكة'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Internet Line Modal */}
      <Modal
        isOpen={isAddLineOpen}
        onClose={() => setIsAddLineOpen(false)}
        title="إضافة رقم خط إنترنت جديد (Vendor Line)"
      >
        <div className="space-y-4 text-sm">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">رقم الخط الأرضي/الفايبر:</label>
            <input
              type="text"
              placeholder="مثال: 014001122"
              value={lineFormData.line_number}
              onChange={e => setLineFormData({ ...lineFormData, line_number: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">ملاحظة أو اسم المشترك بالخط:</label>
            <input
              type="text"
              placeholder="اسم صاحب الخط (اختياري)"
              value={lineFormData.note}
              onChange={e => setLineFormData({ ...lineFormData, note: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsAddLineOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleSaveLine}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              حفظ الخط
            </button>
          </div>
        </div>
      </Modal>

      {/* Archive / Delete Network Confirmation Modal */}
      <Modal
        isOpen={!!deleteNetId}
        onClose={() => setDeleteNetId(null)}
        title="تأكيد أرشفة / حذف الشبكة"
      >
        <div className="space-y-4 text-sm text-center">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <p className="text-slate-200">
            هل أنت أصل من أرشفة أو حذف هذه الشبكة؟ سيتم إخفاؤها من قواميس العروض للمستفيدين مع حفظ سجلاتها المالية.
          </p>

          <div className="flex justify-center gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setDeleteNetId(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirmDeleteNet}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-rose-950/50"
            >
              تأكيد الحذف
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

