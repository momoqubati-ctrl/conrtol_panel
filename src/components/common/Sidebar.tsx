import React, { useState } from 'react';
import { 
  ChevronDown, ChevronLeft
} from 'lucide-react';

export interface SidebarSubItem {
  id: string;
  label: string;
  badge?: number;
  icon?: React.ReactNode;
}

export interface SidebarTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  subItems?: SidebarSubItem[];
}

interface SidebarProps {
  tabs: SidebarTab[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  portalType: 'admin' | 'vendor';
}

export const Sidebar: React.FC<SidebarProps> = ({ tabs, activeTab, onSelectTab, portalType }) => {
  // Keep track of expanded sub-menus
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>(() => {
    // Automatically expand if activeTab is within a tab's subItems
    const initial: Record<string, boolean> = {};
    tabs.forEach(t => {
      if (t.subItems && (t.id === activeTab || t.subItems.some(s => s.id === activeTab))) {
        initial[t.id] = true;
      }
    });
    return initial;
  });

  const toggleExpand = (tabId: string) => {
    setExpandedTabs(prev => ({
      ...prev,
      [tabId]: !prev[tabId]
    }));
  };

  return (
    <aside className="w-full md:w-64 bg-slate-900 border-l border-slate-800 text-slate-200 shrink-0 flex flex-col justify-between">
      <div className="p-4">
        <div className="mb-4 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          {portalType === 'admin' ? 'قائمة الإدارة والتنفيذ' : 'لوحة عمليات التاجر'}
        </div>

        <nav className="space-y-1.5">
          {tabs.map((tab) => {
            const hasSubItems = Boolean(tab.subItems && tab.subItems.length > 0);
            const isSubActive = Boolean(hasSubItems && tab.subItems?.some(s => s.id === activeTab));
            const isActive = activeTab === tab.id || isSubActive;
            const isExpanded = expandedTabs[tab.id] ?? isSubActive;

            return (
              <div key={tab.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    if (hasSubItems) {
                      toggleExpand(tab.id);
                      if (!isExpanded && tab.subItems && tab.subItems.length > 0) {
                        onSelectTab(tab.subItems[0].id);
                      }
                    } else {
                      onSelectTab(tab.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isActive && !hasSubItems
                      ? portalType === 'admin'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30 font-semibold'
                        : 'bg-gradient-to-r from-amber-600 to-emerald-600 text-white shadow-lg shadow-emerald-900/30 font-semibold'
                      : isActive && hasSubItems
                      ? portalType === 'admin'
                        ? 'bg-slate-800/90 text-blue-400 border border-blue-800/40 font-semibold'
                        : 'bg-slate-800/90 text-amber-400 border border-amber-800/40 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? (portalType === 'admin' ? 'text-blue-400' : 'text-amber-400') : 'text-slate-400'}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {tab.badge && tab.badge > 0 ? (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white animate-pulse">
                        {tab.badge}
                      </span>
                    ) : null}

                    {hasSubItems && (
                      <span className="text-slate-400 transition-transform duration-200">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                      </span>
                    )}
                  </div>
                </button>

                {/* Sub Items Render */}
                {hasSubItems && isExpanded && (
                  <div className="mr-4 pr-3 border-r-2 border-slate-800 space-y-1 my-1">
                    {tab.subItems?.map((sub) => {
                      const isThisSubActive = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => onSelectTab(sub.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isThisSubActive
                              ? portalType === 'admin'
                                ? 'bg-blue-600 text-white shadow-md font-bold'
                                : 'bg-amber-600 text-white shadow-md font-bold'
                              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {sub.icon && <span>{sub.icon}</span>}
                            <span>{sub.label}</span>
                          </div>

                          {sub.badge && sub.badge > 0 ? (
                            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                              {sub.badge}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        <span>منصة شبكتي v2.6.0</span>
        <div className="text-[10px] text-slate-600 mt-1">مشفرة بالكامل - Supabase Sync</div>
      </div>
    </aside>
  );
};
