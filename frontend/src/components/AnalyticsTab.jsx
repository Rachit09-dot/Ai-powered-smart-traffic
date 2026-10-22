import React, { useState } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { Filter, Download, BarChart2, PieChart as PieIcon, TrendingUp, Gauge } from 'lucide-react';

// Dark theme monochrome series colors
const MONOCHROME_COLORS = ['#FFFFFF', '#D4D4D4', '#737373', '#404040'];

export default function AnalyticsTab({ 
  summary = {}, 
  cameras = [], 
  incidents = [],
  trafficHistory = [] 
}) {
  const [selectedCameraFilter, setSelectedCameraFilter] = useState('ALL');
  const [timeRange, setTimeRange] = useState('24h');

  // 1. Vehicle classification breakdown
  const breakdown = summary.vehicle_breakdown || { car: 0, motorcycle: 0, bus: 0, truck: 0 };
  const totalBreakdown = (breakdown.car || 0) + (breakdown.motorcycle || 0) + (breakdown.bus || 0) + (breakdown.truck || 0);
  const pieData = totalBreakdown > 0 ? [
    { name: 'Cars', value: breakdown.car || 0 },
    { name: 'Motorcycles', value: breakdown.motorcycle || 0 },
    { name: 'Buses', value: breakdown.bus || 0 },
    { name: 'Trucks', value: breakdown.truck || 0 }
  ].filter(d => d.value > 0) : [];

  // 2. Camera-wise comparison
  const cameraComparisonData = cameras.map(cam => {
    const camIncidents = incidents.filter(i => i.camera_id === cam.id).length;
    return {
      name: cam.id,
      fullName: cam.name,
      incidents: camIncidents,
      fps: Math.round(cam.fps || 30)
    };
  });

  // 3. Temporal trend data — real data only
  const trendData = trafficHistory.length > 0
    ? trafficHistory.map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        vehicles: item.total_vehicles,
        density: Math.round((item.density_score || 0) * 100),
        speed: Math.round(item.avg_speed_estimate || 0),
        cars: item.cars,
        trucks: item.trucks
      }))
    : [];

  const handleExportCsv = (type) => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
    const url = `${base}/reports/export?report_type=${type}${
      selectedCameraFilter !== 'ALL' ? `&camera_id=${encodeURIComponent(selectedCameraFilter)}` : ''
    }`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Analytics Toolbar */}
      <div className="bg-[#171717] p-4 rounded-lg border border-[#333333] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Scope Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-medium">Camera:</span>
          </div>
          <select
            value={selectedCameraFilter}
            onChange={(e) => setSelectedCameraFilter(e.target.value)}
            className="bg-[#1F1F1F] border border-[#404040] text-white text-xs rounded-md px-3 py-1.5 focus:outline-none focus:border-white transition-colors"
          >
            <option value="ALL" className="bg-[#171717] text-white">All Cameras (Aggregated)</option>
            {cameras.map(c => (
              <option key={c.id} value={c.id} className="bg-[#171717] text-white">{c.id} - {c.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-[#1F1F1F] p-1 rounded-md border border-[#333333] text-xs">
            {['1h', '6h', '24h', '7d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-white text-black'
                    : 'text-[#A3A3A3] hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Export Quick Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExportCsv('traffic')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#E5E5E5] text-black text-xs font-medium rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

      </div>

      {/* Primary Analytics Charts Grid (2x2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Vehicle Count Trends */}
        <div className="bg-[#171717] p-5 rounded-lg border border-[#333333] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-white" />
                Vehicle Count Trends
              </h3>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Vehicular volume progression over time
              </p>
            </div>
            <span className="text-xs font-mono text-[#D4D4D4]">
              Total: {summary.total_vehicles_detected || 0}
            </span>
          </div>

          <div className="h-64 w-full">
            {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaWhite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="time" stroke="#737373" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={{ stroke: '#333333' }} />
                <YAxis stroke="#737373" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={{ stroke: '#333333' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F1F1F', borderColor: '#333333', borderRadius: '6px', fontSize: '12px', color: '#FFFFFF' }}
                  itemStyle={{ color: '#FFFFFF' }}
                  labelStyle={{ color: '#D4D4D4' }}
                />
                <Area type="monotone" dataKey="vehicles" stroke="#FFFFFF" strokeWidth={2} fill="url(#areaWhite)" />
              </AreaChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#737373] text-xs font-mono gap-1">
                <span>No traffic data yet.</span>
                <span className="text-[11px] text-[#555555]">Start a camera pipeline to populate charts.</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#262626] mt-3 text-xs text-[#A3A3A3] flex justify-between">
            <span>Primary series: Vehicles</span>
            <span className="font-mono text-white">Real-time moving window</span>
          </div>
        </div>

        {/* Chart 2: Traffic Density History */}
        <div className="bg-[#171717] p-5 rounded-lg border border-[#333333] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-white" />
                Traffic Density & Saturation History
              </h3>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Estimated percentage of road capacity occupied
              </p>
            </div>
            <span className="text-xs font-mono text-[#D4D4D4]">
              Capacity Index
            </span>
          </div>

          <div className="h-64 w-full">
            {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGray" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4D4D4" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#D4D4D4" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="time" stroke="#737373" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={{ stroke: '#333333' }} />
                <YAxis stroke="#737373" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={{ stroke: '#333333' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F1F1F', borderColor: '#333333', borderRadius: '6px', fontSize: '12px', color: '#FFFFFF' }}
                  itemStyle={{ color: '#FFFFFF' }}
                  labelStyle={{ color: '#D4D4D4' }}
                />
                <Area type="monotone" dataKey="density" stroke="#D4D4D4" strokeWidth={2} fill="url(#areaGray)" />
              </AreaChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#737373] text-xs font-mono gap-1">
                <span>No density observations yet.</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#262626] mt-3 text-xs text-[#A3A3A3] flex justify-between">
            <span>Secondary series: Density (%)</span>
            <span className="font-mono text-white">Greenshields formulation</span>
          </div>
        </div>

        {/* Chart 3: Vehicle Type Distribution */}
        <div className="bg-[#171717] p-5 rounded-lg border border-[#333333] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-white" />
                Vehicle Type Distribution
              </h3>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Proportion by classified COCO vehicle categories
              </p>
            </div>
            <span className="text-xs font-mono text-[#D4D4D4]">4 Classes</span>
          </div>

          <div className="h-64 w-full">
            {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={MONOCHROME_COLORS[index % MONOCHROME_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F1F1F', borderColor: '#333333', borderRadius: '6px', fontSize: '12px', color: '#FFFFFF' }}
                  itemStyle={{ color: '#FFFFFF' }}
                />
              </PieChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#737373] text-xs font-mono gap-1">
                <span>No vehicle detections yet.</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#262626] text-center text-xs">
            {[
              { name: 'Cars', value: breakdown.car || 0 },
              { name: 'Motorcycles', value: breakdown.motorcycle || 0 },
              { name: 'Buses', value: breakdown.bus || 0 },
              { name: 'Trucks', value: breakdown.truck || 0 }
            ].map((d) => (
              <div key={d.name}>
                <span className="text-[#A3A3A3] text-[11px] block">{d.name}</span>
                <span className="font-semibold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Camera-wise Comparison */}
        <div className="bg-[#171717] p-5 rounded-lg border border-[#333333] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-white" />
                Camera-Wise Incident Comparison
              </h3>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Distribution of flagged events across installed cameras
              </p>
            </div>
            <span className="text-xs font-mono text-[#D4D4D4]">Node Analysis</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cameraComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#737373" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={{ stroke: '#333333' }} />
                <YAxis stroke="#737373" tick={{ fontSize: 11, fill: '#A3A3A3' }} axisLine={{ stroke: '#333333' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F1F1F', borderColor: '#333333', borderRadius: '6px', fontSize: '12px', color: '#FFFFFF' }}
                  itemStyle={{ color: '#FFFFFF' }}
                  labelStyle={{ color: '#D4D4D4' }}
                />
                <Bar dataKey="incidents" fill="#FFFFFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-[#262626] mt-3 text-xs text-[#A3A3A3] flex justify-between">
            <span>Bar: Total Logged Incidents</span>
            <span className="font-mono text-white">Hotspot detection</span>
          </div>
        </div>

      </div>

    </div>
  );
}
