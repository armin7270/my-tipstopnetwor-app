import React from 'react';
import { Activity, Server, GitBranch, Terminal, Settings } from 'lucide-react';
import { TRANSLATIONS } from '../utils/network-core.ts';

interface MobileBottomNavProps {
  activeTab: 'hud' | 'nodes' | 'matrix' | 'diagnostics' | 'settings';
  setActiveTab: (tab: 'hud' | 'nodes' | 'matrix' | 'diagnostics' | 'settings') => void;
  language: 'en' | 'fa';
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  language,
}) => {
  const t = TRANSLATIONS[language];

  const items = [
    { id: 'hud' as const, label: 'HUD', icon: Activity },
    { id: 'nodes' as const, label: 'Nodes', icon: Server },
    { id: 'matrix' as const, label: 'Matrix', icon: GitBranch },
    { id: 'diagnostics' as const, label: 'Logs', icon: Terminal },
    { id: 'settings' as const, label: 'Config', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 liquid-glass border-t border-white/10 px-2 py-2 pb-safe backdrop-blur-2xl">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-white/10 text-[#00f2fe]'
                  : 'text-[#849495] hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#00f2fe]' : ''}`} />
              <span className="text-[10px] font-mono mt-1 font-medium whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
