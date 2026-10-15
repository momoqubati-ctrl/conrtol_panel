import React, { useState } from 'react';
import { Settings, Save, ShieldCheck, DollarSign, Globe, PhoneCall } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [platformName, setPlatformName] = useState('منصة شبكتي لكروت الواي فاي');
  const [currency, setCurrency] = useState('YER');
  const [defaultCommission, setDefaultCommission] = useState('5.0');
  const [supportPhone, setSupportPhone] = useState('770000000');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-400" />
            <span>إعدادات النظام والمنصة العامة (Platform Settings)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            التحكم بالإعدادات العامة للمنصة، العملة التلقائية، هاتف الدعم، وشروط الخدمة.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {saved && (
          <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>تم حفظ الإعدادات العامة بنجاح</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>اسم المنصة الرسمي</span>
            </label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span>عملة النظام المعيارية</span>
            </label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>نسبة عمولة المنصة الافتراضية (%)</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={defaultCommission}
              onChange={(e) => setDefaultCommission(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
              <PhoneCall className="w-4 h-4 text-purple-400" />
              <span>هاتف الدعم الفني الرئيسي</span>
            </label>
            <input
              type="text"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>حفظ التغييرات الإدارية</span>
          </button>
        </div>
      </form>
    </div>
  );
};
