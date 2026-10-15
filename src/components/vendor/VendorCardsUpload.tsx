import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Upload, FileSpreadsheet, CheckCircle, Ticket, Lock, Download } from 'lucide-react';

export const VendorCardsUpload: React.FC = () => {
  const { currentVendor, categories, networks, uploadCardsBulk } = useAuth();

  const vendorId = currentVendor?.id || '';
  const vendorNetworks = vendorId ? networks.filter(n => n.vendor_id === vendorId) : [];
  const vendorCategories = vendorNetworks.length ? categories.filter(c => vendorNetworks.some(n => n.id === c.network_id)) : [];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(vendorCategories[0]?.id || '');
  const [rawText, setRawText] = useState<string>('');
  const [fileContent, setFileContent] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId) || vendorCategories[0] || null;

  const handleDownloadExcelTemplate = () => {
    const csvHeader = "رمز_بطاقة_الواي_فاي,ملاحظة\n";
    const blob = new Blob(["\uFEFF" + csvHeader], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `قالب_رفع_كروت_${selectedCategory?.name || 'شبكتي'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteUpload = () => {
    let allCodes: string[] = [];

    if (rawText.trim()) {
      const lines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
      allCodes = [...allCodes, ...lines];
    }

    if (fileContent.length > 0) {
      allCodes = [...allCodes, ...fileContent];
    }

    if (allCodes.length === 0) {
      alert('يرجى اختيار ملف كشوفات الكروت أو إدخال الأكواد يدوياً في المربع النصي');
      return;
    }

    if (!selectedCategoryId || !selectedCategory || !selectedCategory.network_id) {
      alert('لم يتم تحديد فئة صالحة للرفع. يرجى اختيار فئة موجودة من القائمة أولاً.');
      return;
    }

    const count = uploadCardsBulk(selectedCategoryId, selectedCategory.network_id, allCodes);
    setSuccessCount(count);
    setRawText('');
    setFileContent([]);
    setTimeout(() => setSuccessCount(null), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
        setFileContent(lines);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Upload className="w-6 h-6 text-emerald-400" />
          <span>رفع وتشفير كروت الحسابات والكشوفات (Bulk Upload & Encryption)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">تشفير وحفظ بطاقات النت تلقائياً بالمخزون بنفس آلية وتطبيق الموبايل، وتظل مشفرة لا تظهر إلا للمشتري</p>
      </div>

      {successCount !== null && (
        <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-sm font-semibold flex items-center gap-3 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>تم تشفير ورفع {successCount} كرت جديد بنجاح وتحديث كمية المخزون!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
                <label className="text-xs font-semibold text-slate-300 mb-1 block">اختر فئة الكروت المستهدفة:</label>
                {vendorCategories.length === 0 ? (
                  <div className="w-full p-4 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-400">
                    لا توجد فئات متاحة حالياً. يرجى إنشاء فئة جديدة أو التأكد من أن حساب التاجر مرتبط بفئات في قاعدة البيانات.
                  </div>
                ) : (
                  <select
                    value={selectedCategoryId}
                    onChange={e => setSelectedCategoryId(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                  >
                    {vendorCategories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.price.toLocaleString()} YER) - {c.network_name}
                      </option>
                    ))}
                  </select>
                )}
            </div>

            <button
              onClick={handleDownloadExcelTemplate}
              className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm self-end"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>تحميل قالب الإكسل</span>
            </button>
          </div>

          {/* Option A: File Picker */}
          <div className="p-4 rounded-xl bg-slate-950 border-2 border-dashed border-slate-800 hover:border-emerald-500/60 transition-colors text-center">
            <FileSpreadsheet className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <span className="text-xs font-bold text-slate-200 block">اختر ملف Excel / CSV أو TXT يحتوي على الأكواد</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">سجل كود واحد لكل سطر في الملف</span>

            <input
              type="file"
              accept=".csv,.xlsx,.txt"
              onChange={handleFileUpload}
              className="mt-3 text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
            />
            {fileContent.length > 0 && (
              <span className="block mt-2 text-xs text-emerald-400 font-bold font-mono">
                تم قراءة {fileContent.length} كود من الملف
              </span>
            )}
          </div>

          <div className="text-center text-xs text-slate-500 font-bold">— أو إدخال يدوياً —</div>

          {/* Option B: Manual Textarea */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">لصق أكواد البطاقات (كود في كل سطر / كل سطر يعتبر كرت):</label>
            <textarea
              rows={6}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={`YD-9081-1101\nYD-9081-1102\nYD-9081-1103`}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500 dir-ltr"
            />
          </div>

          <button
            onClick={handleExecuteUpload}
            disabled={vendorCategories.length === 0}
            className={`w-full py-3.5 rounded-xl ${vendorCategories.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'} font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all`}
          >
            <Lock className="w-4 h-4 text-emerald-300" />
            <span>{vendorCategories.length === 0 ? 'لا توجد فئات للرفع' : 'رفع وتشفير الكروت'}</span>
          </button>
        </div>

        {/* Security Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 h-fit">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>معايير التشفير والأمان الموحدة</span>
          </h3>

          <ul className="space-y-2.5 text-xs text-slate-400 leading-relaxed">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>نفس خوارزميات وآلية التشفير المعتمدة في تطبيق الموبايل الخاص بالتاجر.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>تُحفظ الأكواد في قاعدة البيانات مشفرة تلقائياً.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>سياسات RLS تحظر قراءة الكود من الكلاينت قبل إتمام عملية الدفع والشراء.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
