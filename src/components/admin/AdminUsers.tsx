import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSupabase } from '../../lib/supabase';
import { DataTable, Column } from '../common/DataTable';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { 
  Users, 
  UserCheck, 
  KeyRound, 
  Search, 
  UserX, 
  ShieldCheck, 
  RefreshCw, 
  Eye, 
  UserPlus, 
  Phone, 
  Copy, 
  Check, 
  AlertTriangle,
  Store,
  Crown,
  Building2,
  Layers,
  Sparkles
} from 'lucide-react';
import { Profile, UserRole, AdminUserItem, VendorType } from '../../types';

export const AdminUsers: React.FC = () => {
  const { profiles: contextProfiles, wallets, getAuthenticatedSupabase } = useAuth();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'network_owner' | 'wholesale_merchant' | 'hybrid' | 'retailer' | 'customer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'SUSPENDED'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals state
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  
  // Action form states: Multi-Role / Multi-Capability
  const [selectedCapabilities, setSelectedCapabilities] = useState<{
    admin: boolean;
    network_owner: boolean;
    wholesale_merchant: boolean;
    retailer: boolean;
    customer: boolean;
  }>({
    admin: false,
    network_owner: false,
    wholesale_merchant: false,
    retailer: false,
    customer: true,
  });

  const [commercialDetails, setCommercialDetails] = useState<{
    business_name: string;
    wholesale_license: string;
    store_name: string;
  }>({
    business_name: '',
    wholesale_license: '',
    store_name: '',
  });

  const [newStatus, setNewNewStatus] = useState<string>('ACTIVE');
  const [newPassword, setNewPassword] = useState<string>('');
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New user form state
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'customer' as UserRole,
    password: '',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Fetch full profiles directly from Supabase with commercial vendor & retailer mapping
  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const supabase = getAuthenticatedSupabase ? getAuthenticatedSupabase() : getSupabase();
      const [profilesRes, vendorsRes, retailersRes] = await Promise.allSettled([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('vendors').select('id, business_name, vendor_type, status, wholesale_license_number'),
        supabase.from('retailers').select('id, store_name, retailer_code, status')
      ]);

      const profilesData = profilesRes.status === 'fulfilled' ? (profilesRes.value.data || []) : [];
      const vendorsData = vendorsRes.status === 'fulfilled' ? (vendorsRes.value.data || []) : [];
      const retailersData = retailersRes.status === 'fulfilled' ? (retailersRes.value.data || []) : [];

      if (profilesData.length > 0) {
        const mapped: AdminUserItem[] = profilesData.map((p: any) => {
          const userWallet = (wallets || []).find((w: any) => w.user_id === p.id);
          const v = vendorsData.find((x: any) => x.id === p.id);
          const r = retailersData.find((x: any) => x.id === p.id);

          const rawRole = (p.role || p.marketplace_role?.toLowerCase() || 'customer').toString().toLowerCase();
          const isAdmin = rawRole.includes('admin') || (p.marketplace_role || '').toUpperCase() === 'SUPER_ADMIN';
          
          // Wholesale merchant: verified via vendor_type in vendors table OR marketplace role
          const isWholesaleMerchant = v?.vendor_type === 'wholesale_merchant' || v?.vendor_type === 'hybrid' || rawRole === 'wholesale_merchant';
          
          // Network owner: owns networks in vendors table
          const isNetworkOwner = v?.vendor_type === 'network_owner' || v?.vendor_type === 'hybrid' || (rawRole === 'vendor' && !isWholesaleMerchant);
          
          // Retailer: physical POS shop
          const isRetailer = rawRole.includes('retailer') || (r && r.status !== 'suspended' && r.status !== 'rejected');
          
          const isCustomer = true; // Every user possesses base customer identity

          // Normalized primary role for backwards compatibility
          let normalizedRole: UserRole = 'customer';
          if (isAdmin) normalizedRole = 'admin';
          else if (isWholesaleMerchant && !isNetworkOwner) normalizedRole = 'wholesale_merchant';
          else if (isNetworkOwner || isWholesaleMerchant) normalizedRole = 'vendor';
          else if (isRetailer) normalizedRole = 'retailer';

          return {
            id: p.id,
            name: p.name || p.full_name || 'مستخدم شبكتي',
            phone: p.phone_number || p.phone || 'بدون رقم',
            email: p.email,
            role: normalizedRole,
            marketplace_role: p.marketplace_role,
            status: p.status || 'ACTIVE',
            avatar_url: p.avatar_url || p.profile_image_url,
            created_at: p.created_at,
            wallet_balance: userWallet ? Number(userWallet.balance) : 0,
            
            // Multi-role capabilities
            is_admin: isAdmin,
            is_network_owner: isNetworkOwner,
            is_wholesale_merchant: isWholesaleMerchant,
            is_retailer: isRetailer,
            is_customer: isCustomer,
            vendor_type: (v?.vendor_type as VendorType) || (isNetworkOwner && isWholesaleMerchant ? 'hybrid' : isWholesaleMerchant ? 'wholesale_merchant' : isNetworkOwner ? 'network_owner' : null),
            vendor_business_name: v?.business_name,
            wholesale_license_number: v?.wholesale_license_number,
            retailer_store_name: r?.store_name,
            retailer_code: r?.retailer_code,
            retailer_status: r?.status,
          };
        });
        setUsers(mapped);
      } else if (contextProfiles && contextProfiles.length > 0) {
        setUsers(contextProfiles.map(cp => ({
          ...cp,
          is_admin: cp.role === 'admin',
          is_network_owner: cp.role === 'vendor',
          is_wholesale_merchant: false,
          is_retailer: cp.role === 'retailer',
          is_customer: true,
        })));
      }
    } catch (err) {
      console.error('Failed to load profiles and commercial entities:', err);
      if (contextProfiles && contextProfiles.length > 0) {
        setUsers(contextProfiles.map(cp => ({
          ...cp,
          is_admin: cp.role === 'admin',
          is_network_owner: cp.role === 'vendor',
          is_wholesale_merchant: false,
          is_retailer: cp.role === 'retailer',
          is_customer: true,
        })));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [contextProfiles.length]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.is_admin).length;
    const networkOwners = users.filter(u => u.is_network_owner).length;
    const wholesaleMerchants = users.filter(u => u.is_wholesale_merchant).length;
    const hybridVendors = users.filter(u => u.is_network_owner && u.is_wholesale_merchant).length;
    const retailers = users.filter(u => u.is_retailer).length;
    const customersOnly = users.filter(u => !u.is_admin && !u.is_network_owner && !u.is_wholesale_merchant && !u.is_retailer).length;
    const active = users.filter(u => (u.status || 'ACTIVE') === 'ACTIVE').length;
    return { total, admins, networkOwners, wholesaleMerchants, hybridVendors, retailers, customersOnly, active };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'admin' && !user.is_admin) return false;
        if (roleFilter === 'network_owner' && !user.is_network_owner) return false;
        if (roleFilter === 'wholesale_merchant' && !user.is_wholesale_merchant) return false;
        if (roleFilter === 'hybrid' && !(user.is_network_owner && user.is_wholesale_merchant)) return false;
        if (roleFilter === 'retailer' && !user.is_retailer) return false;
        if (roleFilter === 'customer' && (user.is_admin || user.is_network_owner || user.is_wholesale_merchant || user.is_retailer)) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && (user.status || 'ACTIVE') !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = user.name?.toLowerCase().includes(q);
        const matchesPhone = user.phone?.toLowerCase().includes(q);
        const matchesEmail = user.email?.toLowerCase().includes(q);
        const matchesId = user.id?.toLowerCase().includes(q);
        const matchesBusiness = user.vendor_business_name?.toLowerCase().includes(q);
        const matchesStore = user.retailer_store_name?.toLowerCase().includes(q);
        const matchesCode = user.retailer_code?.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesEmail || matchesId || matchesBusiness || matchesStore || matchesCode;
      }

      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Open Multi-Role & Capabilities Modal
  const openRoleModal = (user: AdminUserItem) => {
    setSelectedUser(user);
    setSelectedCapabilities({
      admin: user.is_admin,
      network_owner: user.is_network_owner,
      wholesale_merchant: user.is_wholesale_merchant,
      retailer: user.is_retailer,
      customer: true,
    });
    setCommercialDetails({
      business_name: user.vendor_business_name || (user.name ? `منشأة ${user.name}` : ''),
      wholesale_license: user.wholesale_license_number || '',
      store_name: user.retailer_store_name || (user.name ? `متجر ${user.name}` : ''),
    });
    setShowRoleModal(true);
  };

  // Handle Multi-Role & Permissions Update
  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const supabase = getAuthenticatedSupabase ? getAuthenticatedSupabase() : getSupabase();
      
      // 1. Determine primary role in profiles table
      let primaryRole: UserRole = 'customer';
      let marketplaceRole = 'CUSTOMER';
      if (selectedCapabilities.admin) {
        primaryRole = 'admin';
        marketplaceRole = 'SUPER_ADMIN';
      } else if (selectedCapabilities.network_owner || selectedCapabilities.wholesale_merchant) {
        primaryRole = selectedCapabilities.wholesale_merchant && !selectedCapabilities.network_owner ? 'wholesale_merchant' : 'vendor';
        marketplaceRole = 'VENDOR';
      } else if (selectedCapabilities.retailer) {
        primaryRole = 'retailer';
        marketplaceRole = 'CUSTOMER';
      }


      // Ensure profile role matches PostgreSQL enum ('admin' | 'vendor' | 'retailer' | 'customer')
      const dbProfileRole = primaryRole === 'wholesale_merchant' ? 'vendor' : primaryRole;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          role: dbProfileRole,
          marketplace_role: marketplaceRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // 2. Commercial Wholesale & Network Vendor Management
      const needsWholesale = selectedCapabilities.wholesale_merchant;
      const needsNetworkOwner = selectedCapabilities.network_owner;
      const businessName = commercialDetails.business_name.trim() || selectedUser.name || 'منشأة معتمدة';
      const wholesaleLicense = commercialDetails.wholesale_license.trim() || null;

      if (needsWholesale) {
        // Call official database RPC: public.admin_grant_wholesale_merchant
        const { error: rpcErr } = await supabase.rpc('admin_grant_wholesale_merchant', {
          p_target_user_id: selectedUser.id,
          p_business_name: businessName,
          p_wholesale_license_number: wholesaleLicense
        });
        if (rpcErr) {
          console.warn('RPC admin_grant_wholesale_merchant notice:', rpcErr.message);
        }

        // Enforce vendor_type: 'hybrid' if both network owner and wholesale, or 'wholesale_merchant'
        const targetVendorType: VendorType = needsNetworkOwner ? 'hybrid' : 'wholesale_merchant';
        const { data: existingV } = await supabase
          .from('vendors')
          .select('id')
          .eq('id', selectedUser.id)
          .maybeSingle();

        if (existingV) {
          await supabase
            .from('vendors')
            .update({
              vendor_type: targetVendorType,
              business_name: businessName,
              wholesale_license_number: wholesaleLicense,
              status: 'approved',
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedUser.id);
        } else {
          await supabase
            .from('vendors')
            .insert({
              id: selectedUser.id,
              profile_id: selectedUser.id,
              business_name: businessName,
              vendor_type: targetVendorType,
              wholesale_license_number: wholesaleLicense,
              status: 'approved',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
      } else if (needsNetworkOwner) {
        // Network owner only (no wholesale)
        const { data: existingV } = await supabase
          .from('vendors')
          .select('id')
          .eq('id', selectedUser.id)
          .maybeSingle();

        if (existingV) {
          await supabase
            .from('vendors')
            .update({
              vendor_type: 'network_owner',
              business_name: businessName,
              status: 'approved',
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedUser.id);
        } else {
          await supabase
            .from('vendors')
            .insert({
              id: selectedUser.id,
              profile_id: selectedUser.id,
              business_name: businessName,
              vendor_type: 'network_owner',
              status: 'approved',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
      } else {
        // Neither network owner nor wholesale merchant: if vendor row exists, mark suspended
        await supabase
          .from('vendors')
          .update({
            status: 'suspended',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedUser.id);
      }

      // 3. Retailer POS Capability Management
      if (selectedCapabilities.retailer) {
        const storeName = commercialDetails.store_name.trim() || selectedUser.name || 'متجر تجزئة';
        const { data: existingR } = await supabase
          .from('retailers')
          .select('id')
          .eq('id', selectedUser.id)
          .maybeSingle();

        if (existingR) {
          await supabase
            .from('retailers')
            .update({
              store_name: storeName,
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedUser.id);
        } else {
          const retCode = `RET-${Math.floor(100000 + Math.random() * 900000)}`;
          await supabase
            .from('retailers')
            .insert({
              id: selectedUser.id,
              retailer_code: retCode,
              store_name: storeName,
              store_type: 'grocery',
              city: selectedUser.governorate || 'صنعاء',
              zone: 'المركز',
              contact_phone: selectedUser.phone || '000000000',
              status: 'active',
              idempotency_key: `RET-ADMIN-${selectedUser.id}-${Date.now()}`,
              ubtr: `UBTR-RET-${Date.now()}`
            });
        }

        // Initialize commercial entity for seamless workspace loading
        const { data: existingCe } = await supabase
          .from('commercial_entities')
          .select('id')
          .eq('user_id', selectedUser.id)
          .eq('entity_type', 'RETAILER')
          .maybeSingle();

        if (!existingCe) {
          const cleanId = selectedUser.id.replace(/-/g, '');
          const retEntityCode = `RET-${Math.floor(100000 + Math.random() * 900000)}`;
          const retUbtr = `UBTR-ENT-ret_${cleanId.substring(0, 20)}`;
          await supabase.from('commercial_entities').insert({
            user_id: selectedUser.id,
            entity_type: 'RETAILER',
            entity_code: retEntityCode,
            display_name: storeName,
            status: 'ACTIVE',
            ubtr: retUbtr,
            legacy_retailer_id: selectedUser.id,
          });
        }
      } else {

        // Retailer disabled: if retailer row exists, mark suspended
        await supabase
          .from('retailers')
          .update({
            status: 'suspended',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedUser.id);
      }


      // Notification summary
      const assignedRoles: string[] = [];
      if (selectedCapabilities.admin) assignedRoles.push('مدير نظام');
      if (selectedCapabilities.network_owner && selectedCapabilities.wholesale_merchant) {
        assignedRoles.push('تاجر هجين (شبكات + جملة الجملة)');
      } else {
        if (selectedCapabilities.network_owner) assignedRoles.push('تاجر شبكات');
        if (selectedCapabilities.wholesale_merchant) assignedRoles.push('تاجر جملة الجملة');
      }
      if (selectedCapabilities.retailer) assignedRoles.push('تاجر تجزئة');
      if (assignedRoles.length === 0) assignedRoles.push('مشترك / عميل');

      showToast(`تم حفظ وتحديث الصلاحيات للمستخدم ${selectedUser.name} بنجاح: [${assignedRoles.join(' + ')}]`);
      setShowRoleModal(false);
      await fetchProfiles();
    } catch (err: any) {
      console.error('Error updating user roles & capabilities:', err);
      showToast(err.message || 'فشل تحديث الصلاحيات. يرجى التحقق من صلاحياتك.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Status Update (Suspend / Activate)
  const handleUpdateStatus = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const supabase = getAuthenticatedSupabase ? getAuthenticatedSupabase() : getSupabase();
      const updatedStatus = newStatus;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: updatedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, status: updatedStatus } : u));
      showToast(`تم ${updatedStatus === 'SUSPENDED' ? 'تجميد' : 'تنشيط'} حساب المستخدم ${selectedUser.name} بنجاح.`);
      setShowStatusModal(false);
    } catch (err: any) {
      console.error('Error updating user status:', err);
      showToast(err.message || 'فشل تعديل حالة الحساب.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword.trim()) {
      showToast('يرجى إدخال كلمة المرور الجديدة', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('يجب أن لا تقل كلمة المرور عن 6 خانات', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const supabase = getAuthenticatedSupabase ? getAuthenticatedSupabase() : getSupabase();
      const { error } = await supabase.auth.admin.updateUserById(selectedUser.id, {
        password: newPassword
      });

      if (error) {
        throw error;
      }

      showToast(`تم تحديث كلمة المرور للمستخدم ${selectedUser.name} بنجاح.`);
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err: any) {
      console.error('Error resetting password:', err);
      showToast(err.message || 'فشل إعادة تعيين كلمة المرور.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add New User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.phone) {
      showToast('يرجى ملء الحقول الإلزامية (الاسم ورقم الهاتف)', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const supabase = getAuthenticatedSupabase ? getAuthenticatedSupabase() : getSupabase();

      const email = newUserForm.email.trim() || `${newUserForm.phone.replace(/[^0-9]/g, '')}@shabakati.local`;
      
      let mRole = 'CUSTOMER';
      let dbRole: UserRole = 'customer';
      if (newUserForm.role === 'admin') {
        mRole = 'SUPER_ADMIN';
        dbRole = 'admin';
      } else if (newUserForm.role === 'vendor' || newUserForm.role === 'wholesale_merchant') {
        mRole = 'VENDOR';
        dbRole = 'vendor';
      } else if (newUserForm.role === 'retailer') {
        mRole = 'CUSTOMER';
        dbRole = 'retailer';
      }


      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          name: newUserForm.name,
          phone_number: newUserForm.phone,
          email: email,
          role: dbRole,
          marketplace_role: mRole,
          status: 'ACTIVE',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      if (newProfile && newUserForm.role === 'wholesale_merchant') {
        await supabase.rpc('admin_grant_wholesale_merchant', {
          p_target_user_id: newProfile.id,
          p_business_name: newProfile.name,
          p_wholesale_license_number: null
        });
      } else if (newProfile && newUserForm.role === 'vendor') {
        await supabase.from('vendors').insert({
          id: newProfile.id,
          profile_id: newProfile.id,
          business_name: newProfile.name,
          vendor_type: 'network_owner',
          status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else if (newProfile && newUserForm.role === 'retailer') {
        await supabase.from('retailers').insert({
          id: newProfile.id,
          store_name: newProfile.name,
          store_type: 'grocery',
          city: 'صنعاء',
          zone: 'المركز',
          contact_phone: newProfile.phone_number || newUserForm.phone,
          status: 'active',
          idempotency_key: `RET-ADMIN-${newProfile.id}-${Date.now()}`,
          ubtr: `UBTR-RET-${Date.now()}`
        });
      }

      showToast(`تم إنشاء حساب جديد بنجاح: ${newUserForm.name}`);
      setShowAddUserModal(false);
      setNewUserForm({ name: '', phone: '', email: '', role: 'customer', password: '' });
      fetchProfiles();
    } catch (err: any) {
      console.error('Error creating user:', err);
      showToast(err.message || 'فشل إنشاء المستخدم. قد يكون رقم الهاتف مسجلاً بالفعل.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const columns: Column<AdminUserItem>[] = [
    {
      header: 'المستخدم / الهاتف',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0">
            {row.name ? row.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="font-bold text-white text-sm hover:text-purple-300 transition-colors cursor-pointer" onClick={() => { setSelectedUser(row); setShowDetailsModal(true); }}>
              {row.name}
            </div>
            <div className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5" dir="ltr">
              <Phone className="w-3 h-3 text-slate-500" />
              <span>{row.phone}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'الأدوار والصلاحيات في النظام',
      accessor: (row) => (
        <div className="flex flex-wrap items-center gap-1.5 max-w-[340px]">
          {row.is_admin && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold border bg-purple-950/90 border-purple-800 text-purple-300 inline-flex items-center gap-1">
              <Crown className="w-3 h-3 text-purple-400" />
              <span>مدير نظام</span>
            </span>
          )}
          {row.is_network_owner && row.is_wholesale_merchant ? (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold border bg-gradient-to-r from-amber-950/80 to-indigo-950/80 border-amber-600/70 text-amber-200 inline-flex items-center gap-1" title="تاجر هجين: يجمع بين شبكات الواي فاي وتوزيع الجملة">
              <Layers className="w-3 h-3 text-amber-400" />
              <span>تاجر هجين (شبكات + جملة)</span>
            </span>
          ) : (
            <>
              {row.is_network_owner && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold border bg-amber-950/90 border-amber-800 text-amber-300 inline-flex items-center gap-1">
                  <Store className="w-3 h-3 text-amber-400" />
                  <span>تاجر شبكات</span>
                </span>
              )}
              {row.is_wholesale_merchant && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold border bg-indigo-950/90 border-indigo-800 text-indigo-300 inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-indigo-400" />
                  <span>تاجر جملة الجملة</span>
                </span>
              )}
            </>
          )}
          {row.is_retailer && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold border bg-cyan-950/90 border-cyan-800 text-cyan-300 inline-flex items-center gap-1">
              <Store className="w-3 h-3 text-cyan-400" />
              <span>تاجر تجزئة / POS</span>
            </span>
          )}
          {!row.is_admin && !row.is_network_owner && !row.is_wholesale_merchant && !row.is_retailer && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold border bg-slate-800 border-slate-700 text-slate-300 inline-flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              <span>مشترك / عميل</span>
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'الحالة',
      accessor: (row) => {
        const isSuspended = (row.status || '').toUpperCase() === 'SUSPENDED' || (row.status || '').toUpperCase() === 'BLOCKED';
        return (
          <StatusBadge 
            status={isSuspended ? 'rejected' : 'approved'} 
            customLabel={isSuspended ? 'مجمد / موقوف' : 'معتمد / نشط'} 
          />
        );
      },
    },
    {
      header: 'رصيد المحفظة',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/40">
          {(row.wallet_balance ?? 0).toLocaleString()} ر.ي
        </span>
      ),
    },
    {
      header: 'تاريخ الانضمام',
      accessor: (row) => (
        <span className="text-xs text-slate-400 font-mono">
          {row.created_at ? new Date(row.created_at).toLocaleDateString('ar-YE') : 'مسبق'}
        </span>
      ),
    },
    {
      header: 'الإجراءات',
      accessor: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setSelectedUser(row);
              setShowDetailsModal(true);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="عرض تفاصيل الحساب الكاملة"
          >
            <Eye className="w-4 h-4 text-blue-400" />
          </button>

          <button
            onClick={() => openRoleModal(row)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-900/40 text-slate-300 hover:text-purple-300 transition-colors cursor-pointer"
            title="تعديل الدور والصلاحيات المتعددة"
          >
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </button>

          <button
            onClick={() => {
              setSelectedUser(row);
              setNewNewStatus((row.status || 'ACTIVE') === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
              setShowStatusModal(true);
            }}
            className={`p-1.5 rounded-lg bg-slate-800 transition-colors cursor-pointer ${
              (row.status || 'ACTIVE') === 'ACTIVE' 
                ? 'hover:bg-red-950/60 text-slate-300 hover:text-red-400' 
                : 'hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-400'
            }`}
            title={(row.status || 'ACTIVE') === 'ACTIVE' ? 'تجميد / إيقاف الحساب' : 'إلغاء التجميد وتنشيط الحساب'}
          >
            {(row.status || 'ACTIVE') === 'ACTIVE' ? (
              <UserX className="w-4 h-4 text-rose-400" />
            ) : (
              <UserCheck className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          <button
            onClick={() => {
              setSelectedUser(row);
              setNewPassword('');
              setShowPasswordModal(true);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-950/40 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
            title="إعادة تعيين كلمة المرور"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border font-bold text-sm animate-fadeIn ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-900 border-emerald-600 text-white' 
            : 'bg-rose-900 border-rose-600 text-white'
        }`}>
          {toastMessage.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-900/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            <span>إدارة مستخدمي النظام والصلاحيات المتعددة (Admin Users)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            التحكم الشامل في حسابات المنصة، وإسناد الصلاحيات المتعددة (مدراء، أصحاب شبكات، تجار جملة الجملة، تجار تجزئة).
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={fetchProfiles}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="تحديث قائمة المستخدمين"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ إضافة حساب جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-slate-400 text-[11px] font-semibold">إجمالي الحسابات</div>
            <div className="text-lg font-extrabold text-white mt-1">{stats.total}</div>
          </div>
          <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-900/50 text-blue-400">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-slate-400 text-[11px] font-semibold">مدراء النظام</div>
            <div className="text-lg font-extrabold text-purple-300 mt-1">{stats.admins}</div>
          </div>
          <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-900/50 text-purple-400">
            <Crown className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-slate-400 text-[11px] font-semibold">أصحاب الشبكات</div>
            <div className="text-lg font-extrabold text-amber-300 mt-1">{stats.networkOwners}</div>
          </div>
          <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-900/50 text-amber-400">
            <Store className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-slate-400 text-[11px] font-semibold">تجار جملة الجملة</div>
            <div className="text-lg font-extrabold text-indigo-300 mt-1">{stats.wholesaleMerchants}</div>
          </div>
          <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-900/50 text-indigo-400">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-slate-400 text-[11px] font-semibold">تجار التجزئة / POS</div>
            <div className="text-lg font-extrabold text-cyan-300 mt-1">{stats.retailers}</div>
          </div>
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-900/50 text-cyan-400">
            <Store className="w-4 h-4 text-cyan-400" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-slate-400 text-[11px] font-semibold">المشتركون (العملاء)</div>
            <div className="text-lg font-extrabold text-emerald-300 mt-1">{stats.customersOnly}</div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-900/50 text-emerald-400">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Role Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              roleFilter === 'all' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل ({stats.total})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              roleFilter === 'admin' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            المدراء ({stats.admins})
          </button>
          <button
            onClick={() => setRoleFilter('network_owner')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              roleFilter === 'network_owner' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            أصحاب الشبكات ({stats.networkOwners})
          </button>
          <button
            onClick={() => setRoleFilter('wholesale_merchant')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              roleFilter === 'wholesale_merchant' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            تجار الجملة ({stats.wholesaleMerchants})
          </button>
          <button
            onClick={() => setRoleFilter('hybrid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              roleFilter === 'hybrid' ? 'bg-gradient-to-r from-amber-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            تاجر هجين ({stats.hybridVendors})
          </button>
          <button
            onClick={() => setRoleFilter('retailer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              roleFilter === 'retailer' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            تجار التجزئة ({stats.retailers})
          </button>
          <button
            onClick={() => setRoleFilter('customer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              roleFilter === 'customer' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            العملاء ({stats.customersOnly})
          </button>
        </div>

        {/* Status and Search */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-hidden focus:border-purple-500"
          >
            <option value="all">كل الحالات</option>
            <option value="ACTIVE">النشطة فقط</option>
            <option value="SUSPENDED">المجمدة / الموقوفة</option>
          </select>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف أو المتجر..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Main Users Table */}
      <DataTable
        data={filteredUsers}
        columns={columns}
        keyExtractor={(row) => row.id}
        searchPlaceholder="بحث فوري في القائمة..."
        emptyMessage={loading ? 'جاري تحميل سجلات المستخدمين...' : 'لم يتم العثور على أي مستخدمين يطابقون معايير البحث.'}
      />

      {/* 1. Modal: View User Details */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="تفاصيل الملف الشخصي والصلاحيات"
      >
        {selectedUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/70 border border-slate-700">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xl font-extrabold shadow-md">
                {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1">
                <h4 className="text-base font-extrabold text-white">{selectedUser.name}</h4>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {selectedUser.is_admin && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold border bg-purple-950/90 border-purple-800 text-purple-300 flex items-center gap-1">
                      <Crown className="w-3 h-3 text-purple-400" /> مدير نظام
                    </span>
                  )}
                  {selectedUser.is_network_owner && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold border bg-amber-950/90 border-amber-800 text-amber-300 flex items-center gap-1">
                      <Store className="w-3 h-3 text-amber-400" /> تاجر شبكات
                    </span>
                  )}
                  {selectedUser.is_wholesale_merchant && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold border bg-indigo-950/90 border-indigo-800 text-indigo-300 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-indigo-400" /> تاجر جملة الجملة
                    </span>
                  )}
                  {selectedUser.is_retailer && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold border bg-cyan-950/90 border-cyan-800 text-cyan-300 flex items-center gap-1">
                      <Store className="w-3 h-3 text-cyan-400" /> تاجر تجزئة
                    </span>
                  )}
                  <StatusBadge 
                    status={(selectedUser.status || '').toUpperCase() === 'SUSPENDED' ? 'rejected' : 'approved'} 
                    customLabel={(selectedUser.status || '').toUpperCase() === 'SUSPENDED' ? 'مجمد / موقوف' : 'معتمد / نشط'} 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">معرّف الحساب (User ID)</span>
                <div className="flex items-center justify-between font-mono text-slate-200">
                  <span className="truncate max-w-[200px]">{selectedUser.id}</span>
                  <button 
                    onClick={() => copyToClipboard(selectedUser.id)}
                    className="p-1 hover:text-purple-400 text-slate-400 cursor-pointer"
                    title="نسخ المعرف"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">رقم الهاتف</span>
                <span className="font-mono text-white text-sm" dir="ltr">{selectedUser.phone}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">البريد الإلكتروني</span>
                <span className="text-slate-200 font-mono">{selectedUser.email || 'غير مسجل'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">رصيد المحفظة المالية</span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {(selectedUser.wallet_balance ?? 0).toLocaleString()} ريال يمني
                </span>
              </div>

              {selectedUser.vendor_business_name && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">اسم المنشأة التجارية</span>
                  <span className="text-white font-bold">{selectedUser.vendor_business_name}</span>
                </div>
              )}

              {selectedUser.wholesale_license_number && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">رقم ترخيص الجملة</span>
                  <span className="text-indigo-300 font-mono font-bold" dir="ltr">{selectedUser.wholesale_license_number}</span>
                </div>
              )}

              {selectedUser.retailer_store_name && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">اسم متجر التجزئة</span>
                  <span className="text-cyan-300 font-bold">{selectedUser.retailer_store_name}</span>
                </div>
              )}

              {selectedUser.retailer_code && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">كود التجزئة الفريد</span>
                  <span className="text-cyan-400 font-mono font-bold" dir="ltr">{selectedUser.retailer_code}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 sm:col-span-2">
                <span className="text-slate-400 block mb-1">تاريخ إنشاء الحساب</span>
                <span className="text-slate-300">
                  {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString('ar-YE') : 'غير محدد'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 2. Modal: Edit User Role & Multi-Capabilities */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title="تعديل الدور والصلاحيات المتعددة"
      >
        {selectedUser && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px]">المستخدم المحدد:</span>
                <span className="text-white font-bold text-sm">{selectedUser.name}</span>
                <span className="text-slate-500 font-mono text-xs mr-2" dir="ltr">({selectedUser.phone})</span>
              </div>
              <div className="text-left">
                <span className="text-slate-400 block text-[11px]">الرصيد:</span>
                <span className="font-mono text-emerald-400 font-bold text-xs">{(selectedUser.wallet_balance ?? 0).toLocaleString()} ر.ي</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-bold text-xs">
                  تحديد الصلاحيات والأدوار الممنوحة (يمكن اختيار أكثر من صفة في نفس الوقت):
                </label>
                <span className="text-[11px] text-purple-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تعدد الأدوار مفعّل</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. System Admin */}
                <div
                  onClick={() => setSelectedCapabilities(prev => ({ ...prev, admin: !prev.admin }))}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    selectedCapabilities.admin 
                      ? 'bg-purple-950/80 border-purple-500 text-white shadow-md shadow-purple-950/50' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border mt-0.5 shrink-0 ${
                    selectedCapabilities.admin ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-700 bg-slate-900'
                  }`}>
                    {selectedCapabilities.admin && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-purple-300 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5" />
                      <span>مدير نظام (Admin)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">كامل صلاحيات لوحة التحكم والرقابة والعمليات المالية والعمولات.</div>
                  </div>
                </div>

                {/* 2. Network Vendor */}
                <div
                  onClick={() => setSelectedCapabilities(prev => ({ ...prev, network_owner: !prev.network_owner }))}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    selectedCapabilities.network_owner 
                      ? 'bg-amber-950/80 border-amber-500 text-white shadow-md shadow-amber-950/50' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border mt-0.5 shrink-0 ${
                    selectedCapabilities.network_owner ? 'bg-amber-600 border-amber-500 text-white' : 'border-slate-700 bg-slate-900'
                  }`}>
                    {selectedCapabilities.network_owner && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" />
                      <span>تاجر شبكات معتمد (Network Owner)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">إدارة وبث شبكات الواي فاي وتوليد كروت الشبكة وسحب الأرباح.</div>
                  </div>
                </div>

                {/* 3. Wholesale Merchant */}
                <div
                  onClick={() => setSelectedCapabilities(prev => ({ ...prev, wholesale_merchant: !prev.wholesale_merchant }))}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    selectedCapabilities.wholesale_merchant 
                      ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md shadow-indigo-950/50' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border mt-0.5 shrink-0 ${
                    selectedCapabilities.wholesale_merchant ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900'
                  }`}>
                    {selectedCapabilities.wholesale_merchant && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-indigo-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>تاجر جملة الجملة (Wholesale Merchant)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">شراء كروت بالجملة من أصحاب الشبكات وإعادة توزيعها وتوريدها لتجار التجزئة.</div>
                  </div>
                </div>

                {/* 4. Retailer POS */}
                <div
                  onClick={() => setSelectedCapabilities(prev => ({ ...prev, retailer: !prev.retailer }))}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    selectedCapabilities.retailer 
                      ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md shadow-cyan-950/50' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border mt-0.5 shrink-0 ${
                    selectedCapabilities.retailer ? 'bg-cyan-600 border-cyan-500 text-white' : 'border-slate-700 bg-slate-900'
                  }`}>
                    {selectedCapabilities.retailer && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-cyan-300 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-cyan-400" />
                      <span>تاجر تجزئة / بقالة (Retailer POS)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">شراء الكروت وتوزيعها على المشتركين عبر نقاط البيع المباشرة والـ SMS.</div>
                  </div>
                </div>

                {/* 5. Base Customer */}
                <div
                  className="p-3 rounded-xl border bg-slate-900/60 border-slate-800 text-slate-400 sm:col-span-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-200">مشترك / عميل أساسي (Customer Base)</span>
                      <span className="text-[11px] text-slate-500 block">الهوية الأساسية لكل مستخدم لشراء واستعراض الكروت واستخدام المحفظة (مفعلة تلقائياً).</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">أساسي</span>
                </div>
              </div>
            </div>

            {/* Hybrid Callout */}
            {selectedCapabilities.network_owner && selectedCapabilities.wholesale_merchant && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/60 via-purple-950/60 to-indigo-950/60 border border-amber-600/50 text-amber-200 flex items-start gap-2.5">
                <Layers className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="text-[11px]">
                  <strong className="text-amber-300 block text-xs">⚡ صفة التاجر الهجين (Hybrid Vendor) مفعلة:</strong>
                  المستخدم سيحصل على صفة مزدوجة تمكنه من امتلاك شبكات الواي فاي وتوريد حصص الكروت بالجملة لتجار التجزئة في آن واحد.
                </div>
              </div>
            )}

            {/* Commercial Details inputs if vendor or wholesale or retailer */}
            {(selectedCapabilities.network_owner || selectedCapabilities.wholesale_merchant || selectedCapabilities.retailer) && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-purple-400" />
                  <span>البيانات والكيانات التجارية المرفقة:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(selectedCapabilities.network_owner || selectedCapabilities.wholesale_merchant) && (
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1 font-bold">اسم المنشأة التجارية / الكيان</label>
                      <input
                        type="text"
                        value={commercialDetails.business_name}
                        onChange={(e) => setCommercialDetails({ ...commercialDetails, business_name: e.target.value })}
                        placeholder="مثال: منشأة الأمانة لتوزيع الكروت"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-purple-500"
                      />
                    </div>
                  )}

                  {selectedCapabilities.wholesale_merchant && (
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1 font-bold">رقم ترخيص / رخصة الجملة (اختياري)</label>
                      <input
                        type="text"
                        value={commercialDetails.wholesale_license}
                        onChange={(e) => setCommercialDetails({ ...commercialDetails, wholesale_license: e.target.value })}
                        placeholder="مثال: WL-SANAA-2026-09"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                        dir="ltr"
                      />
                    </div>
                  )}

                  {selectedCapabilities.retailer && (
                    <div className={selectedCapabilities.network_owner || selectedCapabilities.wholesale_merchant ? 'sm:col-span-2' : 'sm:col-span-2'}>
                      <label className="block text-slate-400 text-[11px] mb-1 font-bold">اسم متجر التجزئة / نقطة البيع</label>
                      <input
                        type="text"
                        value={commercialDetails.store_name}
                        onChange={(e) => setCommercialDetails({ ...commercialDetails, store_name: e.target.value })}
                        placeholder="مثال: سوبرماركت البركة"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warning if admin */}
            {selectedCapabilities.admin && (
              <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 text-purple-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-[11px]">صلاحية مدير النظام تمنح هذا الحساب حق الوصول الكامل إلى لوحة التحكم والعمليات المصرفية والمالية.</span>
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition-colors cursor-pointer text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs shadow-lg shadow-purple-900/30"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>حفظ وتطبيق الصلاحيات</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 3. Modal: Suspend / Activate Account */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={newStatus === 'SUSPENDED' ? 'تجميد / إيقاف حساب مستخدم' : 'إلغاء التجميد وتنشيط الحساب'}
      >
        {selectedUser && (
          <div className="space-y-4 text-xs">
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              newStatus === 'SUSPENDED' 
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' 
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
            }`}>
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm mb-1">
                  {newStatus === 'SUSPENDED' ? 'تأكيد تجميد الحساب' : 'تأكيد تنشيط الحساب'}
                </div>
                <p>
                  {newStatus === 'SUSPENDED' 
                    ? `هل أنت متأكد من رغبتك في تجميد حساب المستخدم (${selectedUser.name})؟ لن يتمكن من تسجيل الدخول أو تنفيذ أي عمليات شراء أو سحب أرباح حتى يتم فك التجميد.`
                    : `هل أنت متأكد من رغبتك في إعادة تنشيط حساب المستخدم (${selectedUser.name})؟ سيتمكن من تسجيل الدخول واستئناف جميع عملياته بشكل طبيعي.`}
                </p>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={actionLoading}
                className={`px-5 py-2 rounded-xl text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  newStatus === 'SUSPENDED' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{newStatus === 'SUSPENDED' ? 'تأكيد التجميد' : 'تأكيد التنشيط'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 4. Modal: Reset User Password */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="إعادة تعيين كلمة مرور المستخدم"
      >
        {selectedUser && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              تعيين كلمة مرور جديدة للمستخدم <strong className="text-white">{selectedUser.name}</strong> ({selectedUser.phone}).
            </p>

            <div>
              <label className="block text-slate-400 font-bold mb-1">كلمة المرور الجديدة:</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل 6 خانات على الأقل..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleResetPassword}
                disabled={actionLoading || !newPassword.trim()}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>حفظ كلمة المرور</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 5. Modal: Add New User / Admin */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="إضافة حساب مستخدم جديد"
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 font-bold mb-1">الاسم الكامل *</label>
            <input
              type="text"
              required
              value={newUserForm.name}
              onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
              placeholder="مثال: أحمد محمد علي"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">رقم الهاتف *</label>
            <input
              type="tel"
              required
              value={newUserForm.phone}
              onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
              placeholder="770000000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500 font-mono"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">البريد الإلكتروني (اختياري)</label>
            <input
              type="email"
              value={newUserForm.email}
              onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              placeholder="user@shabakati.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500 font-mono"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">الدور في النظام *</label>
            <select
              value={newUserForm.role}
              onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
            >
              <option value="customer">مشترك / عميل عادي</option>
              <option value="vendor">تاجر شبكات معتمد (صاحب شبكة)</option>
              <option value="wholesale_merchant">تاجر جملة الجملة (Wholesale Merchant)</option>
              <option value="retailer">تاجر تجزئة / بقالة (نقطة بيع)</option>
              <option value="admin">مدير نظام (Admin)</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddUserModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>إنشاء الحساب</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
