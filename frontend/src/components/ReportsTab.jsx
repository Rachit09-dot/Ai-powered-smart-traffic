import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';

export default function ReportsTab({ 
  summary = {}, 
  cameras = [], 
  incidents = [],
  trafficHistory = [] 
}) {
  const [reportType, setReportType] = useState('incidents'); // 'incidents' | 'traffic'
  const [selectedCamera, setSelectedCamera] = useState('ALL');

  const handleExport = () => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
    let url = `${base}/reports/export?report_type=${reportType}`;
    if (selectedCamera !== 'ALL') {
      url += `&camera_id=${encodeURIComponent(selectedCamera)}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Reports Toolbar */}
      <div className="bg-[#171717] p-4 rounded-lg border border-[#333333] flex flex-wrap items-center justify-between gap-4">
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Report Type */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#A3A3A3]">Report Dataset:</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="bg-[#1F1F1F] border border-[#404040] text-white text-xs rounded-md px-3 py-1.5 focus:outline-none focus:border-white transition-colors font-medium"
            >
              <option value="incidents" className="bg-[#171717] text-white">Incident Logs & Alerts CSV</option>
              <option value="traffic" className="bg-[#171717] text-white">Traffic Flow & Density Observations CSV</option>
            </select>
          </div>

          {/* Camera Scope */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#A3A3A3]">Camera Scope:</label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="bg-[#1F1F1F] border border-[#404040] text-white text-xs rounded-md px-3 py-1.5 focus:outline-none focus:border-white transition-colors"
            >
              <option value="ALL" className="bg-[#171717] text-white">All Cameras (Aggregated)</option>
              {cameras.map(c => (
                <option key={c.id} value={c.id} className="bg-[#171717] text-white">{c.id} - {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Primary Export Button */}
        <div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#E5E5E5] text-black text-xs font-medium rounded-md transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV Report
          </button>
        </div>

      </div>

      {/* Summary KPI Cards for Report Scope */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#171717] p-4 rounded-lg border border-[#333333]">
          <span className="text-xs font-medium text-[#A3A3A3] block">Export Records Available</span>
          <span className="text-2xl font-semibold text-white mt-1 block">
            {reportType === 'incidents' ? incidents.length : trafficHistory.length}
          </span>
          <span className="text-[11px] text-[#A3A3A3] mt-1 block font-mono">
            {reportType === 'incidents' ? 'Total incident records' : 'Recorded time observations'}
          </span>
        </div>

        <div className="bg-[#171717] p-4 rounded-lg border border-[#333333]">
          <span className="text-xs font-medium text-[#A3A3A3] block">Corridor Cameras</span>
          <span className="text-2xl font-semibold text-white mt-1 block">
            {selectedCamera === 'ALL' ? cameras.length : 1}
          </span>
          <span className="text-[11px] text-[#A3A3A3] mt-1 block font-mono">
            {selectedCamera === 'ALL' ? 'Multi-node network' : `Filtered to ${selectedCamera}`}
          </span>
        </div>

        <div className="bg-[#171717] p-4 rounded-lg border border-[#333333]">
          <span className="text-xs font-medium text-[#A3A3A3] block">Total Corridor Flow</span>
          <span className="text-2xl font-semibold text-white mt-1 block">
            {summary.total_vehicles_detected || 0}
          </span>
          <span className="text-[11px] text-[#A3A3A3] mt-1 block font-mono">
            Vehicles counted
          </span>
        </div>

        <div className="bg-[#171717] p-4 rounded-lg border border-[#333333]">
          <span className="text-xs font-medium text-[#A3A3A3] block">Export Format</span>
          <span className="text-2xl font-semibold text-white mt-1 block font-mono">
            RFC 4180
          </span>
          <span className="text-[11px] text-[#A3A3A3] mt-1 block font-mono">
            Standard CSV UTF-8
          </span>
        </div>
      </div>

      {/* Dataset Preview Table */}
      <div className="bg-[#171717] rounded-lg border border-[#333333] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D4D4D4]" />
              Dataset Preview ({reportType === 'incidents' ? 'Incident History' : 'Traffic Observations'})
            </h3>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              Live database records available for extraction and CSV export
            </p>
          </div>
          <span className="text-xs font-mono text-[#A3A3A3]">
            Backend API: /api/reports/export
          </span>
        </div>

        <div className="overflow-x-auto">
          {reportType === 'incidents' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1F1F1F] text-[#A3A3A3] border-y border-[#333333] font-medium">
                <tr>
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Camera ID</th>
                  <th className="py-2.5 px-3">Incident Type</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-[#D4D4D4]">
                {incidents.slice(0, 10).map((inc) => (
                  <tr key={inc.id} className="hover:bg-[#1F1F1F]/70">
                    <td className="py-2.5 px-3 font-mono text-[#A3A3A3] whitespace-nowrap">
                      {new Date(inc.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{inc.camera_id}</td>
                    <td className="py-2.5 px-3 text-white">{inc.incident_type?.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 px-3 font-mono font-medium">{inc.severity}</td>
                    <td className="py-2.5 px-3 font-mono">{Math.round((inc.confidence || 0.8) * 100)}%</td>
                    <td className="py-2.5 px-3 font-mono text-[#A3A3A3]">{inc.status}</td>
                    <td className="py-2.5 px-3 text-[#A3A3A3] truncate max-w-xs">{inc.notes || 'Anomalous kinematic trigger.'}</td>
                  </tr>
                ))}
                {incidents.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-[#737373]">
                      No incident records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1F1F1F] text-[#A3A3A3] border-y border-[#333333] font-medium">
                <tr>
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Camera ID</th>
                  <th className="py-2.5 px-3">Vehicles</th>
                  <th className="py-2.5 px-3">Cars</th>
                  <th className="py-2.5 px-3">Motorcycles</th>
                  <th className="py-2.5 px-3">Buses</th>
                  <th className="py-2.5 px-3">Trucks</th>
                  <th className="py-2.5 px-3">Density Score</th>
                  <th className="py-2.5 px-3">Congestion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-[#D4D4D4]">
                {trafficHistory.slice(0, 10).map((obs) => (
                  <tr key={obs.id} className="hover:bg-[#1F1F1F]/70">
                    <td className="py-2.5 px-3 font-mono text-[#A3A3A3] whitespace-nowrap">
                      {new Date(obs.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{obs.camera_id}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{obs.total_vehicles}</td>
                    <td className="py-2.5 px-3 font-mono text-[#A3A3A3]">{obs.cars}</td>
                    <td className="py-2.5 px-3 font-mono text-[#A3A3A3]">{obs.motorcycles}</td>
                    <td className="py-2.5 px-3 font-mono text-[#A3A3A3]">{obs.buses}</td>
                    <td className="py-2.5 px-3 font-mono text-[#A3A3A3]">{obs.trucks}</td>
                    <td className="py-2.5 px-3 font-mono">{Number(obs.density_score || 0).toFixed(3)}</td>
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{obs.congestion_level}</td>
                  </tr>
                ))}
                {trafficHistory.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-[#737373]">
                      No traffic observations recorded yet. Start camera pipeline to collect data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="pt-2 text-xs text-[#A3A3A3] flex items-center justify-between">
          <span>Showing preview of up to 10 records</span>
          <button
            onClick={handleExport}
            className="text-xs font-semibold text-white hover:underline"
          >
            Download complete CSV &rarr;
          </button>
        </div>
      </div>

    </div>
  );
}
