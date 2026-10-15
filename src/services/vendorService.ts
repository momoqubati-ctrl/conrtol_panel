import { getSupabase } from '../lib/supabase';
import { Network, CardCategory, CardItem, VendorLine, WithdrawalRequest } from '../types';
import { loggerService } from './loggerService';

function getClient() {
  return (window as any).getAuthenticatedSupabase
    ? (window as any).getAuthenticatedSupabase()
    : getSupabase();
}

export class VendorService {
  /**
   * Fetch vendor lines
   */
  static async getVendorLines(vendorId: string): Promise<VendorLine[]> {
    try {
      const supabase = getClient();
      const { data, error } = await supabase
        .from('vendor_lines')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as VendorLine[];
    } catch (err: any) {
      loggerService.error('VendorService', 'getVendorLines failed', err.message);
      return [];
    }
  }

  /**
   * Add new vendor line
   */
  static async addVendorLine(vendorId: string, lineNumber: string, note?: string): Promise<VendorLine> {
    try {
      const supabase = getClient();
      const { data, error } = await supabase
        .from('vendor_lines')
        .insert({
          vendor_id: vendorId,
          line_number: lineNumber.trim(),
          note: note ? note.trim() : null,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      loggerService.info('VendorService', 'Line added successfully', lineNumber);
      return data as VendorLine;
    } catch (err: any) {
      loggerService.error('VendorService', 'addVendorLine failed', err.message);
      throw err;
    }
  }

  /**
   * Delete vendor line
   */
  static async deleteVendorLine(lineId: string): Promise<boolean> {
    try {
      const supabase = getClient();
      const { error } = await supabase
        .from('vendor_lines')
        .delete()
        .eq('id', lineId);

      if (error) throw error;
      loggerService.info('VendorService', 'Line deleted successfully', lineId);
      return true;
    } catch (err: any) {
      loggerService.error('VendorService', 'deleteVendorLine failed', err.message);
      throw err;
    }
  }

  /**
   * Add network
   */
  static async addNetwork(net: Omit<Network, 'id' | 'sales_count' | 'rating' | 'created_at'>): Promise<Network> {
    try {
      const supabase = getClient();
      const payload: any = {
        vendor_id: net.vendor_id,
        name: net.name,
        description: net.description,
        province: net.governorate,
        district: net.district,
        street: net.street,
        sub_ssids: net.ssids || [],
        latitude: net.latitude,
        longitude: net.longitude,
        radius_meters: net.radius_meters || 100,
        logo_url: net.logo_url,
      };

      const { data, error } = await supabase
        .from('networks')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      loggerService.info('VendorService', 'Network added', net.name);
      return data as Network;
    } catch (err: any) {
      loggerService.error('VendorService', 'addNetwork failed', err.message);
      throw err;
    }
  }

  /**
   * Update network
   */
  static async updateNetwork(id: string, updates: Partial<Network>): Promise<boolean> {
    try {
      const supabase = getClient();
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.governorate !== undefined) payload.province = updates.governorate;
      if (updates.district !== undefined) payload.district = updates.district;
      if (updates.street !== undefined) payload.street = updates.street;
      if (updates.ssids !== undefined) payload.sub_ssids = updates.ssids;
      if (updates.latitude !== undefined) payload.latitude = updates.latitude;
      if (updates.longitude !== undefined) payload.longitude = updates.longitude;
      if (updates.radius_meters !== undefined) payload.radius_meters = updates.radius_meters;
      if (updates.logo_url !== undefined) payload.logo_url = updates.logo_url;

      const { error } = await supabase
        .from('networks')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      loggerService.info('VendorService', 'Network updated', id);
      return true;
    } catch (err: any) {
      loggerService.error('VendorService', 'updateNetwork failed', err.message);
      throw err;
    }
  }

  /**
   * Delete network
   */
  static async deleteNetwork(id: string): Promise<boolean> {
    try {
      const supabase = getClient();
      const { error } = await supabase.from('networks').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      loggerService.error('VendorService', 'deleteNetwork failed', err.message);
      throw err;
    }
  }

  /**
   * Request withdrawal via RPC
   */
  static async requestWithdrawal(params: {
    vendor_id: string;
    amount: number;
    account_number: string;
    account_name: string;
    method_id?: string;
  }): Promise<string> {
    try {
      const supabase = getClient();
      const { data, error } = await supabase.rpc('create_withdrawal_request', {
        p_vendor_id: params.vendor_id,
        p_amount: params.amount,
        p_account_number: params.account_number,
        p_account_name: params.account_name,
      });

      if (error) throw error;
      loggerService.info('VendorService', 'Withdrawal request created via RPC', data);
      return data as string;
    } catch (err: any) {
      loggerService.error('VendorService', 'requestWithdrawal RPC failed', err.message);
      throw err;
    }
  }
}
