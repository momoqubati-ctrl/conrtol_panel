import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, Smartphone, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

interface AdminLoginPageProps {
  onSuccess: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onSuccess }) => {
  const { loginAsAdmin } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      setErrorMsg('يرجى كتابة رقم الهاتف وكلمة المرور الخاصة بالإدارة');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const success = await loginAsAdmin(phone, password);
      if (success) {
        onSuccess();
      } else {
        setErrorMsg('بيانات الدخول غير صحيحة');
      }
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 dir-rtl">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-600/20 rounded-full blur-2xl" />

        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-blue-950/80 border border-blue-800/80 text-blue-400 shadow-md mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">تسجيل دخول بوابة الإدارة (Admin)</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            منطقة عالية الخصوصية والأمان لمشرفي ومديري منصة شبكتي
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold text-center animate-fadeIn">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">رقم هاتف مسؤول النظام:</label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="777856160"
                className="w-full pl-3 pr-10 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-cyan-300 dir-ltr placeholder-slate-600 focus:outline-hidden focus:border-blue-500"
              />
              <Smartphone className="w-5 h-5 text-slate-500 absolute right-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">كلمة المرور المشفرة:</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-600 focus:outline-hidden focus:border-blue-500"
              />
              <Lock className="w-5 h-5 text-slate-500 absolute right-3 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-950/60 cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>جاري الاستعلام من قاعدة البيانات...</span>
              </>
            ) : (
              <>
                <span>الدخول لبوابة التحكم والإدارة</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </form>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-500 text-center">
          مسار الوصول الموحد: <code className="text-slate-400 font-mono text-[10px]">/admin9090sazxxc4/admin/portal/login</code>
        </div>
      </div>
    </div>
  );
};

