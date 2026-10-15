export type UserRole = 'customer' | 'vendor' | 'admin' | 'retailer' | 'wholesale_merchant';

export type StoreType = 
  | 'grocery' 
  | 'supermarket' 
  | 'commercial_center' 
  | 'telecom_shop' 
  | 'kiosk' 
  | 'pos_outlet' 
  | 'other';

export type RetailerStatus = 
  | 'pending_verification' 
  | 'active' 
  | 'suspended' 
  | 'blocked' 
  | 'rejected';

export type VendorType = 
  | 'network_owner' 
  | 'wholesale_merchant' 
  | 'hybrid';

export interface Retailer {
  id: string;
  retailer_code: string;
  store_name: string;
  store_type: StoreType;
  commercial_registry?: string;
  owner_national_id?: string;
  city: string;
  zone: string;
  exact_address?: string;
  contact_phone: string;
  whatsapp_phone?: string;
  status: RetailerStatus;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  governorate?: string;
  created_at?: string;
  status?: string;
  email?: string;
  marketplace_role?: string;
  wallet_balance?: number;
}

export interface AdminUserItem extends Profile {
  is_admin: boolean;
  is_network_owner: boolean;
  is_wholesale_merchant: boolean;
  is_retailer: boolean;
  is_customer: boolean;
  vendor_type?: VendorType | null;
  vendor_business_name?: string;
  wholesale_license_number?: string;
  retailer_store_name?: string;
  retailer_code?: string;
  retailer_status?: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  held_balance: number;
  wallet_number: string;
  updated_at?: string;
}

export interface Vendor {
  id: string;
  business_name: string;
  commercial_registry?: string;
  identity_doc_url?: string;
  registry_doc_url?: string;
  commission_rate: number; // e.g. 5.0 for 5%
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  vendor_type?: VendorType;
  wholesale_license_number?: string;
  created_at?: string;
  user_phone?: string;
  user_name?: string;
}

export interface Network {
  id: string;
  vendor_id: string;
  name: string;
  description?: string;
  governorate?: string;
  district?: string;
  street?: string;
  logo_url?: string;
  ssids?: string[];
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  rating?: number;
  sales_count?: number;
  created_at?: string;
}

export interface CoveragePoint {
  id: string;
  network_id: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  name?: string;
}

export interface VendorLine {
  id: string;
  vendor_id: string;
  line_number: string;
  status: 'active' | 'inactive';
  created_at?: string;
  note?: string;
}

export interface CardCategory {
  id: string;
  network_id: string;
  network_name?: string;
  name: string;
  price: number;
  validity_days: number;
  download_limit_mb?: number;
  upload_limit_mb?: number;
  speed_limit_kbps?: number;
  available_cards_count?: number;
  created_at?: string;
}

export interface CardItem {
  id: string;
  category_id: string;
  category_name?: string;
  network_id: string;
  network_name?: string;
  code: string; // decrypted or masked depending on access
  status: 'available' | 'sold' | 'reserved';
  owner_id?: string;
  price?: number;
  created_at?: string;
  sold_at?: string;
  ubtr_reference?: string;
  order_id?: string;
  business_transaction_id?: string;
  reserved_for_payment_id?: string;
  payment_item_id?: string;
  encrypted_code?: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  user_id?: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'card_purchase' | 'vendor_earning' | 'commission' | 'transfer_in' | 'transfer_out';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference_id?: string;
  description?: string;
  created_at: string;
}

export interface DepositRequest {
  id: string;
  user_id: string;
  user_name?: string;
  user_phone?: string;
  method_id: string;
  method_name?: string;
  amount: number;
  reference_number: string;
  receipt_image_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  vendor_phone?: string;
  amount: number;
  bank_name?: string;
  account_number: string;
  account_name: string;
  method_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  receipt_url?: string;
  receipt_image_url?: string;
  reject_reason?: string;
  processed_at?: string;
  created_at: string;
}

export interface WithdrawalMethod {
  id: string;
  name: string;
  type: 'transfer' | 'wallet' | 'other';
  instructions: string;
  is_active: boolean;
  created_at?: string;
}

export interface ExternalWalletConfig {
  id: string;
  name: string;
  display_name?: string;
  icon_url?: string;
  provider: 'basgate' | 'alamal' | 'pyes' | 'kuraimi' | 'other';
  api_url: string;
  merchant_id?: string;
  client_id?: string;
  client_secret?: string;
  mkey?: string;
  app_id?: string;
  test_app_id?: string;
  test_client_id?: string;
  test_client_secret?: string;
  test_mkey?: string;
  live_app_id?: string;
  live_client_id?: string;
  live_client_secret?: string;
  live_mkey?: string;
  mode?: 'test' | 'live';
  fee_percentage?: number;
  fixed_fee?: number;
  test_auth_url?: string;
  test_initiate_url?: string;
  test_status_url?: string;
  live_auth_url?: string;
  live_initiate_url?: string;
  live_status_url?: string;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

export interface SmsLog {
  id: string;
  recipient_phone: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  provider_response?: string;
  sent_at: string;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  body: string;
  target_role: 'all' | 'customer' | 'vendor';
  sent_by: string;
  created_at: string;
}
