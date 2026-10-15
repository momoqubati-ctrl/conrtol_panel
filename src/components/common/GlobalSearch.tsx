import React, { useState } from 'react';
import { Search, X, Wifi, Store, Ticket, Phone, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface GlobalSearchProps {
  onClose?: () => void;
  onNavigateTab?: (tabId: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onClose, onNavigateTab }) => {
  const { networks, vendors, cards, lines, depositRequests, withdrawalRequests } = useAuth();
  const [query, setQuery] = useState('');

  const trimmed = query.trim().toLowerCase();

  const matchedNetworks = trimmed ? networks.filter(n => n.name.toLowerCase().includes(trimmed) || n.ssids?.some(s => s.toLowerCase().includes(trimmed))) : [];
  const matchedVendors = trimmed ? vendors.filter(v => v.business_name.toLowerCase().includes(trimmed) || v.user_phone?.includes(trimmed)) : [];
  const matchedCards = trimmed ? cards.filter(c => c.code.toLowerCase().includes(trimmed)) : [];
  const matchedLines = trimmed ? lines.filter(l => l.line_number.includes(trimmed) || (l.note && l.note.toLowerCase().includes(trimmed))) : [];
  const matchedDeposits = trimmed ? depositRequests.filter(d => d.reference_number.includes(trimmed) || d.user_name?.toLowerCase().includes(trimmed)) : [];
  const matchedWithdrawals = trimmed ? withdrawalRequests.filter(w => w.account_number.includes(trimmed) || w.vendor_name?.toLowerCase().includes(trimmed)) : [];

  const totalMatches = matchedNetworks.length + matchedVendors.length + matchedCards.length + matchedLines.length + matchedDeposits.length + matchedWithdrawals.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/80">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="البحث الشامل بالمنصة (اسم الشبكة، الكرت، رقم الخط، التاجر، المرجع...)"
            className="w-full bg-transparent border-none text-slate-100 text-sm placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto space-y-4">
          {!trimmed && (
            <div className="text-center py-12 text-slate-400 text-sm">
              اكتب للبحث السريع في شبكات الواي فاي، التجار، الأكواد، أرقام الخطوط، أو المعاملات المالية...
            </div>
          )}

          {trimmed && totalMatches === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              لا توجد نتائج مطابقة لـ "<span className="text-white font-bold">{query}</span>"
            </div>
          )}

          {matchedNetworks.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
                <Wifi className="w-4 h-4 text-purple-400" />
                <span>الشبكات ({matchedNetworks.length})</span>
              </div>
              <div className="space-y-1">
                {matchedNetworks.map(n => (
                  <div key={n.id} className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-sm flex items-center justify-between">
                    <span className="font-bold text-white">{n.name}</span>
                    <span className="text-xs text-slate-400">{n.governorate} - {n.district}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchedVendors.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
                <Store className="w-4 h-4 text-amber-400" />
                <span>التجار ({matchedVendors.length})</span>
              </div>
              <div className="space-y-1">
                {matchedVendors.map(v => (
                  <div key={v.id} className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-sm flex items-center justify-between">
                    <span className="font-bold text-white">{v.business_name}</span>
                    <span className="text-xs text-slate-400">{v.user_phone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchedCards.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
                <Ticket className="w-4 h-4 text-emerald-400" />
                <span>الكروت ({matchedCards.length})</span>
              </div>
              <div className="space-y-1">
                {matchedCards.map(c => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-sm flex items-center justify-between font-mono">
                    <span className="font-bold text-emerald-400 dir-ltr">{c.code}</span>
                    <span className="text-xs text-slate-400">{c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchedLines.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
                <Phone className="w-4 h-4 text-blue-400" />
                <span>خطوط الإنترنت ({matchedLines.length})</span>
              </div>
              <div className="space-y-1">
                {matchedLines.map(l => (
                  <div key={l.id} className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-sm flex items-center justify-between">
                    <span className="font-bold text-blue-400 font-mono">{l.line_number}</span>
                    <span className="text-xs text-slate-400">{l.note || 'خط مسجل'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
