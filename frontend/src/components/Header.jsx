import React from 'react';
import { Menu, RefreshCw, Bell } from 'lucide-react';

export default function Header({ 
  activeTab, 
  wsConnected, 
  pendingAlertsCount = 0, 
  onRefresh, 
  setMobileOpen,
  setActiveTab 
}) {
  const pageMeta = {
    overview: {
      title: 'Traffic Overview',
      subtitle: 'Monitor traffic conditions and incidents across your cameras'
    },
    live: {
      title: 'Live Monitoring',
      subtitle: 'Real-time video feed analysis with YOLOv8 vehicle detection and tracking'
    },
    analytics: {
      title: 'Traffic Analytics',
      subtitle: 'Understand traffic patterns, vehicle flow, and congestion over time'
    },
    incidents: {
      title: 'Incidents',
      subtitle: 'Real-time collision alerts, kinematic anomalies, and operator verification'
    },
    cameras: {
      title: 'Cameras',
      subtitle: 'Manage connected traffic cameras and processing sources'
    },
    reports: {
      title: 'Reports',
      subtitle: 'Generate and export traffic flow and incident history data'
    },
    settings: {
      title: 'Settings',
      subtitle: 'System parameters, detection models, and threshold configurations'
    }
  };

  const current = pageMeta[activeTab] || { title: 'Dashboard', subtitle: '' };

  return (
    <header className="h-16 px-4 md:px-8 border-b border-[#333333] bg-[#0A0A0A] sticky top-0 z-30 flex items-center justify-between">
      {/* Left: Mobile Menu & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 text-[#A3A3A3] hover:text-white hover:bg-[#1A1A1A] rounded-md transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white leading-tight">
              {current.title}
            </h2>
          </div>
          <p className="hidden sm:block text-xs text-[#A3A3A3] mt-0.5 truncate max-w-md">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Status, Refresh & Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* System Connection Badge */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md border border-[#333333] bg-[#171717] text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#4D8B67]' : 'bg-[#C49A42] animate-pulse'}`} />
          <span className="text-white font-medium">
            {wsConnected ? 'System Online' : 'Connecting'}
          </span>
        </div>

        {/* Refresh Action Button */}
        <button
          onClick={onRefresh}
          title="Refresh dashboard data"
          className="p-2 rounded-md border border-[#333333] bg-[#171717] text-[#D4D4D4] hover:text-white hover:bg-[#262626] transition-colors"
          aria-label="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Notifications Icon Button */}
        <button
          onClick={() => setActiveTab('incidents')}
          title="View active alerts"
          className="relative p-2 rounded-md border border-[#333333] bg-[#171717] text-[#D4D4D4] hover:text-white hover:bg-[#262626] transition-colors"
          aria-label="View incidents"
        >
          <Bell className="w-4 h-4" />
          {pendingAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-black text-[9px] font-bold flex items-center justify-center">
              {pendingAlertsCount}
            </span>
          )}
        </button>

        {/* Profile / Context Indicator */}
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[#333333]">
          <div className="w-7 h-7 rounded-full bg-[#1F1F1F] border border-[#333333] text-white flex items-center justify-center text-xs font-semibold">
            TC
          </div>
          <span className="text-xs font-medium text-[#D4D4D4]">Traffic Ops</span>
        </div>
      </div>
    </header>
  );
}
