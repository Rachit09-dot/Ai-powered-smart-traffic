import React from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend, BarChart, Bar 
} from 'recharts';
import { Gauge, Info, Activity, AlertCircle, TrendingUp } from 'lucide-react';

export default function DensityAnalysisTab({ liveMetrics, history = [] }) {
  const densityScore = liveMetrics?.density_score || 0.28;
  const congestionLevel = liveMetrics?.congestion_level || 'LOW';
  const totalVehicles = liveMetrics?.total_vehicles || 0;
  const occupancyRatio = liveMetrics?.road_occupancy_ratio || 0.15;
  const flowRate = liveMetrics?.estimated_flow_rate_vpm || 38.4;

  const congestionColor = {
    LOW: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60',
    MEDIUM: 'text-amber-400 border-amber-500/40 bg-amber-950/60',
    HIGH: 'text-red-400 border-red-500/40 bg-red-950/60',
  }[congestionLevel] || 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60';

  // Format historical chart data
  const chartData = history.map((item, idx) => ({
    time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    vehicles: item.total_vehicles,
    density: Math.round((item.density_score || 0) * 100),
    speed: Math.round(item.avg_speed_estimate || 0),
    cars: item.cars,
    trucks: item.trucks,
  }));

  // Needle angle for radial gauge (-90 to +90 deg)
  const gaugePercent = Math.min(100, Math.round(densityScore * 100));
  const needleRotation = -90 + (gaugePercent / 100) * 180;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Density Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Radial / Arc Density Gauge */}
        <div className="bg-navy-900/60 p-6 rounded-2xl border border-navy-800 backdrop-blur flex flex-col items-center justify-between text-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Real-time Density Gauge
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${congestionColor}`}>
              {congestionLevel} CONGESTION
            </span>
          </div>

          {/* Semicircular Gauge SVG */}
          <div className="relative w-64 h-36 mt-4 flex items-center justify-center">
            <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
              {/* Background Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#132142"
                strokeWidth="18"
                strokeLinecap="round"
              />
              {/* Green Zone (Low) */}
              <path
                d="M 20 100 A 80 80 0 0 1 68 38"
                fill="none"
                stroke="#10b981"
                strokeWidth="18"
                strokeLinecap="round"
                opacity="0.85"
              />
              {/* Yellow Zone (Medium) */}
              <path
                d="M 68 38 A 80 80 0 0 1 132 38"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="18"
                opacity="0.85"
              />
              {/* Red Zone (High) */}
              <path
                d="M 132 38 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#ef4444"
                strokeWidth="18"
                strokeLinecap="round"
                opacity="0.85"
              />
              {/* Needle */}
              <g transform={`rotate(${needleRotation}, 100, 100)`}>
                <line x1="100" y1="100" x2="100" y2="28" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="100" cy="100" r="7" fill="#38bdf8" />
              </g>
            </svg>

            {/* Numeric readout */}
            <div className="absolute bottom-1 flex flex-col items-center">
              <span className="text-3xl font-extrabold font-mono text-slate-100 tracking-tight">
                {gaugePercent}%
              </span>
              <span className="text-[11px] font-mono text-slate-400">Road Saturation Index</span>
            </div>
          </div>

          <div className="grid grid-cols-3 w-full gap-2 mt-4 pt-3 border-t border-navy-800 text-[11px] font-mono text-slate-400">
            <div>
              <p className="text-emerald-400 font-bold">0% - 35%</p>
              <p>Low Flow</p>
            </div>
            <div>
              <p className="text-amber-400 font-bold">35% - 70%</p>
              <p>Medium</p>
            </div>
            <div>
              <p className="text-red-400 font-bold">70% - 100%</p>
              <p>High Congestion</p>
            </div>
          </div>
        </div>

        {/* Traffic Flow Assumptions & Mathematical Model */}
        <div className="lg:col-span-2 bg-navy-900/60 p-6 rounded-2xl border border-navy-800 backdrop-blur space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Theoretical Model & Density Classification Assumptions
            </h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Traffic density is mathematically estimated through a multi-factor sensor fusion model combining 
            <strong> Greenshields Traffic Flow Dynamics</strong> with <strong>Pixel Surface Occupancy Ratios</strong>:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-navy-950 p-3.5 rounded-xl border border-navy-800 space-y-1.5">
              <span className="text-cyan-400 font-bold">1. Greenshields Fundamental Equation</span>
              <p className="text-slate-300 text-[11px]">
                <code className="text-emerald-400">q = k · v</code>
              </p>
              <p className="text-slate-400 text-[11px]">
                Flow rate <code>q</code> (veh/min) is the product of vehicular density <code>k</code> and space-mean velocity <code>v</code>. As density approaches jam capacity <code>k_jam</code>, velocity drops non-linearly.
              </p>
            </div>

            <div className="bg-navy-950 p-3.5 rounded-xl border border-navy-800 space-y-1.5">
              <span className="text-cyan-400 font-bold">2. Road Occupancy Ratio (OR)</span>
              <p className="text-slate-300 text-[11px]">
                <code className="text-emerald-400">OR = Σ(Area_bbox) / Area_road_ROI</code>
              </p>
              <p className="text-slate-400 text-[11px]">
                Heavy vehicles (buses, trucks) occupy significantly higher surface footprints than passenger cars, preventing count-only distortion.
              </p>
            </div>
          </div>

          {/* Threshold Documentation Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono text-left text-slate-300">
              <thead className="bg-navy-950/80 text-slate-400 border-b border-navy-800">
                <tr>
                  <th className="py-2 px-3">Congestion Level</th>
                  <th className="py-2 px-3">Vehicle Threshold</th>
                  <th className="py-2 px-3">Occupancy Ratio</th>
                  <th className="py-2 px-3">Operational State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60">
                <tr>
                  <td className="py-2 px-3 font-bold text-emerald-400">LOW</td>
                  <td className="py-2 px-3">≤ 5 vehicles</td>
                  <td className="py-2 px-3">&lt; 22%</td>
                  <td className="py-2 px-3">Uncongested free flow speed</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-amber-400">MEDIUM</td>
                  <td className="py-2 px-3">6 – 12 vehicles</td>
                  <td className="py-2 px-3">22% – 45%</td>
                  <td className="py-2 px-3">Stable flow with minor braking headway</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-red-400">HIGH</td>
                  <td className="py-2 px-3">&gt; 12 vehicles</td>
                  <td className="py-2 px-3">≥ 45%</td>
                  <td className="py-2 px-3">Bumper-to-bumper queueing / bottleneck</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* Historical Density & Vehicle Counts Time-Series Chart */}
      <div className="bg-navy-900/60 p-6 rounded-2xl border border-navy-800 backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Temporal Density & Vehicle Count Trend
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live moving window of corridor occupancy and tracked flow rate
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Vehicles
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Density %
            </span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              Speed (px/s)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4d" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1326', borderColor: '#1e3567', borderRadius: '8px', fontSize: '11px', color: '#f1f5f9' }}
                />
                <Area type="monotone" dataKey="vehicles" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorVehicles)" />
                <Area type="monotone" dataKey="density" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDensity)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
              <Activity className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
              Accumulating traffic observation time points...
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
