import React, { useState, useEffect } from 'react';
import { 
  Activity, Video, Gauge, AlertTriangle, 
  BarChart3, Camera, Radio, ShieldCheck, RefreshCw 
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, pendingAlertsCount, wsConnected, onRefresh }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString() + ' | ' + now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'live', label: 'Live Monitoring', icon: Video },
    { id: 'density', label: 'Density Analysis', icon: Gauge },
    { 
      id: 'incidents', 
      label: 'Incident Center', 
      icon: AlertTriangle,
      badge: pendingAlertsCount > 0 ? pendingAlertsCount : null 
    },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'cameras', label: 'Cameras', icon: Camera },
  ];

  return (
    <header className="border-b border-navy-800 bg-navy-950/90 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 p-0.5 shadow-glow-cyan flex items-center justify-center">
            <div className="w-full h-full bg-navy-950 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-wider text-slate-100 uppercase">
                AI Smart Traffic & Accident Detection
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono tracking-widest bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded">
                CV-ML v1.0
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {wsConnected ? 'LIVE FEED CONNECTED' : 'WS RECONNECTING'}
              </span>
              <span>•</span>
              <span className="text-slate-400">{timeStr}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-navy-900/80 p-1 rounded-xl border border-navy-800 overflow-x-auto max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap relative ${
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-bounce">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Global Refresh Button */}
        <button
          onClick={onRefresh}
          title="Refresh Dashboard Data"
          className="p-2 rounded-lg bg-navy-900 hover:bg-navy-800 border border-navy-800 text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

      </div>
    </header>
  );
}
