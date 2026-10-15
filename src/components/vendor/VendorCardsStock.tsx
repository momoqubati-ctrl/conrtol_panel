import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CardItem } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Ticket, Search, Copy, Eye, Trash2, ShieldAlert } from 'lucide-react';
import { Modal } from '../common/Modal';
import { normalizeCardStatus, isCardSold } from '../../lib/cardStatusUtils';

export const VendorCardsStock: React.FC = () => {
  const { currentVendor, cards, networks, deleteCard } = useAuth();
  
  const vendorId = currentVendor?.id || '';
  const vendorNetworks = vendorId ? networks.filter(n => n.vendor_id === vendorId) : [];
  const vendorCards = vendorNetworks.length ? cards.filter(c => vendorNetworks.some(n => n.id === c.network_id)) : [];

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const filtered = vendorCards.filter(c => {
    const cardNorm = normalizeCardStatus(c.status);
    const filterNorm = filterStatus.toLowerCase();
    const matchesStatus = filterStatus === 'all' || cardNorm === filterNorm;
    const matchesSearch = (c.code || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.category_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.network_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmDelete = () => {
    if (deleteCardId) {
      deleteCard(deleteCardId);
      setDeleteCardId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Ticket className="w-6 h-6 text-cyan-400" />
            <span>مخزون الأكواد والبطاقات (Inventory Details)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">تتبع كشوفات الكروت المتاحة، المحجوزة، والمباعة لكل فئة وشبكة</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="بحث بكود البطاقة أو الفئة..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">جميع الحالات ({vendorCards.length})</option>
            <option value="available">المتاحة فقط ({vendorCards.filter(isCardAvailable).length})</option>
            <option value="sold">المباعة فقط ({vendorCards.filter(isCardSold).length})</option>
            <option value="reserved">المحجوزة</option>
          </select>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-bold text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-4">الفئة التابعة</th>
                <th className="p-4">رمز البطاقة (Code)</th>
                <th className="p-4">السعر</th>
                <th className="p-4">تاريخ الإضافة / البيع</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(card => (
                <tr key={card.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-semibold text-white">{card.category_name || 'باقة اليوم'}</td>
                  <td className="p-4 font-mono text-cyan-300 font-bold dir-ltr text-xs">
                    {card.status === 'available' ? '••••••••••••' : card.code}
                  </td>
                  <td className="p-4 font-bold text-amber-400 font-mono dir-ltr">{card.price?.toLocaleString()} YER</td>
                  <td className="p-4 text-xs text-slate-400">
                    {new Date(card.sold_at || card.created_at || Date.now()).toLocaleDateString('ar-YE')}
                  </td>
                  <td className="p-4"><StatusBadge status={card.status} /></td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedCard(card)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>معاينة Voucher</span>
                      </button>
                      {card.status === 'available' && (
                        <button
                          onClick={() => setDeleteCardId(card.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:text-rose-400 text-slate-400 border border-slate-700 cursor-pointer"
                          title="حذف الكرت"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scratch Voucher Modal */}
      {selectedCard && (
        <Modal
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          title="بطاقة شحن كرت شبكتي - Voucher Preview"
        >
          <div className="space-y-5">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 border-2 border-dashed border-cyan-500/50 shadow-2xl relative overflow-hidden text-center space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                  <span className="font-extrabold text-white text-base">شبكتي - Shabakati Wi-Fi</span>
                </div>
                <StatusBadge status={selectedCard.status} />
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">اسم الفئة والباقة:</span>
                <span className="text-lg font-extrabold text-cyan-300">{selectedCard.category_name}</span>
              </div>

              {/* Code display with copy */}
              <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 relative">
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">رمز البطاقة (WI-FI PIN):</span>
                <span className="text-2xl font-mono font-extrabold text-emerald-400 tracking-widest dir-ltr block">
                  {selectedCard.code}
                </span>

                <button
                  onClick={() => handleCopy(selectedCard.code)}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{copied ? 'تم النسخ!' : 'نسخ رمز البطاقة'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800 font-mono">
                <span>القيمة: {selectedCard.price?.toLocaleString()} YER</span>
                <span>الشبكة: {selectedCard.network_name || 'شبكة الواي فاي'}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Card Modal */}
      <Modal
        isOpen={!!deleteCardId}
        onClose={() => setDeleteCardId(null)}
        title="تأكيد حذف الكرت من المخزون"
      >
        <div className="space-y-4 text-sm text-center">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <p className="text-slate-200">
            هل أنت متأكد من حذف هذا الكرت غير المباع من مخزونك؟
          </p>

          <div className="flex justify-center gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setDeleteCardId(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirmDelete}
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
