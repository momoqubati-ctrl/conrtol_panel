import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Store, LogOut, Search, UserCheck, Smartphone } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';

interface HeaderProps {
  portalTitle: string;
  portalType: 'admin' | 'vendor';
}

export const Header: React.FC<HeaderProps> = ({ portalTitle, portalType }) => {
  const { currentUser, currentVendor, logout } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand & Portal Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-700 px-3 py-1.5 rounded-xl text-white font-bold text-lg shadow-sm">
            <Smartphone className="w-5 h-5" />
            <span>منصة شبكتي</span>
          </div>

          <span className="hidden sm:inline-block h-5 w-px bg-slate-700" />

          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700 text-xs sm:text-sm font-medium">
            {portalType === 'admin' ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">{portalTitle}</span>
              </>
            ) : (
              <>
                <Store className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 font-semibold">{portalTitle}</span>
              </>
            )}
          </div>
        </div>

        {/* Right Info & Profile Actions */}
        <div className="flex items-center gap-3">
          {/* Global Search Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="البحث الشامل"
          >
            <Search className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">البحث الشامل</span>
          </button>

          <div className="hidden md:flex flex-col text-right leading-tight max-w-[220px]">
            <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
              {currentUser?.name || (portalType === 'admin' ? 'المدير العام لشبكتي' : 'تاجر شبكتي')}
            </span>
            <span className="text-[11px] text-slate-400 font-mono truncate dir-ltr">
              {currentUser?.role === 'vendor' && currentVendor 
                ? currentVendor.business_name 
                : (currentUser?.phone || '').replace(/\/*/, '').trim()}
            </span>
          </div>

          {/* Role Pill */}
          <div className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentUser?.role === 'admin' ? 'الأدمن' : 'تاجر معتمد'}</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 border border-slate-700 transition-colors flex items-center gap-1 text-xs sm:text-sm font-medium cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>

      {/* Global Search Modal */}
      {isSearchOpen && <GlobalSearch onClose={() => setIsSearchOpen(false)} />}
    </header>
  );
};
