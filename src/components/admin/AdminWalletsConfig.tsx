import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ExternalWalletConfig } from '../../types';
import { 
  Settings, Plus, CheckCircle2, ToggleLeft, ToggleRight, Key, Globe, Shield, 
  Edit3, Copy, Check, Eye, EyeOff, Radio, ArrowRightLeft, Sparkles, RefreshCw,
  Smartphone, Image as ImageIcon, Wallet, Building2, ExternalLink
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const AdminWalletsConfig: React.FC = () => {
  const { walletsConfig, saveGatewayFullConfig, addWalletConfig } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingWallet, setEditingWallet] = useState<ExternalWalletConfig | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // New Wallet Form State
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    icon_url: '',
    provider: 'basgate' as 'basgate' | 'pyes' | 'alamal' | 'kuraimi' | 'other',
    api_url: '',
    merchant_id: '',
    client_id: '',
    client_secret: '',
    mkey: '',
    app_id: '',
    mode: 'test' as 'test' | 'live',
    fee_percentage: 1.5,
    fixed_fee: 0,
    is_active: true,
    notes: '',
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleActive = async (config: ExternalWalletConfig) => {
    setIsSaving(true);
    const updated: ExternalWalletConfig = {
      ...config,
      is_active: !config.is_active,
    };
    await saveGatewayFullConfig(updated);
    setIsSaving(false);
    showNotice(`تم ${!config.is_active ? 'تفعيل' : 'تعطيل'} (${config.display_name || config.name}) بنجاح`);
  };

  const handleOpenEdit = (config: ExternalWalletConfig) => {
    if (config.provider === 'basgate') {
      const isLive = config.mode === 'live';
      const test_app_id = config.test_app_id || (!isLive ? config.app_id : '') || 'de14eba9-6272-4c23-86c3-40b592816ebc';
      const test_client_id = config.test_client_id || (!isLive ? config.client_id : '') || '273c2f8d-1f10-490f-8da7-d58785d627d2';
      const test_client_secret = config.test_client_secret || (!isLive ? config.client_secret : '') || '9ddad294-7c6c-444a-9859-0613ea6c2da4';
      const test_mkey = config.test_mkey || (!isLive ? config.mkey : '') || 'QDY0UVc1NzYzckFXYW9zMg==';

      const live_app_id = config.live_app_id || (isLive ? config.app_id : '') || '';
      const live_client_id = config.live_client_id || (isLive ? config.client_id : '') || '';
      const live_client_secret = config.live_client_secret || (isLive ? config.client_secret : '') || '';
      const live_mkey = config.live_mkey || (isLive ? config.mkey : '') || '';

      const test_auth_url = config.test_auth_url || 'https://api-tst.basgate.com/api/v1/auth/token';
      const live_auth_url = config.live_auth_url || 'https://app.basgate.com/api/v1/auth/token';
      const test_initiate_url = config.test_initiate_url || 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction';
      const live_initiate_url = config.live_initiate_url || 'https://app.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction';
      const test_status_url = config.test_status_url || 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/get-transaction-status';
      const live_status_url = config.live_status_url || 'https://app.basgate.com/api/v1/merchant/sdk-payment/get-transaction-status';

      setEditingWallet({
        ...config,
        test_app_id,
        test_client_id,
        test_client_secret,
        test_mkey,
        live_app_id,
        live_client_id,
        live_client_secret,
        live_mkey,
        test_auth_url,
        live_auth_url,
        test_initiate_url,
        live_initiate_url,
        test_status_url,
        live_status_url,
        app_id: isLive ? live_app_id : test_app_id,
        client_id: isLive ? live_client_id : test_client_id,
        client_secret: isLive ? live_client_secret : test_client_secret,
        mkey: isLive ? live_mkey : test_mkey,
      });
    } else {
      setEditingWallet(config);
    }
  };

  const handleToggleModeDirect = async (config: ExternalWalletConfig) => {
    const newMode: 'test' | 'live' = config.mode === 'live' ? 'test' : 'live';
    const isNowLive = newMode === 'live';
    const newApiUrl = isNowLive
      ? (config.live_initiate_url || 'https://app.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction')
      : (config.test_initiate_url || 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction');

    const updated: ExternalWalletConfig = {
      ...config,
      mode: newMode,
      api_url: newApiUrl,
      app_id: isNowLive ? (config.live_app_id || '') : (config.test_app_id || config.app_id || ''),
      client_id: isNowLive ? (config.live_client_id || '') : (config.test_client_id || config.client_id || ''),
      client_secret: isNowLive ? (config.live_client_secret || '') : (config.test_client_secret || config.client_secret || ''),
      mkey: isNowLive ? (config.live_mkey || '') : (config.test_mkey || config.mkey || ''),
    };

    setIsSaving(true);
    await saveGatewayFullConfig(updated);
    setIsSaving(false);
    showNotice(`تم تحويل (${config.display_name || config.name}) إلى ${newMode === 'live' ? 'بيئة الإنتاج الحي المباشر (LIVE) 🚀' : 'بيئة الفحص والتجربة (TEST) 🧪'} بنجاح`);
  };

  const handleSaveEdit = async () => {
    if (!editingWallet) return;
    setIsSaving(true);

    const isLive = editingWallet.mode === 'live';
    const activeUrl = isLive
      ? (editingWallet.live_initiate_url || 'https://app.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction')
      : (editingWallet.test_initiate_url || 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction');

    const activeAppId = isLive ? (editingWallet.live_app_id || '') : (editingWallet.test_app_id || '');
    const activeClientId = isLive ? (editingWallet.live_client_id || '') : (editingWallet.test_client_id || '');
    const activeClientSecret = isLive ? (editingWallet.live_client_secret || '') : (editingWallet.test_client_secret || '');
    const activeMkey = isLive ? (editingWallet.live_mkey || '') : (editingWallet.test_mkey || '');

    const finalConfig: ExternalWalletConfig = {
      ...editingWallet,
      app_id: activeAppId,
      client_id: activeClientId,
      client_secret: activeClientSecret,
      mkey: activeMkey,
      name: editingWallet.name,
      display_name: editingWallet.display_name || editingWallet.name,
      icon_url: editingWallet.icon_url || '',
      api_url: activeUrl,
      fee_percentage: Number(editingWallet.fee_percentage ?? 0),
      fixed_fee: Number(editingWallet.fixed_fee ?? 0),
    };

    await saveGatewayFullConfig(finalConfig);
    setIsSaving(false);
    setEditingWallet(null);
    showNotice(`تم حفظ وتحديث إعدادات (${finalConfig.display_name || finalConfig.name}) في قاعدة البيانات بنجاح.`);
  };

  const showNotice = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleSaveAdd = () => {
    if (!formData.name) {
      alert('يرجى كتابة اسم البوابة');
      return;
    }
    const initialUrl = formData.mode === 'live'
      ? 'https://app.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction'
      : 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction';

    addWalletConfig({
      ...formData,
      display_name: formData.display_name || formData.name,
      icon_url: formData.icon_url || '',
      api_url: formData.api_url || initialUrl,
      test_auth_url: 'https://api-tst.basgate.com/api/v1/auth/token',
      test_initiate_url: 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction',
      test_status_url: 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/get-transaction-status',
      live_auth_url: 'https://app.basgate.com/api/v1/auth/token',
      live_initiate_url: 'https://app.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction',
      live_status_url: 'https://app.basgate.com/api/v1/merchant/sdk-payment/get-transaction-status',
    });
    setIsAddOpen(false);
    showNotice('تمت إضافة البوابة بنجاح');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {saveSuccessMsg && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-900/90 border border-emerald-500/60 rounded-2xl shadow-2xl text-white text-xs font-bold animate-in fade-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            <span>تهيئة بوابات الدفع والمحافظ الإلكترونية (Gateway Dynamic Engine)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            التحكم المركزي في بيئات التشغيل (Test / Live)، اعتماديات الربط المباشر (App ID, Secrets)، وعمولات البوابات المحسوبة في التقارير
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة بوابة دفع جديدة</span>
        </button>
      </div>

      {/* Config Cards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {(!walletsConfig || walletsConfig.length === 0) ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3 col-span-full">
            <Globe className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-white font-bold text-base">جاري تحميل بوابات الدفع الإلكترونية...</h3>
            <p className="text-slate-400 text-xs">يرجى الانتظار أو إضافة بوابة دفع جديدة.</p>
          </div>
        ) : (
          walletsConfig.map((config, idx) => {
            if (!config) return null;
            const isBasgate = config.provider === 'basgate';
            const isPyes = config.provider === 'pyes' || config.provider === 'alamal';
            const isLive = config.mode === 'live';
            const walletName = config.name || 'بوابة دفع إلكتروني';
            const appDisplayName = config.display_name || walletName;
            const iconUrl = config.icon_url || '';
            const uniqueKey = config.id || `wallet-${idx}`;

            return (
              <div 
                key={uniqueKey} 
                className={`p-5 rounded-2xl bg-slate-900 border transition-all shadow-lg space-y-4 ${
                  !config.is_active 
                    ? 'border-slate-800/80 bg-slate-900/60 opacity-85'
                    : isBasgate 
                      ? (isLive ? 'border-emerald-600/40 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20' : 'border-amber-600/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/10')
                      : 'border-blue-600/30 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/10'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* App Icon Thumbnail */}
                    <div className="relative w-12 h-12 rounded-xl bg-slate-950 border border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {iconUrl ? (
                        <img 
                          src={iconUrl} 
                          alt={appDisplayName} 
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            (e.target as any).style.display = 'none';
                          }}
                        />
                      ) : isBasgate ? (
                        <Globe className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <Wallet className="w-6 h-6 text-blue-400" />
                      )}
                    </div>

                    <div>
                      {/* App Display Name */}
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base">{appDisplayName}</h3>
                        {appDisplayName !== walletName && (
                          <span className="text-[11px] text-slate-400">({walletName})</span>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {/* Provider Badge */}
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          isBasgate 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : isPyes 
                              ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                              : 'bg-slate-800 text-slate-300'
                        }`}>
                          {isBasgate ? 'بوابة BasGate (SDK)' : isPyes ? 'محفظة بيس (بنك الأمل)' : String(config.provider || 'OTHER').toUpperCase()}
                        </span>

                        {/* Environment Badge for BasGate */}
                        {isBasgate && (
                          isLive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              <span>إنتاج حي (LIVE)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-700/60 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              <span>فحص تجريبي (TEST)</span>
                            </span>
                          )
                        )}

                        {/* Direct Wallet Badge */}
                        {isPyes && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-700/60">
                            <Building2 className="w-3 h-3 text-blue-400" />
                            <span>سداد مباشر من المحفظة</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Independent Status Toggle for this specific card */}
                  <div className="shrink-0">
                    <button
                      disabled={isSaving}
                      onClick={() => handleToggleActive(config)}
                      className="cursor-pointer text-slate-300 hover:text-white transition-all transform active:scale-95"
                      title={config.is_active ? 'تعطيل هذه البوابة' : 'تفعيل هذه البوابة'}
                    >
                      {config.is_active ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-600/70 text-xs font-bold shadow-md shadow-emerald-950/40">
                          <ToggleRight className="w-4 h-4 text-emerald-400" />
                          <span>مُفعلة</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold">
                          <ToggleLeft className="w-4 h-4 text-slate-500" />
                          <span>معطلة</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Mode Switcher Banner (For BasGate) */}
                {isBasgate && (
                  <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isLive 
                      ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200' 
                      : 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                  }`}>
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <ArrowRightLeft className="w-4 h-4" />
                        <span>وضع توجيه الطلبات الفعلي: {isLive ? '🚀 إنتاج حي مباشر (Live API)' : '🧪 فحص تجريبي (Sandbox API)'}</span>
                      </div>
                      <p className="text-[11px] opacity-80">
                        {isLive 
                          ? 'يتم توجيه عمليات التطبيق إلى سيرفرات BasGate الحية (app.basgate.com) ونموذج SDK الإنتاجي.'
                          : 'يتم تمرير المعاملات إلى سيرفرات التست (api-tst.basgate.com) ونموذج SDK التجريبي.'}
                      </p>
                    </div>

                    <button
                      disabled={isSaving}
                      onClick={() => handleToggleModeDirect(config)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5 ${
                        isLive 
                          ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>{isLive ? 'التحويل إلى وضع التست (Test)' : 'التحويل إلى وضع الإنتاج (Live)'}</span>
                    </button>
                  </div>
                )}

                {/* Direct Wallet Info Banner (For PYes) */}
                {isPyes && (
                  <div className="p-3 rounded-xl border border-blue-800/40 bg-blue-950/30 text-blue-200 text-xs flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-blue-400" />
                        <span>محفظة بيس الإلكترونية (Direct Wallet)</span>
                      </div>
                      <p className="text-[11px] opacity-80">
                        سداد فوري من حساب محفظة بيس التابعة للعميل عبر السيرفر الداخلي المشفر، برقم الحساب ونقطة البيع.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-900/60 text-blue-300 font-mono text-[11px] font-bold border border-blue-700/50 shrink-0">
                      معزولة ومستقلة
                    </span>
                  </div>
                )}

                {/* Dynamic Credential Snapshot */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2 text-xs font-mono">
                  {/* App Presentation Snapshot */}
                  <div className="flex items-center justify-between text-slate-300 pb-2 border-b border-slate-800/70 font-sans">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>الاسم المعروض في التطبيق:</span>
                    </span>
                    <span className="text-emerald-300 font-bold">{appDisplayName}</span>
                  </div>

                  {/* App Icon Snapshot */}
                  <div className="flex items-center justify-between text-slate-300 pb-2 border-b border-slate-800/70 font-sans">
                    <span className="text-slate-400 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      <span>أيقونة البوابة في التطبيق:</span>
                    </span>
                    {iconUrl ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-300 truncate max-w-[180px] font-mono">{iconUrl}</span>
                        <img src={iconUrl} alt="icon" className="w-5 h-5 rounded object-contain bg-slate-900 border border-slate-700" />
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500">غير محدد (يتم استخدام أيقونة المحفظة الافتراضية)</span>
                    )}
                  </div>

                  {/* App ID or POS ID */}
                  {isBasgate ? (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 font-sans">
                        معرف التطبيق ({isLive ? 'Live' : 'Test'} App ID):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-300 font-bold select-all">
                          {(isLive ? config.live_app_id : config.test_app_id) || config.app_id || (isLive ? 'غير مهيأ' : 'de14eba9-6272-4c23-86c3-40b592816ebc')}
                        </span>
                        <button 
                          onClick={() => handleCopy((isLive ? config.live_app_id : config.test_app_id) || config.app_id || '', `${config.id}-appid`)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                          title="نسخ"
                        >
                          {copiedKey === `${config.id}-appid` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 font-sans">معرف المحفظة في النظام:</span>
                      <span className="text-amber-300 font-mono text-[11px] truncate max-w-[200px]">{config.id}</span>
                    </div>
                  )}

                  {/* Client ID (if Basgate) */}
                  {isBasgate && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 font-sans">
                        معرف العميل ({isLive ? 'Live' : 'Test'} Client ID):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-200 truncate max-w-[180px]">
                          {(isLive ? config.live_client_id : config.test_client_id) || config.client_id || (isLive ? 'غير مهيأ' : '')}
                        </span>
                        <button 
                          onClick={() => handleCopy((isLive ? config.live_client_id : config.test_client_id) || config.client_id || '', `${config.id}-cid`)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                          title="نسخ"
                        >
                          {copiedKey === `${config.id}-cid` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Environments Status Indicator */}
                  {isBasgate && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] font-sans">
                      <span className="text-slate-400">حالة بيانات البيئات:</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          config.test_client_id || config.client_id
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                            : 'bg-slate-800 text-slate-500'
                        }`}>
                          🧪 التست: مهيأ
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          config.live_client_id
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                        }`}>
                          🚀 اللايف: {config.live_client_id ? 'مهيأ' : 'غير مهيأ'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Active Endpoint */}
                  {config.api_url && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 font-sans">الرابط النشط حالياً:</span>
                      <span className={`truncate max-w-[220px] font-bold ${isLive ? 'text-emerald-400' : 'text-cyan-400'}`}>
                        {config.api_url}
                      </span>
                    </div>
                  )}

                  {/* Fees Configuration */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400 font-sans">عمولة البوابة المطبقة في التقارير:</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800/60 text-blue-300 font-bold">
                        %{config.fee_percentage ?? 0}
                      </span>
                      {(config.fixed_fee ?? 0) > 0 && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                          +{config.fixed_fee} YER
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => handleOpenEdit(config)}
                    className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>تعديل بيانات واعتماديات البوابة</span>
                  </button>

                  <span className="text-[11px] text-slate-400">
                    آخر تحديث: {config.created_at ? new Date(config.created_at).toLocaleDateString('ar-YE') : 'مباشر'}
                  </span>
                </div>
              </div>
            );
          })
      )}
      </div>

      {/* Edit Dynamic Gateway Modal */}
      {editingWallet && (
        <Modal
          isOpen={!!editingWallet}
          onClose={() => setEditingWallet(null)}
          title={`تهيئة واعتماديات: ${editingWallet.display_name || editingWallet.name}`}
        >
          <div className="space-y-5 text-sm max-h-[80vh] overflow-y-auto pr-1">
            {/* 1. App Display Name & App Icon (Requested by User) */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-emerald-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                <span>إعدادات العرض في تطبيق الجوال (الاسم والأيقونة المعروضة للعميل)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Display Name in App */}
                <div>
                  <label className="text-xs font-bold text-slate-200 mb-1 block">
                    الاسم المعروض في التطبيق:
                  </label>
                  <input
                    type="text"
                    value={editingWallet.display_name ?? editingWallet.name}
                    onChange={e => setEditingWallet({ ...editingWallet, display_name: e.target.value })}
                    placeholder="مثال: محفظة بيس (بنك الأمل) أو بوابة BasGate"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-emerald-300 font-bold focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    هذا هو الاسم الذي يظهر للعملاء والمستخدمين داخل تطبيق الموبايل عند اختيار طريقة الدفع.
                  </span>
                </div>

                {/* Internal Admin Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">
                    اسم البوابة في لوحة الإدارة:
                  </label>
                  <input
                    type="text"
                    value={editingWallet.name || ''}
                    onChange={e => setEditingWallet({ ...editingWallet, name: e.target.value })}
                    placeholder="اسم البوابة الداخلي"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    الاسم الإداري التعريفي الداخلي للبوابة في لوحة التحكم.
                  </span>
                </div>
              </div>

              {/* Icon URL and Preview */}
              <div>
                <label className="text-xs font-bold text-slate-200 mb-1 block flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>رابط أيقونة البوابة في التطبيق (Icon URL):</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={editingWallet.icon_url || ''}
                    onChange={e => setEditingWallet({ ...editingWallet, icon_url: e.target.value })}
                    placeholder="https://api.alhawia.store/storage/v1/object/public/.../icon.png"
                    className="flex-1 p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-blue-300 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                  {/* Icon Thumbnail Preview */}
                  <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {editingWallet.icon_url ? (
                      <img 
                        src={editingWallet.icon_url} 
                        alt="معاينة الأيقونة" 
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  رابط صورة الشعار الذي يظهر بجانب اسم البوابة في قائمة خيارات الدفع بتطبيق الموبايل.
                </span>
              </div>
            </div>

            {/* 2. Environment Mode Switch (For BasGate) */}
            {editingWallet.provider === 'basgate' && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>وضع التشغيل المستهدف (Target Environment):</span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingWallet({
                      ...editingWallet,
                      mode: 'test',
                      api_url: editingWallet.test_initiate_url || 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction',
                      app_id: editingWallet.test_app_id ?? '',
                      client_id: editingWallet.test_client_id ?? '',
                      client_secret: editingWallet.test_client_secret ?? '',
                      mkey: editingWallet.test_mkey ?? '',
                    })}
                    className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                      editingWallet.mode !== 'live'
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200 shadow-md shadow-amber-950/30 ring-1 ring-amber-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>🧪 بيئة التست التجريبية (Sandbox)</span>
                      {editingWallet.mode !== 'live' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="text-[11px] opacity-80 mt-1 font-mono">api-tst.basgate.com</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingWallet({
                      ...editingWallet,
                      mode: 'live',
                      api_url: editingWallet.live_initiate_url || 'https://app.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction',
                      app_id: editingWallet.live_app_id ?? '',
                      client_id: editingWallet.live_client_id ?? '',
                      client_secret: editingWallet.live_client_secret ?? '',
                      mkey: editingWallet.live_mkey ?? '',
                    })}
                    className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                      editingWallet.mode === 'live'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>🚀 بيئة الإنتاج المباشر (LIVE)</span>
                      {editingWallet.mode === 'live' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="text-[11px] opacity-80 mt-1 font-mono">app.basgate.com</div>
                  </button>
                </div>
              </div>
            )}

            {/* 3. Core Credentials (For BasGate) */}
            {editingWallet.provider === 'basgate' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-cyan-400" />
                    <span>اعتماديات المصادقة والتعريف للبوابة (Authentication Credentials)</span>
                  </h4>
                  {editingWallet.mode === 'live' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>حقول بيئة الإنتاج المباشر (LIVE)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-700/60 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>حقول بيئة الفحص والتجربة (Sandbox)</span>
                    </span>
                  )}
                </div>

                {editingWallet.mode === 'live' ? (
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-[11px] text-emerald-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>أنت الآن تقوم بتهيئة بيئة الإنتاج الحي (LIVE). هذه الحقول مستقلة تماماً ومخصصة للايف فقط، ولن تؤثر على بيانات التست.</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-[11px] text-amber-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>أنت الآن في وضع بيئة الاختبار (Sandbox). بياناتك هنا محفوظة، وعند النقر على زر "بيئة الإنتاج المباشر" بالأعلى ستتفرغ الحقول لتدخل بيانات اللايف بشكل منفصل.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">
                      معرف التطبيق ({editingWallet.mode === 'live' ? 'Live App ID' : 'Test App ID'}):
                    </label>
                    <input
                      type="text"
                      value={editingWallet.mode === 'live' ? (editingWallet.live_app_id ?? '') : (editingWallet.test_app_id ?? '')}
                      onChange={e => {
                        const val = e.target.value;
                        if (editingWallet.mode === 'live') {
                          setEditingWallet({ ...editingWallet, live_app_id: val, app_id: val });
                        } else {
                          setEditingWallet({ ...editingWallet, test_app_id: val, app_id: val });
                        }
                      }}
                      placeholder={editingWallet.mode === 'live' ? "أدخل معرف التطبيق لبيئة الإنتاج (Live App ID)" : "de14eba9-6272-4c23-86c3-40b592816ebc"}
                      className={`w-full p-2.5 bg-slate-950 border rounded-xl text-xs font-mono focus:outline-hidden ${
                        editingWallet.mode === 'live'
                          ? 'border-emerald-700/70 text-emerald-300 focus:border-emerald-500'
                          : 'border-slate-700 text-amber-300 focus:border-amber-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">
                      معرف العميل ({editingWallet.mode === 'live' ? 'Live Client ID' : 'Test Client ID'}):
                    </label>
                    <input
                      type="text"
                      value={editingWallet.mode === 'live' ? (editingWallet.live_client_id ?? '') : (editingWallet.test_client_id ?? '')}
                      onChange={e => {
                        const val = e.target.value;
                        if (editingWallet.mode === 'live') {
                          setEditingWallet({ ...editingWallet, live_client_id: val, client_id: val });
                        } else {
                          setEditingWallet({ ...editingWallet, test_client_id: val, client_id: val });
                        }
                      }}
                      placeholder={editingWallet.mode === 'live' ? "أدخل معرف العميل لبيئة الإنتاج (Live Client ID)" : "معرف العميل الصادر للتست"}
                      className={`w-full p-2.5 bg-slate-950 border rounded-xl text-xs font-mono focus:outline-hidden ${
                        editingWallet.mode === 'live'
                          ? 'border-emerald-700/70 text-white focus:border-emerald-500'
                          : 'border-slate-700 text-white focus:border-amber-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        المفتاح السري ({editingWallet.mode === 'live' ? 'Live Secret' : 'Test Secret'}):
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSecrets(!showSecrets)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showSecrets ? 'إخفاء' : 'إظهار'}</span>
                      </button>
                    </div>
                    <input
                      type={showSecrets ? 'text' : 'password'}
                      value={editingWallet.mode === 'live' ? (editingWallet.live_client_secret ?? '') : (editingWallet.test_client_secret ?? '')}
                      onChange={e => {
                        const val = e.target.value;
                        if (editingWallet.mode === 'live') {
                          setEditingWallet({ ...editingWallet, live_client_secret: val, client_secret: val });
                        } else {
                          setEditingWallet({ ...editingWallet, test_client_secret: val, client_secret: val });
                        }
                      }}
                      placeholder={editingWallet.mode === 'live' ? "أدخل السر الخاص بالعميل لبيئة الإنتاج" : "••••••••••••••••"}
                      className={`w-full p-2.5 bg-slate-950 border rounded-xl text-xs font-mono focus:outline-hidden ${
                        editingWallet.mode === 'live'
                          ? 'border-emerald-700/70 text-white focus:border-emerald-500'
                          : 'border-slate-700 text-white focus:border-amber-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">
                      مفتاح التوقيع والتشفير ({editingWallet.mode === 'live' ? 'Live MKey' : 'Test MKey'}):
                    </label>
                    <input
                      type={showSecrets ? 'text' : 'password'}
                      value={editingWallet.mode === 'live' ? (editingWallet.live_mkey ?? '') : (editingWallet.test_mkey ?? '')}
                      onChange={e => {
                        const val = e.target.value;
                        if (editingWallet.mode === 'live') {
                          setEditingWallet({ ...editingWallet, live_mkey: val, mkey: val });
                        } else {
                          setEditingWallet({ ...editingWallet, test_mkey: val, mkey: val });
                        }
                      }}
                      placeholder={editingWallet.mode === 'live' ? "أدخل مفتاح التوقيع AES لبيئة الإنتاج" : "مفتاح AES للتوقيع الرقمي"}
                      className={`w-full p-2.5 bg-slate-950 border rounded-xl text-xs font-mono focus:outline-hidden ${
                        editingWallet.mode === 'live'
                          ? 'border-emerald-700/70 text-white focus:border-emerald-500'
                          : 'border-slate-700 text-white focus:border-amber-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. Fee Configuration */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>إعدادات عمولة ورسوم البوابة (Gateway Fees):</span>
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">نسبة عمولة البوابة (%):</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={editingWallet.fee_percentage ?? 0}
                      onChange={e => setEditingWallet({ ...editingWallet, fee_percentage: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-blue-300 font-bold font-mono focus:outline-hidden focus:border-blue-500"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">تُخصم في تقرير العمليات لحساب صافي المنصة</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">مبلغ ثابت لكل حركة (اختياري):</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={editingWallet.fixed_fee ?? 0}
                      onChange={e => setEditingWallet({ ...editingWallet, fixed_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-bold font-mono focus:outline-hidden focus:border-blue-500"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">YER</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">رسم مقطوع إضافي إن وجد في العقد</span>
                </div>
              </div>
            </div>

            {/* 5. Advanced API Endpoints per Environment (For BasGate) */}
            {editingWallet.provider === 'basgate' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>مسارات الـ API للبوابة (حسب وثائق BasGate الرسمية)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">OAuth 2.0 & REST Endpoints</span>
                </h4>

                <div className="space-y-3 text-xs">
                  {/* Auth URLs */}
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-blue-400 block flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" />
                      <span>مسار التوثيق وتوليد التوكن (OAuth Token URL):</span>
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-amber-400 block mb-1">🧪 بيئة التست (Test Auth URL):</label>
                        <input
                          type="text"
                          value={editingWallet.test_auth_url || 'https://api-tst.basgate.com/api/v1/auth/token'}
                          onChange={e => setEditingWallet({ ...editingWallet, test_auth_url: e.target.value })}
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-amber-300 focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-emerald-400 block mb-1">🚀 بيئة الإنتاج (Live Auth URL):</label>
                        <input
                          type="text"
                          value={editingWallet.live_auth_url || 'https://app.basgate.com/api/v1/auth/token'}
                          onChange={e => setEditingWallet({ ...editingWallet, live_auth_url: e.target.value })}
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Initiate URLs */}
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-blue-400 block flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>مسار بدء المعاملة وإنشاء عملية الدفع (Initiate Payment URL):</span>
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-amber-400 block mb-1">🧪 بيئة التست (Test Initiate URL):</label>
                        <input
                          type="text"
                          value={editingWallet.test_initiate_url || 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction'}
                          onChange={e => setEditingWallet({ ...editingWallet, test_initiate_url: e.target.value })}
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-amber-300 focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-emerald-400 block mb-1">🚀 بيئة الإنتاج (Live Initiate URL):</label>
                        <input
                          type="text"
                          value={editingWallet.live_initiate_url || 'https://app.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction'}
                          onChange={e => setEditingWallet({ ...editingWallet, live_initiate_url: e.target.value })}
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status URLs */}
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-blue-400 block flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>مسار الاستعلام عن حالة العملية (Transaction Status URL):</span>
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-amber-400 block mb-1">🧪 بيئة التست (Test Status URL):</label>
                        <input
                          type="text"
                          value={editingWallet.test_status_url || 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/get-transaction-status'}
                          onChange={e => setEditingWallet({ ...editingWallet, test_status_url: e.target.value })}
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-emerald-400 block mb-1">🚀 بيئة الإنتاج (Live Status URL):</label>
                        <input
                          type="text"
                          value={editingWallet.live_status_url || 'https://app.basgate.com/api/v1/merchant/sdk-payment/get-transaction-status'}
                          onChange={e => setEditingWallet({ ...editingWallet, live_status_url: e.target.value })}
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">ملاحظات إدارية للبوابة:</label>
              <textarea
                rows={2}
                value={editingWallet.notes || ''}
                onChange={e => setEditingWallet({ ...editingWallet, notes: e.target.value })}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                placeholder="أي ملاحظات حول آلية التسوية أو عقود البوابة..."
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setEditingWallet(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-900/40 flex items-center gap-1.5 transition-all"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>حفظ وتطبيق الإعدادات في قاعدة البيانات</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Gateway Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="إضافة وتوصيل بوابة دفع / محفظة بنكية جديدة"
      >
        <div className="space-y-4 text-sm">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">اسم البوابة / الخدمة:</label>
            <input
              type="text"
              placeholder="مثال: بوابة BasGate (المحافظ والبنوك اليمنية)"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">الاسم المعروض في التطبيق:</label>
              <input
                type="text"
                placeholder="الاسم الذي يظهر للمستخدم في التطبيق"
                value={formData.display_name}
                onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">رابط أيقونة البوابة (Icon URL):</label>
              <input
                type="text"
                placeholder="https://.../icon.png"
                value={formData.icon_url}
                onChange={e => setFormData({ ...formData, icon_url: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">نوع مزود الخدمة:</label>
              <select
                value={formData.provider}
                onChange={e => setFormData({ ...formData, provider: e.target.value as any })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                <option value="basgate">BasGate (بوابة متعددة البنوك)</option>
                <option value="pyes">محفظة بيس (بنك الأمل)</option>
                <option value="kuraimi">حاسب (الكريمي)</option>
                <option value="other">محفظة أخرى</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">نسبة عمولة البوابة (%):</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.fee_percentage}
                onChange={e => setFormData({ ...formData, fee_percentage: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-blue-300 font-bold focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">معرف التطبيق (App ID):</label>
            <input
              type="text"
              placeholder="App ID من البنك (في حال BasGate)"
              value={formData.app_id}
              onChange={e => setFormData({ ...formData, app_id: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">ملاحظات التشغيل والربط:</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="وصف آلية التحقق أو شروط الدفع عبر هذه المحفظة..."
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-700"
            >
              إلغاء
            </button>
            <button
              onClick={handleSaveAdd}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-900/40"
            >
              حفظ وتفعيل البوابة
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
