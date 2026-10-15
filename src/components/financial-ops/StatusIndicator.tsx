import React from 'react';

interface StatusIndicatorProps {
  status: 'healthy' | 'warning' | 'critical' | 'shadow' | 'enforced' | 'off';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, label, size = 'md' }) => {
  const getStyles = () => {
    switch (status) {
      case 'healthy':
      case 'enforced':
        return { bg: 'bg-green-500/20', text: 'text-green-500', dot: 'bg-green-500' };
      case 'shadow':
      case 'warning':
        return { bg: 'bg-amber-500/20', text: 'text-amber-500', dot: 'bg-amber-500' };
      case 'critical':
      case 'off':
        return { bg: 'bg-red-500/20', text: 'text-red-500', dot: 'bg-red-500' };
    }
  };

  const styles = getStyles();
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  const py = size === 'sm' ? 'py-0.5' : size === 'lg' ? 'py-1.5' : 'py-1';

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 ${py} rounded-full border border-current ${styles.text} ${styles.bg}`}>
      <span className={`w-2 h-2 rounded-full ${styles.dot} ${status === 'healthy' || status === 'shadow' ? 'animate-pulse' : ''}`} />
      <span className={`font-semibold uppercase tracking-wider ${textSize}`}>
        {label || status}
      </span>
    </div>
  );
};
