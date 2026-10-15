import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  colorTheme?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  colorTheme = 'blue',
}) => {
  const themeClasses = {
    blue: 'border-blue-800/50 bg-slate-900/90 text-blue-400',
    emerald: 'border-emerald-800/50 bg-slate-900/90 text-emerald-400',
    amber: 'border-amber-800/50 bg-slate-900/90 text-amber-400',
    rose: 'border-rose-800/50 bg-slate-900/90 text-rose-400',
    purple: 'border-purple-800/50 bg-slate-900/90 text-purple-400',
    cyan: 'border-cyan-800/50 bg-slate-900/90 text-cyan-400',
  }[colorTheme];

  return (
    <div className={`p-5 rounded-2xl border shadow-md relative overflow-hidden transition-all hover:scale-[1.01] ${themeClasses}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-100 font-mono dir-ltr">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-inner">
          {icon}
        </div>
      </div>
    </div>
  );
};
