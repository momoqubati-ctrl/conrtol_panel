import { getSupabase } from '../lib/supabase';
import { loggerService } from './loggerService';

function getClient() {
  return (window as any).getAuthenticatedSupabase
    ? (window as any).getAuthenticatedSupabase()
    : getSupabase();
}

export class AdminService {
  /**
   * Approve deposit request via RPC
   */
  static async approveDeposit(requestId: string, adminStatement?: string): Promise<boolean> {
    try {
      const supabase = getClient();
      const { error } = await supabase.rpc('approve_deposit_request', {
        p_request_id: requestId,
        p_admin_statement: adminStatement || 'تمت التغذية بواسطة مدير النظام',
      });

      if (error) throw error;
      loggerService.info('AdminService', 'Deposit approved via RPC', requestId);
      return true;
    } catch (err: any) {
      loggerService.error('AdminService', 'approveDeposit RPC failed', err.message);
      throw err;
    }
  }

  /**
   * Reject deposit request via RPC
   */
  static async rejectDeposit(requestId: string, rejectReason: string): Promise<boolean> {
    try {
      const supabase = getClient();
      const { error } = await supabase.rpc('reject_deposit_request', {
        p_request_id: requestId,
        p_reject_reason: rejectReason,
      });

      if (error) throw error;
      loggerService.info('AdminService', 'Deposit rejected via RPC', requestId);
      return true;
    } catch (err: any) {
      loggerService.error('AdminService', 'rejectDeposit RPC failed', err.message);
      throw err;
    }
  }

  /**
   * Approve withdrawal request via RPC
   */
  static async approveWithdrawal(requestId: string, receiptImageUrl?: string): Promise<boolean> {
    try {
      const supabase = getClient();
      const { error } = await supabase.rpc('approve_withdrawal_request', {
        p_request_id: requestId,
        p_receipt_image_url: receiptImageUrl || null,
      });

      if (error) throw error;
      loggerService.info('AdminService', 'Withdrawal approved via RPC', requestId);
      return true;
    } catch (err: any) {
      loggerService.error('AdminService', 'approveWithdrawal RPC failed', err.message);
      throw err;
    }
  }

  /**
   * Reject withdrawal request via RPC
   */
  static async rejectWithdrawal(requestId: string, rejectReason: string): Promise<boolean> {
    try {
      const supabase = getClient();
      const { error } = await supabase.rpc('reject_withdrawal_request', {
        p_request_id: requestId,
        p_reject_reason: rejectReason,
      });

      if (error) throw error;
      loggerService.info('AdminService', 'Withdrawal rejected via RPC', requestId);
      return true;
    } catch (err: any) {
      loggerService.error('AdminService', 'rejectWithdrawal RPC failed', err.message);
      throw err;
    }
  }

  /**
   * Approve or reject vendor application
   */
  static async updateVendorStatus(vendorId: string, status: 'approved' | 'rejected' | 'suspended'): Promise<boolean> {
    try {
      const supabase = getClient();
      const { error } = await supabase
        .from('vendors')
        .update({ status })
        .eq('id', vendorId);

      if (error) throw error;
      loggerService.info('AdminService', `Vendor status updated to ${status}`, vendorId);
      return true;
    } catch (err: any) {
      loggerService.error('AdminService', 'updateVendorStatus failed', err.message);
      throw err;
    }
  }

  /**
   * Update vendor commission rate (%)
   */
  static async updateVendorCommission(vendorId: string, commissionRate: number): Promise<boolean> {
    try {
      const supabase = getClient();
      const { error } = await supabase
        .from('vendors')
        .update({ commission_rate: commissionRate })
        .eq('id', vendorId);

      if (error) throw error;
      loggerService.info('AdminService', 'Vendor commission updated', { vendorId, commissionRate });
      return true;
    } catch (err: any) {
      loggerService.error('AdminService', 'updateVendorCommission failed', err.message);
      throw err;
    }
  }
}
