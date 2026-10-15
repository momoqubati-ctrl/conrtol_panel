import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

export type AlertType = 'success' | 'warning' | 'error' | 'info';

interface AlertPanelProps {
  type: AlertType;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ type, title, message, action }) => {
  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          titleColor: 'text-green-500',
          textColor: 'text-green-400'
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          titleColor: 'text-amber-500',
          textColor: 'text-amber-400'
        };
      case 'error':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          titleColor: 'text-red-500',
          textColor: 'text-red-400'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          icon: <Info className="w-5 h-5 text-blue-500" />,
          titleColor: 'text-blue-500',
          textColor: 'text-blue-400'
        };
    }
  };

  const styles = getAlertStyles();

  return (
    <div className={`flex items-start justify-between p-4 rounded-xl border ${styles.bg} ${styles.border}`}>
      <div className="flex gap-3">
        <div className="mt-0.5">{styles.icon}</div>
        <div>
          <h4 className={`font-semibold text-sm ${styles.titleColor}`}>{title}</h4>
          {message && <p className={`text-sm mt-1 ${styles.textColor}`}>{message}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
