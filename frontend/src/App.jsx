import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewTab from './components/OverviewTab';
import LiveMonitoringTab from './components/LiveMonitoringTab';
import AnalyticsTab from './components/AnalyticsTab';
import AccidentAlertsTab from './components/AccidentAlertsTab';
import CameraManagementTab from './components/CameraManagementTab';
import ReportsTab from './components/ReportsTab';
import SettingsTab from './components/SettingsTab';
import AlertNotificationToast from './components/AlertNotificationToast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/traffic';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState('cam-01');
  const [summary, setSummary] = useState({
    total_vehicles_detected: 0,
    active_camera_feeds: 0,
    total_cameras: 0,
    current_congestion_level: 'LOW',
    total_incidents: 0,
    pending_incidents: 0,
    avg_traffic_flow_rate: 0,
    system_status: 'OPERATIONAL',
    system_uptime_seconds: 0,
    vehicle_breakdown: { car: 0, motorcycle: 0, bus: 0, truck: 0 },
    recent_incidents: []
  });
  const [incidents, setIncidents] = useState([]);
  const [trafficHistory, setTrafficHistory] = useState([]);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [trackedVehicles, setTrackedVehicles] = useState([]);
  const [activeToastAlert, setActiveToastAlert] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [backendError, setBackendError] = useState(false);

  const wsRef = useRef(null);

  // 1. Initial Data Fetch & Periodic Sync
  const fetchData = async () => {
    try {
      // Fetch cameras
      const camRes = await fetch(`${API_BASE}/cameras`);
      if (camRes.ok) {
        const cams = await camRes.json();
        setCameras(cams);
        if (cams.length > 0 && !activeCameraId) {
          setActiveCameraId(cams[0].id);
        }
        setBackendError(false);
      }

      // Fetch dashboard summary
      const sumRes = await fetch(`${API_BASE}/dashboard/summary`);
      if (sumRes.ok) {
        const sum = await sumRes.json();
        setSummary(sum);
      }

      // Fetch incidents
      const incRes = await fetch(`${API_BASE}/incidents?limit=50`);
      if (incRes.ok) {
        const incs = await incRes.json();
        setIncidents(incs);
      }

      // Fetch traffic history
      const histRes = await fetch(`${API_BASE}/traffic/history?limit=40`);
      if (histRes.ok) {
        const hist = await histRes.json();
        setTrafficHistory(hist);
      }

      // Fetch processing status for active camera
      if (activeCameraId) {
        const procRes = await fetch(`${API_BASE}/processing/status/${activeCameraId}`);
        if (procRes.ok) {
          const proc = await procRes.json();
          setProcessingStatus(proc);
        }
      }
    } catch (err) {
      console.warn('API fetch error:', err);
      setBackendError(true);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, [activeCameraId]);

  // 2. WebSocket Connection for Real-Time Telemetry & Alerts
  useEffect(() => {
    let socket;
    let reconnectTimer;

    const connectWs = () => {
      try {
        socket = new WebSocket(WS_URL);
        wsRef.current = socket;

        socket.onopen = () => {
          setWsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'TRAFFIC_UPDATE') {
              if (data.camera_id === activeCameraId) {
                setProcessingStatus(prev => ({
                  ...prev,
                  is_processing: true,
                  fps: data.fps,
                  frames_processed: data.frames_processed
                }));
                setLiveMetrics(data.metrics);
                setTrackedVehicles(data.active_tracks || []);

                // If incident detected in this frame
                if (data.active_events && data.active_events.length > 0) {
                  const ev = data.active_events[0];
                  setActiveToastAlert({
                    ...ev,
                    camera_id: data.camera_id
                  });
                  // Refresh incidents list
                  fetch(`${API_BASE}/incidents?limit=50`).then(r => r.json()).then(setIncidents);
                }
              }
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        socket.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 3000);
        };

        socket.onerror = () => {
          socket.close();
        };
      } catch {
        reconnectTimer = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    return () => {
      if (wsRef.current) wsRef.current.close();
      clearTimeout(reconnectTimer);
    };
  }, [activeCameraId]);

  // Handlers
  const handleStartProcessing = async (camId, conf = 0.35) => {
    try {
      const res = await fetch(`${API_BASE}/processing/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camera_id: camId,
          confidence_threshold: conf,
          enable_accident_detection: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        setProcessingStatus(data);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to start processing:', err);
    }
  };

  const handleStopProcessing = async (camId) => {
    try {
      const res = await fetch(`${API_BASE}/processing/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera_id: camId })
      });
      if (res.ok) {
        const data = await res.json();
        setProcessingStatus(data);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to stop processing:', err);
    }
  };

  const handlePauseProcessing = async (camId) => {
    try {
      const res = await fetch(`${API_BASE}/processing/pause/${camId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setProcessingStatus(prev => ({
          ...prev,
          status: data.is_paused ? 'PAUSED' : 'RUNNING'
        }));
      }
    } catch (err) {
      console.error('Failed to pause processing:', err);
    }
  };

  const handleAddCamera = async (newCam) => {
    try {
      const res = await fetch(`${API_BASE}/cameras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCam)
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to add camera:', err);
    }
  };

  const handleDeleteCamera = async (camId) => {
    try {
      const res = await fetch(`${API_BASE}/cameras/${camId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        if (activeCameraId === camId && cameras.length > 1) {
          const remaining = cameras.filter(c => c.id !== camId);
          setActiveCameraId(remaining[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to delete camera:', err);
    }
  };

  const handleUpdateIncidentStatus = async (incidentId, newStatus, notes) => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to update incident:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white selection:text-black">
      
      {/* 230px Desktop Fixed Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingAlertsCount={summary.pending_incidents || 0}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main App Container (with 230px left margin on desktop) */}
      <div className="flex-1 lg:pl-[230px] flex flex-col min-w-0 bg-black">
        
        {/* Top Minimalist Dark Header */}
        <Header
          activeTab={activeTab}
          wsConnected={wsConnected}
          pendingAlertsCount={summary.pending_incidents || 0}
          onRefresh={fetchData}
          setMobileOpen={setMobileOpen}
          setActiveTab={setActiveTab}
        />

        {/* Backend unavailable banner */}
        {backendError && (
          <div className="bg-[#2A1313] border-b border-[#5B2323] text-[#DE7171] text-xs px-6 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#DE7171] inline-block" />
            Backend unreachable at <code className="font-mono">{API_BASE}</code>. Ensure the FastAPI server is running.
          </div>
        )}

        {/* Page Content Workspace */}
        <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto bg-black">
          
          {activeTab === 'overview' && (
            <OverviewTab
              summary={summary}
              cameras={cameras}
              trafficHistory={trafficHistory}
              activeCameraId={activeCameraId}
              setActiveCameraId={setActiveCameraId}
              setActiveTab={setActiveTab}
              onAcknowledgeIncident={(id) => handleUpdateIncidentStatus(id, 'ACKNOWLEDGED', 'Quick acknowledge from overview')}
            />
          )}

          {activeTab === 'live' && (
            <LiveMonitoringTab
              cameras={cameras}
              activeCameraId={activeCameraId}
              setActiveCameraId={setActiveCameraId}
              processingStatus={processingStatus}
              onStartProcessing={handleStartProcessing}
              onStopProcessing={handleStopProcessing}
              onPauseProcessing={handlePauseProcessing}
              liveMetrics={liveMetrics}
              trackedVehicles={trackedVehicles}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              summary={summary}
              cameras={cameras}
              incidents={incidents}
              trafficHistory={trafficHistory}
            />
          )}

          {activeTab === 'incidents' && (
            <AccidentAlertsTab
              incidents={incidents}
              onUpdateIncidentStatus={handleUpdateIncidentStatus}
              cameras={cameras}
            />
          )}

          {activeTab === 'cameras' && (
            <CameraManagementTab
              cameras={cameras}
              onAddCamera={handleAddCamera}
              onDeleteCamera={handleDeleteCamera}
              onStartProcessing={handleStartProcessing}
              onStopProcessing={handleStopProcessing}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsTab
              summary={summary}
              cameras={cameras}
              incidents={incidents}
              trafficHistory={trafficHistory}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab />
          )}

        </main>

        {/* Clean Minimalist Dark Footer */}
        <footer className="border-t border-[#333333] bg-[#0A0A0A] py-4 px-6 md:px-8 text-xs text-[#A3A3A3]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <p className="font-medium text-white">
              Smart Traffic AI • Enterprise Traffic Monitoring & Accident Anomaly Detection
            </p>
            <p className="text-[#A3A3A3] font-mono text-[11px]">
              YOLOv8 • Kalman SORT • Greenshields Model • FastAPI
            </p>
          </div>
        </footer>

      </div>

      {/* Floating Incident Notification Toast */}
      <AlertNotificationToast
        alert={activeToastAlert}
        onDismiss={() => setActiveToastAlert(null)}
        onViewDetails={() => {
          setActiveToastAlert(null);
          setActiveTab('incidents');
        }}
      />

    </div>
  );
}
