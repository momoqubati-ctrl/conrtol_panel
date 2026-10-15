import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Profile, Vendor, Network, CardCategory, CardItem, 
  DepositRequest, WithdrawalRequest, ExternalWalletConfig, SmsLog, VendorLine, BroadcastNotification, Wallet, WithdrawalMethod 
} from '../types';
// Mock data removed: rely on Supabase / runtime context instead of initial mock data
import { getSupabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

interface AuthContextType {
  currentUser: Profile | null;
  currentVendor: Vendor | null;
  isLoggedIn: boolean;
  dbLoading: boolean;
  dbConnected: boolean;
  refetchFromDb: () => Promise<void>;
  loginAsAdmin: (phone: string, pass: string) => Promise<boolean>;
  loginAsVendor: (phone: string, pass: string) => Promise<boolean>;
  logout: () => void;
  accessToken: string | null;
  getAuthenticatedSupabase: () => any;

  // Data Collections
  vendors: Vendor[];
  networks: Network[];
  lines: VendorLine[];
  categories: CardCategory[];
  cards: CardItem[];
  depositRequests: DepositRequest[];
  withdrawalRequests: WithdrawalRequest[];
  wallets: Wallet[];
  withdrawalMethods: WithdrawalMethod[];
  walletsConfig: ExternalWalletConfig[];
  smsLogs: SmsLog[];
  broadcasts: BroadcastNotification[];
  profiles: Profile[];
  payments: any[];
  paymentItems: any[];

  // Mutations
  approveDeposit: (id: string, notes?: string) => void;
  rejectDeposit: (id: string, notes: string) => void;
  approveWithdrawal: (id: string, receiptUrl?: string, notes?: string) => void;
  rejectWithdrawal: (id: string, notes: string) => void;
  approveVendor: (vendorId: string) => void;
  rejectVendor: (vendorId: string) => void;
  updateVendorCommission: (vendorId: string, rate: number) => void;
  adminForceDeliverCards: (paymentId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  adminRefundPayment: (paymentId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  adminQueryPaymentStatus: (paymentId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  
  // Vendor Mutations
  addNetwork: (net: Omit<Network, 'id' | 'sales_count' | 'rating' | 'created_at'>) => void;
  updateNetwork: (id: string, data: Partial<Network>) => void;
  deleteNetwork: (id: string) => void;
  addLine: (line: Omit<VendorLine, 'id' | 'created_at'>) => void;
  deleteLine: (id: string) => void;
  addCategory: (cat: Omit<CardCategory, 'id' | 'available_cards_count' | 'created_at'>) => void;
  updateCategory: (id: string, data: Partial<CardCategory>) => void;
  deleteCategory: (id: string) => void;
  deleteCard: (id: string) => void;
  uploadCardsBulk: (categoryId: string, networkId: string, codes: string[]) => number;
  submitWithdrawal: (req: Omit<WithdrawalRequest, 'id' | 'status' | 'created_at' | 'vendor_name' | 'vendor_phone'> & { method_id: string }) => void;

  // Admin Mutations
  updateWalletConfig: (id: string, config: Partial<ExternalWalletConfig>) => void;
  addWalletConfig: (config: Omit<ExternalWalletConfig, 'id' | 'created_at'>) => void;
  saveGatewayFullConfig: (config: ExternalWalletConfig) => Promise<void>;
  sendBroadcast: (title: string, body: string, targetRole: 'all' | 'customer' | 'vendor') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = window.localStorage.getItem('shabakati_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [dbLoading, setDbLoading] = useState<boolean>(true);
  const [dbConnected, setDbConnected] = useState<boolean>(false);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [lines, setLines] = useState<VendorLine[]>([]);
  const [categories, setCategories] = useState<CardCategory[]>([]);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [walletsConfig, setWalletsConfig] = useState<ExternalWalletConfig[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastNotification[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentItems, setPaymentItems] = useState<any[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('shabakati_access_token');
  });

  const authenticatedClientRef = useRef<any>(null);
  const authenticatedTokenRef = useRef<string | null>(null);


  const getAuthenticatedSupabase = useCallback(() => {
    if (!accessToken) {
      authenticatedClientRef.current = null;
      authenticatedTokenRef.current = null;
      return getSupabase();
    }

    if (!authenticatedClientRef.current || authenticatedTokenRef.current !== accessToken) {
      authenticatedClientRef.current = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      authenticatedTokenRef.current = accessToken;
    }

    return authenticatedClientRef.current;
  }, [accessToken]);

  useEffect(() => {
    (window as any).getAuthenticatedSupabase = getAuthenticatedSupabase;
    return () => {
      delete (window as any).getAuthenticatedSupabase;
    };
  }, [getAuthenticatedSupabase]);

  // Phase 1: Query & Fetch all collections from Supabase DB
  const refetchFromDb = useCallback(async (tokenOverride?: string) => {
    setDbLoading(true);
    try {
      const supabase = tokenOverride
        ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
              headers: {
                Authorization: `Bearer ${tokenOverride}`,
              },
            },
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
          })
        : getAuthenticatedSupabase();
      const requests = [
        supabase.from('profiles').select('*'),
        supabase.from('vendors').select('*'),
        supabase.from('networks').select('*'),
        supabase.from('card_categories').select('*'),
        supabase.from('cards').select('*'),
        supabase.from('deposit_requests').select('*'),
        supabase.from('withdrawal_requests').select('*'),
        supabase.from('wallets').select('*'),
        supabase.from('withdrawal_methods').select('*'),
        supabase.from('vendor_lines').select('*'),
        supabase.from('external_wallets').select('*'),
        supabase.from('sms_logs').select('*'),
        supabase.from('card_delivery_attempts').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('payment_items').select('*'),
        supabase.from('app_settings').select('*')
      ];

      const settled = await Promise.allSettled(requests);
      const profilesResult = settled[0];
      const vendorsResult = settled[1];
      const networksResult = settled[2];
      const cardCategoriesResult = settled[3];
      const cardsResult = settled[4];
      const depositsResult = settled[5];
      const withdrawalsResult = settled[6];
      const walletsResult = settled[7];
      const withdrawalMethodsResult = settled[8];
      const linesResult = settled[9];
      const walletsConfigResult = settled[10];
      const smsResult = settled[11];
      const deliveryAttemptsResult = settled[12];
      const paymentsResult = settled[13];
      const paymentItemsResult = settled[14];
      const appSettingsResult = settled[15];

      const profilesData = profilesResult.status === 'fulfilled' ? (profilesResult.value?.data || []) : [];
      const vendorsData = vendorsResult.status === 'fulfilled' ? (vendorsResult.value?.data || []) : [];
      const networksData = networksResult.status === 'fulfilled' ? (networksResult.value?.data || []) : [];
      const cardCategoriesData = cardCategoriesResult.status === 'fulfilled' ? (cardCategoriesResult.value?.data || []) : [];
      const cardsData = cardsResult.status === 'fulfilled' ? (cardsResult.value?.data || []) : [];
      const depositsData = depositsResult.status === 'fulfilled' ? (depositsResult.value?.data || []) : [];
      const withdrawalsData = withdrawalsResult.status === 'fulfilled' ? (withdrawalsResult.value?.data || []) : [];
      const paymentsData = paymentsResult?.status === 'fulfilled' ? (paymentsResult.value?.data || []) : [];
      const paymentItemsData = paymentItemsResult?.status === 'fulfilled' ? (paymentItemsResult.value?.data || []) : [];
      const appSettingsData = appSettingsResult?.status === 'fulfilled' ? (appSettingsResult.value?.data || []) : [];

      console.log('CARDS RESULT:', cardsData.length, cardsResult.status === 'rejected' ? cardsResult.reason : null);
      const walletsData = walletsResult.status === 'fulfilled' ? (walletsResult.value?.data || []) : [];
      const withdrawalMethodsData = withdrawalMethodsResult.status === 'fulfilled' ? (withdrawalMethodsResult.value?.data || []) : [];
      const linesData = linesResult.status === 'fulfilled' ? (linesResult.value?.data || []) : [];
      const walletsConfigData = walletsConfigResult.status === 'fulfilled' ? (walletsConfigResult.value?.data || []) : [];
      const smsData = smsResult.status === 'fulfilled' ? (smsResult.value?.data || []) : [];
      const deliveryAttemptsData = deliveryAttemptsResult.status === 'fulfilled' ? (deliveryAttemptsResult.value?.data || []) : [];

      setDbConnected(true);
      if (profilesData.length > 0) {
        setProfiles(profilesData.map((p: any) => ({
          id: p.id,
          phone: p.phone_number || p.phone || '',
          name: p.name || p.full_name || 'مستخدم شبكتي',
          role: (p.role || p.marketplace_role?.toLowerCase() || 'customer') as any,
          avatar_url: p.avatar_url || p.profile_image_url,
          created_at: p.created_at,
          status: p.status || 'ACTIVE',
          email: p.email,
          marketplace_role: p.marketplace_role,
        })));
      }

      if (vendorsData.length > 0) {
        const mappedVendors: Vendor[] = vendorsData.map((v: any) => {
          const profile = (profilesData || []).find((p: any) => p.id === v.id);
          return {
            id: v.id,
            business_name: v.business_name || 'شبكة تاجر معتمدة',
            commercial_registry: v.commercial_registry_number,
            identity_doc_url: v.id_card_image_url,
            registry_doc_url: v.commercial_registry_image_url,
            commission_rate: v.commission_rate ?? 5.0,
            status: v.status || 'approved',
            created_at: v.created_at,
            user_phone: profile?.phone_number,
            user_name: profile?.name,
          };
        });
        setVendors(mappedVendors);
      }

      if (networksData.length > 0) {
        const mappedNetworks: Network[] = networksData.map((n: any) => ({
          id: n.id,
          vendor_id: n.vendor_id,
          name: n.name,
          description: n.description || '',
          governorate: n.province || 'أمانة العاصمة',
          district: n.district || 'معين',
          street: n.street || 'شارع خولان',
          logo_url: n.logo_url,
          ssids: Array.isArray(n.sub_ssids) ? n.sub_ssids : [],
          latitude: n.latitude,
          longitude: n.longitude,
          rating: n.rating || 0,
          sales_count: n.sales_count || 0,
          created_at: n.created_at,
        }));
        setNetworks(mappedNetworks);
      }

      if (cardCategoriesData.length > 0) {
        const mappedCategories: CardCategory[] = cardCategoriesData.map((c: any) => {
          const net = (networksData || []).find((n: any) => n.id === c.network_id);
          return {
            id: c.id,
            network_id: c.network_id,
            network_name: net?.name || 'شبكة الواي فاي',
            name: c.name,
            price: c.price,
            validity_days: c.validity_days || 1,
            upload_limit_mb: parseFloat(c.upload_limit) || 0,
            download_limit_mb: parseFloat(c.download_limit) || 0,
            created_at: c.created_at,
          };
        });
        setCategories(mappedCategories);
      }

      if (cardsData.length > 0) {
        const mappedCards: CardItem[] = cardsData.map((cd: any) => {
          const cat = (cardCategoriesData || []).find((c: any) => c.id === cd.category_id || c.id === cd.package_id);
          const net = (networksData || []).find((n: any) => n.id === cd.network_id);
          const deliveryAttempt = (deliveryAttemptsData || []).find((d: any) => d.card_id === cd.id);
          return {
            id: cd.id,
            category_id: cd.category_id || cd.package_id,
            network_id: cd.network_id,
            category_name: cat?.name,
            network_name: net?.name,
            code: cd.encrypted_code || cd.code || cd.card_code || '••••••••',
            status: cd.status || 'available',
            price: cd.price || cat?.price,
            created_at: cd.created_at,
            sold_at: cd.sold_at,
            ubtr_reference: cd.ubtr_reference || cd.ubtr_id || deliveryAttempt?.ubtr_id,
            order_id: cd.order_id || deliveryAttempt?.order_id,
            business_transaction_id: cd.business_transaction_id || deliveryAttempt?.business_transaction_id,
            reserved_for_payment_id: cd.reserved_for_payment_id,
            payment_item_id: cd.payment_item_id,
            encrypted_code: cd.encrypted_code,
          };
        });
        setCards(mappedCards);
      }

      if (depositsData.length > 0) {
        const mappedDeposits = depositsData.map((d: any) => {
          const prof = (profilesData || []).find((p: any) => p.id === d.user_id);
          const method = (withdrawalMethodsData || []).find((m: any) => m.id === d.method_id);
          return {
            id: d.id,
            user_id: d.user_id,
            user_name: prof?.name || d.sender_name || 'مشترك شبكتي',
            user_phone: prof?.phone_number || '770000000',
            method_id: d.method_id,
            method_name: method?.name || d.wallet_name || 'تحويل بنكي / محفظة',
            amount: d.amount || 0,
            reference_number: d.reference_number || 'مرجع غير محدد',
            receipt_image_url: d.receipt_image_url,
            status: d.status || 'pending',
            admin_notes: d.admin_statement || d.admin_notes,
            created_at: d.created_at || new Date().toISOString(),
          };
        });
        setDepositRequests(mappedDeposits);
      }

      if (withdrawalsData.length > 0) {
        const mappedWithdrawals = withdrawalsData.map((w: any) => {
          const vendor = (vendorsData || []).find((v: any) => v.id === w.vendor_id);
          const prof = (profilesData || []).find((p: any) => p.id === w.vendor_id);
          return {
            id: w.id,
            vendor_id: w.vendor_id,
            vendor_name: vendor?.business_name || prof?.name || 'تاجر شبكتي المعتمد',
            vendor_phone: prof?.phone_number || '770000000',
            amount: w.amount || 0,
            bank_name: w.bank_name || w.account_name || 'بنك الكريمي / محفظة',
            account_number: w.account_number || 'حساب غير محدد',
            account_name: w.account_name || vendor?.business_name || 'حساب تجاري',
            status: w.status || 'pending',
            admin_notes: w.admin_statement || w.admin_notes,
            receipt_url: w.receipt_image_url || w.receipt_url,
            created_at: w.created_at || new Date().toISOString(),
          };
        });
        setWithdrawalRequests(mappedWithdrawals);
      }

      setWallets(walletsData as any);
      setWithdrawalMethods(withdrawalMethodsData as any);
      setLines(linesData as any);

      // Parse and merge payment gateway configurations from app_settings
      const basSetting = (appSettingsData || []).find((s: any) => s.key === 'payment_gateway_basgate');
      let basSavedConfig: Partial<ExternalWalletConfig> = {};
      if (basSetting && basSetting.value) {
        try {
          basSavedConfig = typeof basSetting.value === 'string' ? JSON.parse(basSetting.value) : basSetting.value;
        } catch (err) {
          console.warn('Error parsing payment_gateway_basgate app_setting:', err);
        }
      }

      const pyesSetting = (appSettingsData || []).find((s: any) => s.key === 'payment_gateway_pyes' || s.key === 'payment_gateway_alamal');
      let pyesSavedConfig: Partial<ExternalWalletConfig> = {};
      if (pyesSetting && pyesSetting.value) {
        try {
          pyesSavedConfig = typeof pyesSetting.value === 'string' ? JSON.parse(pyesSetting.value) : pyesSetting.value;
        } catch (err) {
          console.warn('Error parsing payment_gateway_pyes app_setting:', err);
        }
      }

      // Map database external_wallets safely distinguishing BasGate from PYes (Al-Amal)
      const mappedDbWallets: ExternalWalletConfig[] = (walletsConfigData || []).map((w: any) => {
        const nameLower = (w.name || '').toLowerCase();
        const isBasGate = (w.id === '00067ecd-6812-4834-b37a-6d64d5af0608') || nameLower.includes('basgate') || w.provider === 'basgate';
        const isPyes = !isBasGate && ((w.id === 'd13cbe9c-1327-461c-bdc9-e08ae2199df3') || nameLower.includes('بيس') || nameLower.includes('الأمل') || w.provider === 'pyes' || w.provider === 'alamal');

        if (isBasGate) {
          const testAppId = basSavedConfig.test_app_id || (basSavedConfig.mode !== 'live' ? basSavedConfig.app_id : '') || 'de14eba9-6272-4c23-86c3-40b592816ebc';
          const testClientId = basSavedConfig.test_client_id || (basSavedConfig.mode !== 'live' ? basSavedConfig.client_id : '') || '273c2f8d-1f10-490f-8da7-d58785d627d2';
          const testClientSecret = basSavedConfig.test_client_secret || (basSavedConfig.mode !== 'live' ? basSavedConfig.client_secret : '') || '9ddad294-7c6c-444a-9859-0613ea6c2da4';
          const testMkey = basSavedConfig.test_mkey || (basSavedConfig.mode !== 'live' ? basSavedConfig.mkey : '') || 'QDY0UVc1NzYzckFXYW9zMg==';

          const liveAppId = basSavedConfig.live_app_id || (basSavedConfig.mode === 'live' ? basSavedConfig.app_id : '') || '';
          const liveClientId = basSavedConfig.live_client_id || (basSavedConfig.mode === 'live' ? basSavedConfig.client_id : '') || '';
          const liveClientSecret = basSavedConfig.live_client_secret || (basSavedConfig.mode === 'live' ? basSavedConfig.client_secret : '') || '';
          const liveMkey = basSavedConfig.live_mkey || (basSavedConfig.mode === 'live' ? basSavedConfig.mkey : '') || '';

          const isLive = basSavedConfig.mode === 'live';

          return {
            id: w.id || '00067ecd-6812-4834-b37a-6d64d5af0608',
            name: basSavedConfig.name || w.name || 'بوابة BasGate (المحافظ والبنوك اليمنية)',
            display_name: basSavedConfig.display_name || w.name || 'بوابة BasGate (المحافظ والبنوك اليمنية)',
            icon_url: w.icon_url || basSavedConfig.icon_url || '',
            provider: 'basgate' as const,
            api_url: isLive
              ? (basSavedConfig.live_initiate_url || 'https://app.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction')
              : (basSavedConfig.test_initiate_url || 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction'),
            app_id: isLive ? liveAppId : testAppId,
            client_id: isLive ? liveClientId : testClientId,
            client_secret: isLive ? liveClientSecret : testClientSecret,
            mkey: isLive ? liveMkey : testMkey,
            test_app_id: testAppId,
            test_client_id: testClientId,
            test_client_secret: testClientSecret,
            test_mkey: testMkey,
            live_app_id: liveAppId,
            live_client_id: liveClientId,
            live_client_secret: liveClientSecret,
            live_mkey: liveMkey,
            mode: basSavedConfig.mode || 'test',
            fee_percentage: basSavedConfig.fee_percentage !== undefined ? Number(basSavedConfig.fee_percentage) : 1.5,
            fixed_fee: basSavedConfig.fixed_fee !== undefined ? Number(basSavedConfig.fixed_fee) : 0,
            test_auth_url: basSavedConfig.test_auth_url || 'https://api-tst.basgate.com/api/v1/auth/token',
            test_initiate_url: basSavedConfig.test_initiate_url || 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction',
            test_status_url: basSavedConfig.test_status_url || 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/get-transaction-status',
            live_auth_url: basSavedConfig.live_auth_url || 'https://app.basgate.com/api/v1/auth/token',
            live_initiate_url: basSavedConfig.live_initiate_url || 'https://app.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction',
            live_status_url: basSavedConfig.live_status_url || 'https://app.basgate.com/api/v1/merchant/sdk-payment/get-transaction-status',
            is_active: w.is_active ?? true,
            notes: basSavedConfig.notes || w.notes || 'بوابة BasGate للدفع الإلكتروني المباشر (سداد عبر الحسابات البنكية والمحافظ اليمنية)',
            created_at: w.created_at,
          };
        } else if (isPyes) {
          return {
            id: w.id || 'd13cbe9c-1327-461c-bdc9-e08ae2199df3',
            name: pyesSavedConfig.name || w.name || 'محفظة بيس (بنك الأمل)',
            display_name: pyesSavedConfig.display_name || w.name || 'محفظة بيس (بنك الأمل)',
            icon_url: w.icon_url || pyesSavedConfig.icon_url || 'https://api.alhawia.store/storage/v1/object/public/profiles/wallets/1784675996942_icon.jpg',
            provider: 'pyes' as const,
            api_url: w.api_url || '',
            merchant_id: w.account_id || pyesSavedConfig.merchant_id || '',
            app_id: w.pos_id || pyesSavedConfig.app_id || '',
            is_active: w.is_active ?? true,
            mode: pyesSavedConfig.mode || 'live',
            fee_percentage: pyesSavedConfig.fee_percentage !== undefined ? Number(pyesSavedConfig.fee_percentage) : 0,
            fixed_fee: pyesSavedConfig.fixed_fee !== undefined ? Number(pyesSavedConfig.fixed_fee) : 0,
            notes: pyesSavedConfig.notes || w.notes || 'محفظة بيس الإلكترونية التابعة لبنك الأمل للتمويل الأصغر',
            created_at: w.created_at,
          };
        } else {
          return {
            id: w.id || `ext-${Date.now()}`,
            name: w.name || 'بوابة دفع',
            display_name: w.name || 'بوابة دفع',
            icon_url: w.icon_url || '',
            provider: (nameLower.includes('كريمي') || nameLower.includes('kuraimi') ? 'kuraimi' : (w.provider || 'other')) as any,
            api_url: w.api_url || '',
            merchant_id: w.account_id || w.merchant_id || '',
            app_id: w.pos_id || w.app_id || '',
            is_active: w.is_active ?? true,
            mode: w.mode || 'live',
            fee_percentage: w.fee_percentage !== undefined ? Number(w.fee_percentage) : 0,
            fixed_fee: w.fixed_fee !== undefined ? Number(w.fixed_fee) : 0,
            notes: w.notes || '',
            created_at: w.created_at,
          };
        }
      });

      // Ensure BasGate exists in configuration list if not present in DB
      if (!mappedDbWallets.some(w => w.provider === 'basgate')) {
        const testAppId = basSavedConfig.test_app_id || (basSavedConfig.mode !== 'live' ? basSavedConfig.app_id : '') || 'de14eba9-6272-4c23-86c3-40b592816ebc';
        const testClientId = basSavedConfig.test_client_id || (basSavedConfig.mode !== 'live' ? basSavedConfig.client_id : '') || '273c2f8d-1f10-490f-8da7-d58785d627d2';
        const testClientSecret = basSavedConfig.test_client_secret || (basSavedConfig.mode !== 'live' ? basSavedConfig.client_secret : '') || '9ddad294-7c6c-444a-9859-0613ea6c2da4';
        const testMkey = basSavedConfig.test_mkey || (basSavedConfig.mode !== 'live' ? basSavedConfig.mkey : '') || 'QDY0UVc1NzYzckFXYW9zMg==';

        const liveAppId = basSavedConfig.live_app_id || (basSavedConfig.mode === 'live' ? basSavedConfig.app_id : '') || '';
        const liveClientId = basSavedConfig.live_client_id || (basSavedConfig.mode === 'live' ? basSavedConfig.client_id : '') || '';
        const liveClientSecret = basSavedConfig.live_client_secret || (basSavedConfig.mode === 'live' ? basSavedConfig.client_secret : '') || '';
        const liveMkey = basSavedConfig.live_mkey || (basSavedConfig.mode === 'live' ? basSavedConfig.mkey : '') || '';

        const isLive = basSavedConfig.mode === 'live';

        mappedDbWallets.unshift({
          id: '00067ecd-6812-4834-b37a-6d64d5af0608',
          name: basSavedConfig.name || 'بوابة BasGate (المحافظ والبنوك اليمنية)',
          display_name: basSavedConfig.display_name || 'بوابة BasGate (المحافظ والبنوك اليمنية)',
          icon_url: basSavedConfig.icon_url || '',
          provider: 'basgate',
          api_url: isLive
            ? (basSavedConfig.live_initiate_url || 'https://app.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction')
            : (basSavedConfig.test_initiate_url || 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction'),
          app_id: isLive ? liveAppId : testAppId,
          client_id: isLive ? liveClientId : testClientId,
          client_secret: isLive ? liveClientSecret : testClientSecret,
          mkey: isLive ? liveMkey : testMkey,
          test_app_id: testAppId,
          test_client_id: testClientId,
          test_client_secret: testClientSecret,
          test_mkey: testMkey,
          live_app_id: liveAppId,
          live_client_id: liveClientId,
          live_client_secret: liveClientSecret,
          live_mkey: liveMkey,
          mode: basSavedConfig.mode || 'test',
          fee_percentage: basSavedConfig.fee_percentage !== undefined ? Number(basSavedConfig.fee_percentage) : 1.5,
          fixed_fee: basSavedConfig.fixed_fee !== undefined ? Number(basSavedConfig.fixed_fee) : 0,
          test_auth_url: 'https://api-tst.basgate.com/api/v1/auth/token',
          test_initiate_url: 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction',
          test_status_url: 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/get-transaction-status',
          live_auth_url: 'https://app.basgate.com/api/v1/auth/token',
          live_initiate_url: 'https://app.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction',
          live_status_url: 'https://app.basgate.com/api/v1/merchant/sdk-payment/get-transaction-status',
          is_active: true,
          notes: 'بوابة BasGate للدفع الإلكتروني المباشر (سداد عبر الحسابات البنكية والمحافظ اليمنية)',
          created_at: new Date().toISOString(),
        });
      }

      setWalletsConfig(mappedDbWallets);

      setSmsLogs(smsData as any);
      setPayments(paymentsData as any[]);
      setPaymentItems(paymentItemsData as any[]);

      setBroadcasts([]);
    } catch (err) {
      console.error('Error fetching Supabase database collections:', err);
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchFromDb();
  }, [refetchFromDb]);

  // Persist session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('shabakati_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('shabakati_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (!accessToken && currentUser) {
      setCurrentUser(null);
      window.localStorage.removeItem('shabakati_current_user');
      window.localStorage.removeItem('shabakati_access_token');
    }
  }, [accessToken, currentUser]);

  const currentVendor = currentUser?.role === 'vendor' 
    ? (vendors.find(v => v.id === currentUser.id || v.user_phone === currentUser.phone) || vendors[0] || null)
    : null;

  // Phase 1: Real Database Query Authentication
  const loginAsAdmin = async (phone: string, pass: string): Promise<boolean> => {
    const cleanPhone = phone.trim();
    try {
      const supabase = getAuthenticatedSupabase();
      const { data, error } = await supabase.rpc('login_by_phone', {
        p_phone: cleanPhone,
        p_password: pass,
      });

      if (error) {
        console.error('Admin login RPC error:', error);
        return false;
      }

      const payload = data as any;
      if (payload?.success === true && payload?.user) {
        if (!payload?.access_token) {
          console.error('login_by_phone did not return access_token for admin login.');
          return false;
        }

        const adminProf: Profile = {
          id: payload.user.id,
          phone: payload.user.phone_number || cleanPhone,
          name: payload.user.name || 'المدير العام لشبكتي',
          role: payload.user.role === 'admin' ? 'admin' : 'customer',
          governorate: 'صنعاء',
          created_at: new Date().toISOString(),
        };

        if (adminProf.role !== 'admin') {
          return false;
        }

        const token = payload.access_token;
        setAccessToken(token);
        window.localStorage.setItem('shabakati_access_token', token);
        console.log('CUSTOM JWT SET:', token?.substring(0, 20));

        setCurrentUser(adminProf);
        window.localStorage.setItem('shabakati_current_user', JSON.stringify(adminProf));
        await refetchFromDb(token);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error validating admin credentials via database:', err);
      return false;
    }
  };

  const loginAsVendor = async (phone: string, pass: string): Promise<boolean> => {
    const cleanPhone = phone.trim();
    try {
      const supabase = getAuthenticatedSupabase();
      const { data, error } = await supabase.rpc('login_by_phone', {
        p_phone: cleanPhone,
        p_password: pass,
      });

      if (error) {
        console.error('Vendor login RPC error:', error);
        return false;
      }

      const payload = data as any;
      if (payload?.success === true && payload?.user) {
        if (!payload?.access_token) {
          console.error('login_by_phone did not return access_token for vendor login.');
          return false;
        }

        const vendorProf: Profile = {
          id: payload.user.id,
          phone: payload.user.phone_number || cleanPhone,
          name: payload.user.name || 'تاجر شبكتي المعتمد',
          role: payload.user.role === 'vendor' ? 'vendor' : 'customer',
          governorate: 'صنعاء',
          created_at: new Date().toISOString(),
        };

        if (vendorProf.role !== 'vendor') {
          return false;
        }

        const token = payload.access_token;
        setAccessToken(token);
        window.localStorage.setItem('shabakati_access_token', token);
        console.log('CUSTOM JWT SET:', token?.substring(0, 20));

        setCurrentUser(vendorProf);
        window.localStorage.setItem('shabakati_current_user', JSON.stringify(vendorProf));
        await refetchFromDb(token);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error validating vendor credentials via database:', err);
      return false;
    }
  };

  const logout = () => {
    void getSupabase().auth.signOut().catch(() => undefined);
    setCurrentUser(null);
    setAccessToken(null);
    window.localStorage.removeItem('shabakati_current_user');
    window.localStorage.removeItem('shabakati_access_token');
  };


  // Local state operations for UI reactivity
  const approveDeposit = (id: string, notes?: string) => {
    setDepositRequests(prev => prev.map(d => d.id === id ? { ...d, status: 'approved', admin_notes: notes || 'تمت الموافقة والإيداع' } : d));
    const target = depositRequests.find(d => d.id === id);
    if (target?.user_phone) {
      setSmsLogs(prev => [
        {
          id: `sms-${Date.now()}`,
          recipient_phone: target.user_phone!,
          message: `تم اعتماد إيداعك بمبلغ ${target.amount.toLocaleString()} ريال يمني بنجاح.`,
          status: 'sent',
          sent_at: new Date().toISOString(),
        },
        ...prev
      ]);
    }
  };

  const rejectDeposit = (id: string, notes: string) => {
    setDepositRequests(prev => prev.map(d => d.id === id ? { ...d, status: 'rejected', admin_notes: notes } : d));
  };

  const approveWithdrawal = (id: string, receiptUrl?: string, notes?: string) => {
      (async () => {
      try {
        const supabase = getAuthenticatedSupabase();
        const { error } = await supabase.rpc('approve_withdrawal_request', {
          p_request_id: id,
          p_receipt_image_url: receiptUrl || null,
        });
        if (error) {
          console.error('approveWithdrawal rpc error:', error);
          return;
        }
        await refetchFromDb();
      } catch (err) {
        console.error('approveWithdrawal error:', err);
      }
    })();
  };

  const rejectWithdrawal = (id: string, notes: string) => {
    (async () => {
      try {
        const supabase = getAuthenticatedSupabase();
        const { error } = await supabase.rpc('reject_withdrawal_request', {
          p_request_id: id,
          p_reject_reason: notes,
        });
        if (error) {
          console.error('rejectWithdrawal rpc error:', error);
          return;
        }
        await refetchFromDb();
      } catch (err) {
        console.error('rejectWithdrawal error:', err);
      }
    })();
  };

  const approveVendor = (vendorId: string) => {
    setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, status: 'approved' } : v));
  };

  const rejectVendor = (vendorId: string) => {
    setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, status: 'rejected' } : v));
  };

  const updateVendorCommission = (vendorId: string, rate: number) => {
    setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, commission_rate: rate } : v));
  };

  const addNetwork = (net: Omit<Network, 'id' | 'sales_count' | 'rating' | 'created_at'>) => {
    (async () => {
      try {
        const supabase = getAuthenticatedSupabase();
        const payload: any = {
          vendor_id: net.vendor_id,
          name: net.name,
          description: net.description,
          province: net.governorate,
          district: net.district,
          street: net.street,
          sub_ssids: net.ssids,
          latitude: net.latitude,
          longitude: net.longitude,
          radius_meters: net.radius_meters,
          logo_url: net.logo_url,
        };
        const { data, error } = await supabase.from('networks').insert([payload]).select();
        if (error) {
          console.error('addNetwork supabase error:', error);
          return;
        }
        await refetchFromDb();
      } catch (err) {
        console.error('addNetwork error:', err);
      }
    })();
  };

  const updateNetwork = (id: string, data: Partial<Network>) => {
    (async () => {
      try {
        const supabase = getAuthenticatedSupabase();
        const payload: any = {};
        if (data.name !== undefined) payload.name = data.name;
        if (data.description !== undefined) payload.description = data.description;
        if (data.governorate !== undefined) payload.province = data.governorate;
        if (data.district !== undefined) payload.district = data.district;
        if (data.street !== undefined) payload.street = data.street;
        if (data.ssids !== undefined) payload.sub_ssids = data.ssids;
        if (data.latitude !== undefined) payload.latitude = data.latitude;
        if (data.longitude !== undefined) payload.longitude = data.longitude;
        if (data.radius_meters !== undefined) payload.radius_meters = data.radius_meters;
        if (data.logo_url !== undefined) payload.logo_url = data.logo_url;

        const { error } = await supabase.from('networks').update(payload).eq('id', id);
        if (error) {
          console.error('updateNetwork supabase error:', error);
          return;
        }
        await refetchFromDb();
      } catch (err) {
        console.error('updateNetwork error:', err);
      }
    })();
  };

  const deleteNetwork = (id: string) => {
    (async () => {
      try {
        const supabase = getAuthenticatedSupabase();
        const { error } = await supabase.from('networks').delete().eq('id', id);
        if (error) {
          console.error('deleteNetwork supabase error:', error);
          return;
        }
        await refetchFromDb();
      } catch (err) {
        console.error('deleteNetwork error:', err);
      }
    })();
  };

  const addLine = (line: Omit<VendorLine, 'id' | 'created_at'>) => {
    (async () => {
      try {
        const supabase = getAuthenticatedSupabase();
        const payload = {
          vendor_id: line.vendor_id,
          line_number: line.line_number,
          status: line.status || 'active',
        };
        const { data, error } = await supabase.from('vendor_lines').insert([payload]).select();
        if (error) {
          console.error('addLine supabase error:', error);
          return;
        }
        await refetchFromDb();
      } catch (err) {
        console.error('addLine error:', err);
      }
    })();
  };

  const deleteLine = (id: string) => {
    (async () => {
      try {
        const supabase = getAuthenticatedSupabase();
        const { error } = await supabase.from('vendor_lines').delete().eq('id', id);
        if (error) {
          console.error('deleteLine supabase error:', error);
          return;
        }
        await refetchFromDb();
      } catch (err) {
        console.error('deleteLine error:', err);
      }
    })();
  };

  const addCategory = (cat: Omit<CardCategory, 'id' | 'available_cards_count' | 'created_at'>) => {
    (async () => {
      try {
        const supabase = getAuthenticatedSupabase();
        const payload: any = {
          network_id: cat.network_id,
          name: cat.name,
          price: cat.price,
          validity_days: cat.validity_days,
          download_limit: cat.download_limit_mb,
          upload_limit: cat.upload_limit_mb,
          speed_limit_kbps: cat.speed_limit_kbps,
        };
        const { data, error } = await supabase.from('card_categories').insert([payload]).select();
        if (error) {
          console.error('addCategory supabase error:', error);
          return;
        }
        await refetchFromDb();
      } catch (err) {
        console.error('addCategory error:', err);
      }
    })();
  };

  const updateCategory = (id: string, data: Partial<CardCategory>) => {
    (async () => {
      try {
        const supabase = getAuthenticatedSupabase();
        const payload: any = {};
        if (data.name !== undefined) payload.name = data.name;
        if (data.price !== undefined) payload.price = data.price;
        if (data.validity_days !== undefined) payload.validity_days = data.validity_days;
        if (data.download_limit_mb !== undefined) payload.download_limit = data.download_limit_mb;
        if (data.upload_limit_mb !== undefined) payload.upload_limit = data.upload_limit_mb;
        if (data.speed_limit_kbps !== undefined) payload.speed_limit_kbps = data.speed_limit_kbps;

        const { error } = await supabase.from('card_categories').update(payload).eq('id', id);
        if (error) {
          console.error('updateCategory supabase error:', error);
          return;
        }
        await refetchFromDb();
      } catch (err) {
        console.error('updateCategory error:', err);
      }
    })();
  };

  const deleteCategory = (id: string) => {
    (async () => {
      try {
        const supabase = getAuthenticatedSupabase();
        const { error } = await supabase.from('card_categories').delete().eq('id', id);
        if (error) {
          console.error('deleteCategory supabase error:', error);
          return;
        }
        await refetchFromDb();
      } catch (err) {
        console.error('deleteCategory error:', err);
      }
    })();
  };

  const deleteCard = (id: string) => {
    (async () => {
      try {
        const supabase = getAuthenticatedSupabase();
        const { error } = await supabase.from('cards').delete().eq('id', id);
        if (error) {
          console.error('deleteCard supabase error:', error);
          return;
        }
        await refetchFromDb();
      } catch (err) {
        console.error('deleteCard error:', err);
      }
    })();
  };

  const uploadCardsBulk = (categoryId: string, networkId: string, codes: string[]): number => {
    (async () => {
      try {
        if (!codes || codes.length === 0) return 0;
        const supabase = getAuthenticatedSupabase();
        const payload = codes.map(code => ({
          category_id: categoryId,
          network_id: networkId,
          code: code.trim(),
          status: 'available',
        }));
        const { data, error } = await supabase.from('cards').insert(payload).select();
        if (error) {
          console.error('uploadCardsBulk supabase error:', error);
          return 0;
        }
        await refetchFromDb();
        return Array.isArray(data) ? data.length : codes.length;
      } catch (err) {
        console.error('uploadCardsBulk error:', err);
        return 0;
      }
    })();
    return codes.length;
  };

  const submitWithdrawal = (req: Omit<WithdrawalRequest, 'id' | 'status' | 'created_at' | 'vendor_name' | 'vendor_phone'> & { method_id: string }) => {
    (async () => {
      try {
        const supabase = getAuthenticatedSupabase();
        const params: any = {
          p_vendor_id: req.vendor_id,
          p_amount: req.amount,
          p_account_number: req.account_number,
          p_account_name: req.account_name,
          p_method_id: req.method_id,
        };
        const { data, error } = await supabase.rpc('create_withdrawal_request', params);
        if (error) {
          console.error('submitWithdrawal rpc error:', error);
          return;
        }
        await refetchFromDb();
      } catch (err) {
        console.error('submitWithdrawal error:', err);
      }
    })();
  };

  const updateWalletConfig = (id: string, config: Partial<ExternalWalletConfig>) => {
    setWalletsConfig(prev => prev.map(w => w.id === id ? { ...w, ...config } : w));
  };

  const saveGatewayFullConfig = async (config: ExternalWalletConfig) => {
    // If BasGate, ensure active credentials match current mode
    if (config.provider === 'basgate') {
      const isLive = config.mode === 'live';
      config.app_id = isLive ? (config.live_app_id || '') : (config.test_app_id || '');
      config.client_id = isLive ? (config.live_client_id || '') : (config.test_client_id || '');
      config.client_secret = isLive ? (config.live_client_secret || '') : (config.test_client_secret || '');
      config.mkey = isLive ? (config.live_mkey || '') : (config.test_mkey || '');
      config.api_url = isLive
        ? (config.live_initiate_url || 'https://app.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction')
        : (config.test_initiate_url || 'https://api-tst.basgate.com/api/v1/merchant/sdk-payment/initiate-transaction');
    }

    // 1. Update React state immediately - STRICTLY by ID!
    setWalletsConfig(prev => {
      const exists = prev.some(w => w.id === config.id);
      if (exists) {
        return prev.map(w => (w.id === config.id ? { ...w, ...config } : w));
      }
      return [...prev, config];
    });

    // 2. Persist to localStorage by ID
    try {
      localStorage.setItem(`shabakati_gateway_${config.id}`, JSON.stringify(config));
    } catch (_) {}

    // 3. Persist to Supabase external_wallets table directly (for Flutter mobile app)
    try {
      const supabase = getAuthenticatedSupabase();
      if (config.id && !config.id.startsWith('ext-')) {
        const updatePayload: Record<string, any> = {
          name: config.display_name || config.name,
          icon_url: config.icon_url || '',
          is_active: config.is_active,
          updated_at: new Date().toISOString()
        };
        const { error: ewErr } = await supabase
          .from('external_wallets')
          .update(updatePayload)
          .eq('id', config.id);

        if (ewErr) {
          console.warn('Failed to update external_wallets table:', ewErr);
        }
      }

      // 4. Persist full config to Supabase app_settings table
      const settingKey = `payment_gateway_${config.provider || 'basgate'}`;
      const payload = JSON.stringify(config);
      const { error: rpcErr } = await supabase.rpc('save_gateway_settings', {
        p_key: settingKey,
        p_value: payload
      });
      if (rpcErr) {
        console.warn('save_gateway_settings RPC error, attempting direct upsert:', rpcErr);
        await supabase.from('app_settings').upsert({
          key: settingKey,
          value: payload,
          description: `إعدادات وتكامل بوابة ${config.name} (${config.mode === 'live' ? 'بيئة الإنتاج Live' : 'بيئة التست Test'})`,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      }
    } catch (err) {
      console.error('Failed to save gateway setting to Supabase:', err);
    }
  };

  const addWalletConfig = (config: Omit<ExternalWalletConfig, 'id' | 'created_at'>) => {
    const newConfig: ExternalWalletConfig = {
      ...config,
      id: `ext-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setWalletsConfig(prev => [...prev, newConfig]);
  };

  const sendBroadcast = (title: string, body: string, targetRole: 'all' | 'customer' | 'vendor') => {
    const newB: BroadcastNotification = {
      id: `bc-${Date.now()}`,
      title,
      body,
      target_role: targetRole,
      sent_by: currentUser?.name || 'مدير النظام',
      created_at: new Date().toISOString(),
    };
    setBroadcasts(prev => [newB, ...prev]);
  };

  const adminForceDeliverCards = async (paymentId: string, reason: string = 'تسليم يدوي استثنائي للكروت من الأدمن') => {
    try {
      const supabase = getAuthenticatedSupabase();
      const adminId = currentUser?.id;
      const { data, error } = await supabase.rpc('admin_force_deliver_cards', {
        p_admin_id: adminId,
        p_payment_id: paymentId,
        p_reason: reason
      });
      if (error) throw error;
      await refetchFromDb();
      return { success: true, data };
    } catch (err: any) {
      console.error('adminForceDeliverCards error:', err);
      return { success: false, error: err.message || 'فشلت عملية التسليم اليدوي' };
    }
  };

  const adminRefundPayment = async (paymentId: string, reason: string = 'إلغاء ورفض المعاملة إدارياً') => {
    try {
      const supabase = getAuthenticatedSupabase();
      const adminId = currentUser?.id;
      const { data, error } = await supabase.rpc('admin_refund_payment', {
        p_admin_id: adminId,
        p_payment_id: paymentId,
        p_reason: reason
      });
      if (error) throw error;
      await refetchFromDb();
      return { success: true, data };
    } catch (err: any) {
      console.error('adminRefundPayment error:', err);
      return { success: false, error: err.message || 'فشلت عملية رفض المعاملة' };
    }
  };

  const adminQueryPaymentStatus = async (paymentId: string) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bas-verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ payment_id: paymentId }),
      });
      const data = await res.json();
      await refetchFromDb();
      return { success: true, data };
    } catch (err: any) {
      console.error('adminQueryPaymentStatus error:', err);
      return { success: false, error: err.message || 'فشل الاستعلام عن حالة العملية' };
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      currentVendor,
      isLoggedIn: !!currentUser,
      dbLoading,
      dbConnected,
      refetchFromDb,
      loginAsAdmin,
      loginAsVendor,
      logout,
      vendors,
      networks,
      lines,
      categories,
      cards,
      payments,
      paymentItems,
      depositRequests,
      withdrawalRequests,
      wallets,
      withdrawalMethods,
      walletsConfig,
      smsLogs,
      broadcasts,
      profiles,
      approveDeposit,
      rejectDeposit,
      approveWithdrawal,
      rejectWithdrawal,
      approveVendor,
      rejectVendor,
      updateVendorCommission,
      adminForceDeliverCards,
      adminRefundPayment,
      adminQueryPaymentStatus,
      addNetwork,
      updateNetwork,
      deleteNetwork,
      addLine,
      deleteLine,
      addCategory,
      updateCategory,
      deleteCategory,
      deleteCard,
      uploadCardsBulk,
      submitWithdrawal,
      updateWalletConfig,
      saveGatewayFullConfig,
      addWalletConfig,
      sendBroadcast,
      accessToken,
      getAuthenticatedSupabase
    }}>

      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

