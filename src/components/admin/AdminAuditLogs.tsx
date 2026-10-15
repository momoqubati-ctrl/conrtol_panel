import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DataTable, Column } from '../common/DataTable';
import { ShieldCheck, Activity, RefreshCw } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';

interface AuditLog {
  id: string;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
  status?: string;
}

const ACTION_LABELS: Record<string, string> = {
  DB_UPDATE_PAYMENTS: 'تحديث سجل دفعة',
  DB_INSERT_PAYMENTS: 'إنشاء معاملة دفع',
  DB_UPDATE_WALLETS: 'تحديث رصيد محفظة',
  DB_INSERT_WALLETS: 'إنشاء محفظة جديدة',
  ADMIN_RETRY_SETTLEMENT: 'إعادة محاولة تسوية',
  MERCHANT_ADD_CATEGORY: 'إضافة فئة باقات',
  CLIENT_BUY_CARD: 'شراء بطاقة',
  'bas-webhook': 'إشعار بوابة الدفع (Webhook)',
};

export const AdminAuditLogs: React.FC = () => {
  const { smsLogs } = useAuth();
  const [dbLogs, setDbLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSystemAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('view_admin_system_audit_logs')
        .select('log_id, log_timestamp, user_name, user_role, action_name, is_success, error_message, request_path, state_after')
        .order('log_timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to fetch system audit logs:', error);
        return;
      }

      if (data) {
        const mapped: AuditLog[] = data.map((row: any) => {
          let details = '';
          if (row.error_message) {
            details = `خطأ: ${row.error_message}`;
          } else if (row.state_after && row.state_after.amount !== undefined) {
            details = `معاملة بمبلغ ${row.state_after.amount} ${row.state_after.currency || 'YER'}${row.state_after.status ? ` - الحالة: ${row.state_after.status}` : ''}`;
          } else if (row.state_after && row.state_after.balance !== undefined) {
            details = `رصيد المحفظة: ${row.state_after.balance} ${row.state_after.currency || 'YER'}`;
          } else if (row.request_path) {
            details = `إجراء على جدول: ${row.request_path}`;
          } else {
            details = `عملية تدقيق نظامية (${row.action_name})`;
          }

          return {
            id: row.log_id,
            user_name: row.user_name || 'النظام المركزي',
            action: ACTION_LABELS[row.action_name] || row.action_name,
            details,
            created_at: row.log_timestamp,
            status: row.is_success ? 'success' : 'failed',
          };
        });
        setDbLogs(mapped);
      }
    } catch (err) {
      console.error('Error in fetchSystemAuditLogs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemAuditLogs();
  }, [fetchSystemAuditLogs]);

  // Combine real database audit logs with real SMS logs, sorted chronologically descending
  const combinedLogs: AuditLog[] = [
    ...dbLogs,
    ...smsLogs.map(s => ({
      id: s.id,
      user_name: 'نظام SMS التلقائي',
      action: 'إرسال رسالة SMS',
      details: `رسالة إلى ${s.recipient_phone}: ${s.message}`,
      created_at: s.sent_at,
      status: s.status,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const columns: Column<AuditLog>[] = [
    {
      header: 'المستخدم / المنفذ',
      accessor: (row) => (
        <div className="font-bold text-white text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span>{row.user_name}</span>
        </div>
      ),
    },
    {
      header: 'نوع الإجراء',
      accessor: (row) => (
        <span className="px-2.5 py-1 rounded-full bg-purple-950 border border-purple-800 text-purple-300 text-xs font-bold">
          {row.action}
        </span>
      ),
    },
    {
      header: 'التفاصيل',
      accessor: (row) => <span className="text-xs text-slate-300">{row.details}</span>,
    },
    {
      header: 'التوقيت',
      accessor: (row) => (
        <span className="text-xs text-slate-400 font-mono dir-ltr">
          {new Date(row.created_at).toLocaleString('ar-YE')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-900/40 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
            <span>سجل العمليات والتدقيق الحساس (System Audit Logs)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            مراقبة كافة التغييرات والعمليات الحساسة الصادرة عن المدراء والأنظمة الآلية عبر قاعدة البيانات.
          </p>
        </div>
        <button
          onClick={fetchSystemAuditLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-900/50 hover:bg-purple-800/60 border border-purple-700/50 rounded-xl text-purple-200 text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
          title="تحديث سجل التدقيق"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        data={combinedLogs}
        columns={columns}
        title="سجل التغييرات والتدقيق"
        searchPlaceholder="بحث في العمليات..."
        exportFilename="audit_logs"
      />
    </div>
  );
};
