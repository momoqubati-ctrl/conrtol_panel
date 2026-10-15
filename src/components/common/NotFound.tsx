import React from 'react';
import { ShieldAlert, Home, ArrowRight } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 rounded-full bg-rose-950/60 border border-rose-800/80 text-rose-400 mb-6 shadow-xl animate-bounce">
        <ShieldAlert className="w-16 h-16" />
      </div>

      <h1 className="text-4xl font-extrabold text-white mb-2">404 - الصفحة غير موجودة</h1>
      <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
        المسار المطلوب غير موجود أو ليس لديك الصلاحيات الكافية للوصول إليه. تم تسجيل هذه المحاولة لأغراض الحماية والأمان.
      </p>

      <a
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer"
      >
        <Home className="w-4 h-4" />
        <span>العودة للصفحة الرئيسية</span>
      </a>
    </div>
  );
};
