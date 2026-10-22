import React from 'react';
import { 
  Car, Video, AlertTriangle, Gauge, 
  ArrowRight, CheckCircle2, ChevronRight
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import StatCard from './StatCard';

export default function OverviewTab({ 
  summary = {}, 
  cameras = [], 
  trafficHistory = [],
  activeCameraId, 
  setActiveCameraId, 
  setActiveTab,
  onAcknowledgeIncident 
}) {
  const breakdown = summary.vehicle_breakdown || { car: 0, motorcycle: 0, bus: 0, truck: 0 };
  const congestion = summary.current_congestion_level || 'LOW';

  const congestionBadgeType = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
  }[congestion] || 'low';

  // Format activity chart points — only use real data, never fake fallback
  const chartData = trafficHistory.length > 0
    ? trafficHistory.slice(-15).map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        vehicles: item.total_vehicles,
        speed: Math.round(item.avg_speed_estimate || 0),
      }))
    : [];

  const activeCamera = cameras.find(c => c.id === activeCameraId) || cameras[0];

  return (
    <div className="space-y-6">
      
      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Vehicles Detected"
          value={summary.total_vehicles_detected ?? 0}
          subtext="Total tracked corridor volume"
          icon={Car}
        />
        <StatCard
          title="Active Cameras"
          value={`${summary.active_camera_feeds ?? 0} / ${summary.total_cameras ?? cameras.length}`}
          subtext="Online video processing feeds"
          icon={Video}
          badge={summary.active_camera_feeds > 0 ? "STREAMING" : "STANDBY"}
          badgeType={summary.active_camera_feeds > 0 ? "low" : "neutral"}
        />
        <StatCard
          title="Traffic Congestion"
          value={congestion}
          subtext="Greenshields density estimation"
          icon={Gauge}
          badge={congestion}
          badgeType={congestionBadgeType}
        />
        <StatCard
          title="Active Incidents"
          value={summary.pending_incidents ?? 0}
          subtext={`${summary.total_incidents ?? 0} total logged events`}
          icon={AlertTriangle}
          badge={summary.pending_incidents > 0 ? "ACTION REQ" : "CLEAR"}
          badgeType={summary.pending_incidents > 0 ? "high" : "low"}
        />
      </div>

      {/* Main Analytics Section (Two-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Traffic Activity Chart (2 cols) */}
        <div className="lg:col-span-2 bg-[#171717] rounded-lg border border-[#333333] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Traffic Activity Trend
              </h3>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Real-time vehicular count observed across tracking nodes
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#A3A3A3] font-mono">
              <span className="flex items-center gap-1.5 text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-white" />
                Vehicles
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="whiteGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#737373" 
                  tick={{ fontSize: 11, fill: '#A3A3A3' }} 
                  axisLine={{ stroke: '#333333' }}
                />
                <YAxis 
                  stroke="#737373" 
                  tick={{ fontSize: 11, fill: '#A3A3A3' }} 
                  axisLine={{ stroke: '#333333' }}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#1F1F1F', 
                    borderColor: '#333333', 
                    borderRadius: '6px', 
                    fontSize: '12px', 
                    color: '#FFFFFF',
                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.6)'
                  }}
                  itemStyle={{ color: '#FFFFFF' }}
                  labelStyle={{ color: '#D4D4D4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="vehicles" 
                  stroke="#FFFFFF" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#whiteGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#737373] gap-2">
                <p className="text-xs font-mono">No traffic observations yet.</p>
                <p className="text-[11px] text-[#555555]">Start a camera pipeline to collect real data.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#262626] flex items-center justify-between text-xs text-[#A3A3A3]">
            <span>Average Flow: <strong className="text-white">{summary.avg_traffic_flow_rate || 0} veh/min</strong></span>
            <span>Uptime: <strong className="text-white">{Math.floor((summary.system_uptime_seconds || 0) / 60)} minutes</strong></span>
          </div>
        </div>

        {/* Right: Current Traffic Status Summary (1 col) */}
        <div className="bg-[#171717] rounded-lg border border-[#333333] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">
                Current Traffic Status
              </h3>
              <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                congestion === 'HIGH' ? 'bg-[#2A1313] text-[#DE7171] border-[#5B2323]' :
                congestion === 'MEDIUM' ? 'bg-[#281F0E] text-[#D6AD57] border-[#57431B]' :
                'bg-[#14231A] text-[#6BB388] border-[#2A4C37]'
              }`}>
                {congestion}
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#1F1F1F] rounded-md border border-[#333333] flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#A3A3A3] block">Active Camera Feed</span>
                  <span className="text-sm font-semibold text-white">
                    {activeCamera?.name || activeCameraId || 'None'}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('live')}
                  className="text-xs font-medium text-white hover:underline flex items-center gap-1"
                >
                  View Feed <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Class Breakdown */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-medium text-[#A3A3A3]">Vehicle Class Breakdown</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-[#1F1F1F] rounded-md border border-[#262626] text-center">
                    <span className="text-[11px] text-[#A3A3A3] block">Cars</span>
                    <span className="text-base font-semibold text-white">{breakdown.car || 0}</span>
                  </div>
                  <div className="p-2.5 bg-[#1F1F1F] rounded-md border border-[#262626] text-center">
                    <span className="text-[11px] text-[#A3A3A3] block">Motorcycles</span>
                    <span className="text-base font-semibold text-white">{breakdown.motorcycle || 0}</span>
                  </div>
                  <div className="p-2.5 bg-[#1F1F1F] rounded-md border border-[#262626] text-center">
                    <span className="text-[11px] text-[#A3A3A3] block">Buses</span>
                    <span className="text-base font-semibold text-white">{breakdown.bus || 0}</span>
                  </div>
                  <div className="p-2.5 bg-[#1F1F1F] rounded-md border border-[#262626] text-center">
                    <span className="text-[11px] text-[#A3A3A3] block">Trucks</span>
                    <span className="text-base font-semibold text-white">{breakdown.truck || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#262626] text-[11px] text-[#A3A3A3] flex items-center justify-between">
            <span>Model: YOLOv8n</span>
            <span className="text-[#6BB388]">● Operational</span>
          </div>
        </div>

      </div>

      {/* Lower Dashboard Section: Recent Incidents Table & Camera Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Incidents Table (2 cols) */}
        <div className="lg:col-span-2 bg-[#171717] rounded-lg border border-[#333333] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Recent Incidents
              </h3>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Latest anomalies and alerts flagged across surveillance feeds
              </p>
            </div>
            <button
              onClick={() => setActiveTab('incidents')}
              className="text-xs font-medium text-white hover:underline flex items-center gap-1"
            >
              View all ({summary.total_incidents || 0})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1F1F1F] text-[#A3A3A3] border-y border-[#333333]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Timestamp</th>
                  <th className="py-2.5 px-3 font-medium">Camera</th>
                  <th className="py-2.5 px-3 font-medium">Event Type</th>
                  <th className="py-2.5 px-3 font-medium">Severity</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-[#D4D4D4]">
                {summary.recent_incidents && summary.recent_incidents.length > 0 ? (
                  summary.recent_incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-[#1F1F1F]/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[#A3A3A3] whitespace-nowrap">
                        {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-white font-medium">
                        {inc.camera_id}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-white">
                        {inc.incident_type ? inc.incident_type.replace(/_/g, ' ') : 'Traffic Anomaly'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 text-[10px] font-mono font-medium rounded border ${
                          inc.severity === 'CRITICAL' ? 'bg-[#2A1313] text-[#DE7171] border-[#5B2323]' :
                          inc.severity === 'HIGH' ? 'bg-[#2A1313] text-[#DE7171] border-[#5B2323]' :
                          'bg-[#281F0E] text-[#D6AD57] border-[#57431B]'
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[11px] font-mono text-[#A3A3A3]">
                          {inc.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {inc.status === 'PENDING' ? (
                          <button
                            onClick={() => onAcknowledgeIncident(inc.id)}
                            className="px-2.5 py-1 text-[11px] font-medium bg-white text-black hover:bg-[#E5E5E5] rounded transition-colors"
                          >
                            Acknowledge
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#6BB388] font-medium">
                            ✓ Verified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-[#737373]">
                      <CheckCircle2 className="w-5 h-5 mx-auto text-[#404040] mb-1" />
                      No active incidents logged. Corridor operating smoothly.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Camera Status Summary (1 col) */}
        <div className="bg-[#171717] rounded-lg border border-[#333333] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">
                Camera Status
              </h3>
              <button
                onClick={() => setActiveTab('cameras')}
                className="text-xs font-medium text-white hover:underline flex items-center gap-1"
              >
                Manage <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {cameras.slice(0, 4).map((cam) => {
                const isSelected = cam.id === activeCameraId;
                return (
                  <div
                    key={cam.id}
                    onClick={() => setActiveCameraId(cam.id)}
                    className={`p-3 rounded-md border text-xs cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-white bg-[#1F1F1F]' 
                        : 'border-[#262626] hover:border-[#404040] bg-[#121212]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-[#A3A3A3]" />
                        {cam.name}
                      </div>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        cam.status === 'PROCESSING' 
                          ? 'bg-[#14231A] text-[#6BB388] border-[#2A4C37]' 
                          : 'bg-[#1F1F1F] text-[#A3A3A3] border-[#333333]'
                      }`}>
                        {cam.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#A3A3A3] mt-1.5 font-mono">
                      <span>{cam.location || 'Highway Sector'}</span>
                      <span>{cam.resolution || '720p'} @ {cam.fps || 30}fps</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#262626] text-[11px] text-[#A3A3A3] flex items-center justify-between">
            <span>Configured: <strong className="text-white">{cameras.length}</strong></span>
            <span>Online: <strong className="text-white">{cameras.filter(c => c.status === 'PROCESSING').length}</strong></span>
          </div>
        </div>

      </div>

    </div>
  );
}
