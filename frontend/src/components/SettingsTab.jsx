import React, { useState } from 'react';
import { Save, RotateCcw, CheckCircle2 } from 'lucide-react';

export default function SettingsTab() {
  const defaultSettings = {
    systemName: 'Smart Traffic AI',
    facilityName: 'Central Highway Operations Center',
    refreshInterval: '6',
    modelWeights: 'yolov8n.pt',
    defaultConfidence: '0.35',
    iouThreshold: '0.45',
    lowDensityThreshold: '5',
    mediumDensityThreshold: '12',
    highDensityThreshold: '13',
    maxFps: '30',
    autoStartFeeds: true,
    enableToasts: true,
    alertCooldownSeconds: '30'
  };

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_traffic_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('smart_traffic_settings', JSON.stringify(settings));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('smart_traffic_settings');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      
      {/* Success banner */}
      {savedSuccess && (
        <div className="bg-[#14231A] border border-[#2A4C37] text-[#6BB388] px-4 py-3 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#6BB388]" />
            <span>Settings saved successfully to system storage.</span>
          </div>
        </div>
      )}

      {/* 1. General Settings */}
      <div className="bg-[#171717] rounded-lg border border-[#333333] p-5 space-y-4">
        <div className="border-b border-[#262626] pb-3">
          <h3 className="text-sm font-semibold text-white">General Settings</h3>
          <p className="text-xs text-[#A3A3A3] mt-0.5">Basic identity and telemetry intervals</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-white font-medium mb-1">System Application Name</label>
            <input
              type="text"
              value={settings.systemName}
              onChange={(e) => handleChange('systemName', e.target.value)}
              className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md px-3 py-2 text-white focus:outline-none focus:border-white transition-colors"
            />
            <span className="text-[11px] text-[#A3A3A3] mt-1 block">Branding displayed across UI headers</span>
          </div>

          <div>
            <label className="block text-white font-medium mb-1">Monitoring Facility / Corridor</label>
            <input
              type="text"
              value={settings.facilityName}
              onChange={(e) => handleChange('facilityName', e.target.value)}
              className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md px-3 py-2 text-white focus:outline-none focus:border-white transition-colors"
            />
            <span className="text-[11px] text-[#A3A3A3] mt-1 block">Physical or synthetic monitoring region</span>
          </div>

          <div>
            <label className="block text-white font-medium mb-1">Dashboard Poll Interval (seconds)</label>
            <select
              value={settings.refreshInterval}
              onChange={(e) => handleChange('refreshInterval', e.target.value)}
              className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md px-3 py-2 text-white focus:outline-none focus:border-white transition-colors"
            >
              <option value="3" className="bg-[#171717] text-white">3 seconds (High frequency)</option>
              <option value="6" className="bg-[#171717] text-white">6 seconds (Standard)</option>
              <option value="10" className="bg-[#171717] text-white">10 seconds (Low bandwidth)</option>
            </select>
            <span className="text-[11px] text-[#A3A3A3] mt-1 block">Fallback polling interval for backend state</span>
          </div>
        </div>
      </div>

      {/* 2. Detection Configuration */}
      <div className="bg-[#171717] rounded-lg border border-[#333333] p-5 space-y-4">
        <div className="border-b border-[#262626] pb-3">
          <h3 className="text-sm font-semibold text-white">Detection & Neural Model Configuration</h3>
          <p className="text-xs text-[#A3A3A3] mt-0.5">Parameters for YOLOv8 object detector and Kalman tracker</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-white font-medium mb-1">Model Weights</label>
            <input
              type="text"
              disabled
              value={settings.modelWeights}
              className="w-full bg-[#121212] border border-[#333333] rounded-md px-3 py-2 text-[#A3A3A3] font-mono cursor-not-allowed"
            />
            <span className="text-[11px] text-[#737373] mt-1 block">Pre-trained Ultralytics YOLOv8 nano model</span>
          </div>

          <div>
            <label className="block text-white font-medium mb-1">Default Confidence Threshold</label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="0.9"
              value={settings.defaultConfidence}
              onChange={(e) => handleChange('defaultConfidence', e.target.value)}
              className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:border-white transition-colors"
            />
            <span className="text-[11px] text-[#A3A3A3] mt-1 block">Score cutoff for vehicle bounding boxes (0.15 - 0.80)</span>
          </div>

          <div>
            <label className="block text-white font-medium mb-1">IoU Overlap Threshold</label>
            <input
              type="number"
              step="0.05"
              min="0.2"
              max="0.8"
              value={settings.iouThreshold}
              onChange={(e) => handleChange('iouThreshold', e.target.value)}
              className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:border-white transition-colors"
            />
            <span className="text-[11px] text-[#A3A3A3] mt-1 block">SORT tracker association intersection over union</span>
          </div>
        </div>
      </div>

      {/* 3. Traffic Density Thresholds */}
      <div className="bg-[#171717] rounded-lg border border-[#333333] p-5 space-y-4">
        <div className="border-b border-[#262626] pb-3">
          <h3 className="text-sm font-semibold text-white">Traffic Density Thresholds</h3>
          <p className="text-xs text-[#A3A3A3] mt-0.5">Greenshields congestion classification boundaries</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-white font-medium mb-1">Low Congestion (≤ vehicles)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.lowDensityThreshold}
              onChange={(e) => handleChange('lowDensityThreshold', e.target.value)}
              className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:border-white transition-colors"
            />
            <span className="text-[11px] text-[#A3A3A3] mt-1 block">Unrestricted free flow corridor</span>
          </div>

          <div>
            <label className="block text-white font-medium mb-1">Medium Congestion (vehicles)</label>
            <input
              type="number"
              min="2"
              max="50"
              value={settings.mediumDensityThreshold}
              onChange={(e) => handleChange('mediumDensityThreshold', e.target.value)}
              className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:border-white transition-colors"
            />
            <span className="text-[11px] text-[#A3A3A3] mt-1 block">Stable flow with moderate headway</span>
          </div>

          <div>
            <label className="block text-white font-medium mb-1">High Congestion (&gt; vehicles)</label>
            <input
              type="number"
              min="5"
              max="100"
              value={settings.highDensityThreshold}
              onChange={(e) => handleChange('highDensityThreshold', e.target.value)}
              className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:border-white transition-colors"
            />
            <span className="text-[11px] text-[#A3A3A3] mt-1 block">Bumper-to-bumper queue warning threshold</span>
          </div>
        </div>
      </div>

      {/* 4. Notification Preferences */}
      <div className="bg-[#171717] rounded-lg border border-[#333333] p-5 space-y-4">
        <div className="border-b border-[#262626] pb-3">
          <h3 className="text-sm font-semibold text-white">Alerts & Notification Preferences</h3>
          <p className="text-xs text-[#A3A3A3] mt-0.5">Control how incident anomalies surface to operators</p>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableToasts}
              onChange={(e) => handleChange('enableToasts', e.target.checked)}
              className="w-4 h-4 rounded border-[#404040] bg-[#1F1F1F] accent-white cursor-pointer"
            />
            <div>
              <span className="font-medium text-white block">Enable Floating Incident Alert Toasts</span>
              <span className="text-[#A3A3A3] text-[11px]">Display real-time popup toasts on incoming WebSocket alerts</span>
            </div>
          </label>

          <div className="pt-2 max-w-xs">
            <label className="block text-white font-medium mb-1">Deduplication Alert Cooldown (seconds)</label>
            <input
              type="number"
              min="5"
              max="120"
              value={settings.alertCooldownSeconds}
              onChange={(e) => handleChange('alertCooldownSeconds', e.target.value)}
              className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:border-white transition-colors"
            />
            <span className="text-[11px] text-[#A3A3A3] mt-1 block">Prevents duplicate alert spam for the same incident</span>
          </div>
        </div>
      </div>

      {/* 5. System Information */}
      <div className="bg-[#171717] rounded-lg border border-[#333333] p-5 space-y-3">
        <div className="border-b border-[#262626] pb-3">
          <h3 className="text-sm font-semibold text-white">System Information</h3>
          <p className="text-xs text-[#A3A3A3] mt-0.5">Architecture and runtime environment details</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 bg-[#1F1F1F] rounded border border-[#262626]">
            <span className="text-[#A3A3A3] text-[10px] uppercase block">AI/ML Core</span>
            <span className="font-semibold text-white">YOLOv8 + SORT</span>
          </div>
          <div className="p-2.5 bg-[#1F1F1F] rounded border border-[#262626]">
            <span className="text-[#A3A3A3] text-[10px] uppercase block">Backend Engine</span>
            <span className="font-semibold text-white">FastAPI + AsyncIO</span>
          </div>
          <div className="p-2.5 bg-[#1F1F1F] rounded border border-[#262626]">
            <span className="text-[#A3A3A3] text-[10px] uppercase block">Database</span>
            <span className="font-semibold text-white">SQLite (SQLAlchemy)</span>
          </div>
          <div className="p-2.5 bg-[#1F1F1F] rounded border border-[#262626]">
            <span className="text-[#A3A3A3] text-[10px] uppercase block">Protocol</span>
            <span className="font-semibold text-white">WebSocket (RFC 6455)</span>
          </div>
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1F1F1F] hover:bg-[#262626] text-[#D4D4D4] hover:text-white border border-[#404040] text-xs font-medium rounded-md transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#A3A3A3]" />
          Reset Defaults
        </button>

        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#E5E5E5] text-black text-xs font-medium rounded-md transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Save Changes
        </button>
      </div>

    </form>
  );
}
