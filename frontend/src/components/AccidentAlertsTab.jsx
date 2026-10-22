import React, { useState } from 'react';
import { 
  CheckCircle2, Eye, Search, X, Info
} from 'lucide-react';

export default function AccidentAlertsTab({ 
  incidents = [], 
  onUpdateIncidentStatus,
  cameras = [] 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCamera, setFilterCamera] = useState('ALL');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [operatorNotes, setOperatorNotes] = useState('');

  const filtered = incidents.filter(inc => {
    if (filterSeverity !== 'ALL' && inc.severity !== filterSeverity) return false;
    if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
    if (filterCamera !== 'ALL' && inc.camera_id !== filterCamera) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchType = (inc.incident_type || '').toLowerCase().includes(q);
      const matchCam = (inc.camera_id || '').toLowerCase().includes(q);
      const matchNotes = (inc.notes || '').toLowerCase().includes(q);
      if (!matchType && !matchCam && !matchNotes) return false;
    }
    return true;
  });

  const handleAction = async (incidentId, newStatus) => {
    await onUpdateIncidentStatus(incidentId, newStatus, operatorNotes);
    setSelectedIncident(null);
    setOperatorNotes('');
  };

  const renderSeverityBadge = (severity) => {
    if (severity === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono font-medium rounded border border-[#5B2323] bg-[#2E1414] text-[#DE7171]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DC4545]" />
          Critical
        </span>
      );
    }
    if (severity === 'HIGH') {
      return (
        <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded border border-[#5B2323] bg-[#2E1414] text-[#DE7171]">
          High
        </span>
      );
    }
    if (severity === 'MEDIUM') {
      return (
        <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded border border-[#57431B] bg-[#281F0E] text-[#D6AD57]">
          Medium
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded border border-[#2A4C37] bg-[#14231A] text-[#6BB388]">
        Low
      </span>
    );
  };

  const renderStatusBadge = (status) => {
    const map = {
      PENDING: 'bg-[#281F0E] text-[#D6AD57] border-[#57431B]',
      ACKNOWLEDGED: 'bg-[#1F1F1F] text-[#D4D4D4] border-[#333333]',
      RESOLVED: 'bg-[#14231A] text-[#6BB388] border-[#2A4C37]',
      FALSE_POSITIVE: 'bg-[#1F1F1F] text-[#A3A3A3] border-[#333333]'
    };
    return (
      <span className={`px-2 py-0.5 text-[11px] font-mono font-medium rounded border ${map[status] || map.PENDING}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Explainability & Taxonomy Notice */}
      <div className="bg-[#171717] p-4 rounded-lg border border-[#333333] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#D4D4D4] shrink-0 mt-0.5" />
        <div className="text-xs text-[#A3A3A3] space-y-1">
          <p className="font-medium text-white">
            AI Incident Verification Protocol & Explainability
          </p>
          <p className="leading-relaxed">
            Events captured here denote <strong className="text-white">potential accidents</strong> or <strong className="text-white">detected kinematic anomalies</strong> (e.g. abrupt stationary deceleration, trajectory intersection). In keeping with safety standards, alerts require manual operator verification before being classified as confirmed incidents.
          </p>
        </div>
      </div>

      {/* Toolbar: Search, Filters */}
      <div className="bg-[#171717] p-4 rounded-lg border border-[#333333] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident type, camera, or notes..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#1F1F1F] border border-[#404040] rounded-md text-xs text-white placeholder-[#737373] focus:outline-none focus:border-white transition-colors"
          />
        </div>

        {/* Right: Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Camera filter */}
          <select
            value={filterCamera}
            onChange={(e) => setFilterCamera(e.target.value)}
            className="bg-[#1F1F1F] border border-[#404040] text-white rounded-md px-2.5 py-1.5 focus:outline-none focus:border-white"
          >
            <option value="ALL" className="bg-[#171717] text-white">All Cameras</option>
            {cameras.map(c => (
              <option key={c.id} value={c.id} className="bg-[#171717] text-white">{c.id}</option>
            ))}
          </select>

          {/* Severity filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-[#1F1F1F] border border-[#404040] text-white rounded-md px-2.5 py-1.5 focus:outline-none focus:border-white"
          >
            <option value="ALL" className="bg-[#171717] text-white">All Severities</option>
            <option value="CRITICAL" className="bg-[#171717] text-white">Critical</option>
            <option value="HIGH" className="bg-[#171717] text-white">High</option>
            <option value="MEDIUM" className="bg-[#171717] text-white">Medium</option>
            <option value="LOW" className="bg-[#171717] text-white">Low</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#1F1F1F] border border-[#404040] text-white rounded-md px-2.5 py-1.5 focus:outline-none focus:border-white"
          >
            <option value="ALL" className="bg-[#171717] text-white">All Statuses</option>
            <option value="PENDING" className="bg-[#171717] text-white">Pending</option>
            <option value="ACKNOWLEDGED" className="bg-[#171717] text-white">Acknowledged</option>
            <option value="RESOLVED" className="bg-[#171717] text-white">Resolved</option>
            <option value="FALSE_POSITIVE" className="bg-[#171717] text-white">False Positive</option>
          </select>

          <span className="text-[#A3A3A3] text-[11px] font-mono pl-1">
            ({filtered.length} found)
          </span>
        </div>

      </div>

      {/* Incident Table */}
      <div className="bg-[#171717] rounded-lg border border-[#333333] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1F1F1F] text-[#A3A3A3] border-b border-[#333333] font-medium">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Camera</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626] text-[#D4D4D4]">
              {filtered.length > 0 ? (
                filtered.map((inc) => (
                  <tr key={inc.id} className="hover:bg-[#1F1F1F]/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-[#A3A3A3] whitespace-nowrap">
                      {new Date(inc.timestamp).toLocaleString([], { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' 
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-white">
                      {inc.camera_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">
                        {inc.incident_type ? inc.incident_type.replace(/_/g, ' ') : 'Potential Anomaly'}
                      </div>
                      <div className="text-[10px] font-mono text-[#737373]">
                        ID: {inc.id}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {renderSeverityBadge(inc.severity)}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-white">
                      {Math.round((inc.confidence || 0.8) * 100)}%
                    </td>
                    <td className="py-3 px-4">
                      {renderStatusBadge(inc.status)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="px-2.5 py-1 bg-[#1F1F1F] hover:bg-[#262626] text-white border border-[#404040] rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#A3A3A3]" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-[#737373]">
                    <CheckCircle2 className="w-6 h-6 mx-auto text-[#404040] mb-2" />
                    No incidents match the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details & Verification Action Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171717] border border-[#333333] rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-modal relative animate-in fade-in zoom-in-95 duration-150">
            
            <button
              onClick={() => setSelectedIncident(null)}
              className="absolute top-4 right-4 p-1 text-[#A3A3A3] hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#A3A3A3]">
                Incident Review
              </span>
              <h3 className="text-base font-semibold text-white mt-0.5">
                {selectedIncident.incident_type.replace(/_/g, ' ')}
              </h3>
              <p className="text-xs font-mono text-[#737373] mt-0.5">
                Event ID: {selectedIncident.id}
              </p>
            </div>

            {/* Spec grid */}
            <div className="p-3 bg-[#1F1F1F] rounded-md border border-[#333333] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Camera Source:</span>
                <span className="font-mono font-medium text-white">{selectedIncident.camera_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Detected At:</span>
                <span className="font-mono text-[#D4D4D4]">{new Date(selectedIncident.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Severity:</span>
                <div>{renderSeverityBadge(selectedIncident.severity)}</div>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Detection Confidence:</span>
                <span className="font-mono font-medium text-white">{Math.round((selectedIncident.confidence || 0.8) * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A3A3A3]">Current Status:</span>
                <div>{renderStatusBadge(selectedIncident.status)}</div>
              </div>
            </div>

            {/* AI Kinematic Notes */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#A3A3A3]">Kinematic Diagnostic Info</label>
              <p className="p-2.5 bg-[#1F1F1F] rounded-md border border-[#262626] text-xs text-[#D4D4D4] font-mono leading-relaxed">
                {selectedIncident.notes || 'Stationary tracking duration exceeded 5.0 seconds. Trajectory deceleration anomaly flagged.'}
              </p>
            </div>

            {/* Operator Notes Field */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#A3A3A3]">Operator Review Note</label>
              <textarea
                rows="2"
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                placeholder="Enter verification notes or resolution details..."
                className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md p-2 text-xs text-white placeholder-[#737373] focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[#333333]">
              <button
                onClick={() => handleAction(selectedIncident.id, 'FALSE_POSITIVE')}
                className="px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#262626] text-[#A3A3A3] hover:text-white border border-[#404040] text-xs font-medium rounded-md transition-colors"
              >
                Mark False Positive
              </button>
              <button
                onClick={() => handleAction(selectedIncident.id, 'ACKNOWLEDGED')}
                className="px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#262626] text-white border border-[#404040] text-xs font-medium rounded-md transition-colors"
              >
                Acknowledge Alert
              </button>
              <button
                onClick={() => handleAction(selectedIncident.id, 'RESOLVED')}
                className="px-3.5 py-1.5 bg-white hover:bg-[#E5E5E5] text-black text-xs font-medium rounded-md transition-colors"
              >
                Resolve Incident
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
