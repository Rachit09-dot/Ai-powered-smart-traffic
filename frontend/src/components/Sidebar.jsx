import React from 'react';
import { 
  LayoutDashboard, 
  Video, 
  BarChart3, 
  AlertTriangle, 
  Camera, 
  FileText, 
  Settings,
  X
} from 'lucide-react';
import TrafficLogo from './Logo';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  pendingAlertsCount = 0, 
  mobileOpen = false, 
  setMobileOpen = () => {} 
}) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'live', label: 'Live Monitoring', icon: Video },
    { id: 'analytics', label: 'Traffic Analytics', icon: BarChart3 },
    { 
      id: 'incidents', 
      label: 'Incidents', 
      icon: AlertTriangle,
      badge: pendingAlertsCount > 0 ? pendingAlertsCount : null 
    },
    { id: 'cameras', label: 'Cameras', icon: Camera },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-[230px] bg-[#0A0A0A] border-r border-[#333333] flex flex-col justify-between
        transition-transform duration-200 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo and Brand */}
          <div className="h-16 px-4 border-b border-[#333333] flex items-center justify-between">
            <TrafficLogo />

            {/* Mobile close button */}
            <button 
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 text-[#A3A3A3] hover:text-white rounded"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors text-left
                    ${isActive 
                      ? 'bg-[#262626] text-white font-semibold' 
                      : 'text-[#A3A3A3] hover:text-white hover:bg-[#1A1A1A]'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#A3A3A3]'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-white text-black">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer info */}
        <div className="p-3.5 border-t border-[#333333] bg-[#0A0A0A]">
          <div className="flex items-center justify-between text-[11px] text-[#A3A3A3]">
            <span className="font-mono">v1.0.4 • Academic</span>
            <span className="flex items-center gap-1.5 font-medium text-[#D4D4D4]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4D8B67]" />
              Active
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
