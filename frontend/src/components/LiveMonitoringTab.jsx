import React, { useState } from 'react';
import { 
  Play, Pause, Square, Camera, Activity, 
  Maximize2, Cpu
} from 'lucide-react';

export default function LiveMonitoringTab({
  cameras = [],
  activeCameraId,
  setActiveCameraId,
  processingStatus,
  onStartProcessing,
  onStopProcessing,
  onPauseProcessing,
  liveMetrics = {},
  trackedVehicles = []
}) {
  const [selectedConfidence, setSelectedConfidence] = useState(0.35);
  const activeCamera = cameras.find(c => c.id === activeCameraId) || cameras[0];
  const isProcessing = processingStatus?.is_processing;
  const isPaused = processingStatus?.status === 'PAUSED';
  const metrics = liveMetrics || {};

  const handleFullscreen = () => {
    const videoElem = document.getElementById('live-video-player');
    if (videoElem) {
      if (videoElem.requestFullscreen) {
        videoElem.requestFullscreen();
      } else if (videoElem.webkitRequestFullscreen) {
        videoElem.webkitRequestFullscreen();
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Video Control Toolbar */}
      <div className="bg-[#171717] p-4 rounded-lg border border-[#333333] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Camera Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-[#A3A3A3] whitespace-nowrap">
            Camera Source:
          </label>
          <select
            value={activeCameraId}
            onChange={(e) => setActiveCameraId(e.target.value)}
            className="bg-[#1F1F1F] border border-[#404040] text-white text-xs rounded-md px-3 py-1.5 focus:outline-none focus:border-white transition-colors font-medium min-w-[200px]"
          >
            {cameras.map(cam => (
              <option key={cam.id} value={cam.id} className="bg-[#171717] text-white">
                {cam.name} ({cam.id}) - {cam.location}
              </option>
            ))}
          </select>
        </div>

        {/* Processing Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isProcessing ? (
            <button
              onClick={() => onStartProcessing(activeCameraId, selectedConfidence)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-[#E5E5E5] text-black text-xs font-medium rounded-md transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Processing
            </button>
          ) : (
            <>
              <button
                onClick={() => onPauseProcessing(activeCameraId)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1F1F1F] hover:bg-[#262626] text-white border border-[#404040] text-xs font-medium rounded-md transition-colors"
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>

              <button
                onClick={() => onStopProcessing(activeCameraId)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1F1F1F] hover:bg-[#2A1313] text-[#DE7171] border border-[#5B2323] text-xs font-medium rounded-md transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop
              </button>
            </>
          )}

          {/* Confidence Slider */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-md border border-[#333333] bg-[#1F1F1F] text-xs">
            <span className="text-[#A3A3A3] text-[11px]">Conf:</span>
            <input
              type="range"
              min="0.15"
              max="0.80"
              step="0.05"
              value={selectedConfidence}
              onChange={(e) => setSelectedConfidence(parseFloat(e.target.value))}
              className="w-16 accent-white cursor-pointer"
            />
            <span className="font-mono text-white font-medium w-7 text-right">{selectedConfidence}</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={handleFullscreen}
            title="Toggle fullscreen"
            className="p-1.5 bg-[#1F1F1F] hover:bg-[#262626] text-[#D4D4D4] hover:text-white border border-[#333333] rounded-md transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Main Monitoring Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Video Player Panel (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#171717] rounded-lg border border-[#333333] overflow-hidden">
            
            {/* Header info */}
            <div className="px-4 py-2.5 border-b border-[#333333] bg-[#1F1F1F] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">
                  {activeCamera?.name || activeCameraId}
                </span>
                <span className="text-[#A3A3A3] font-mono">({activeCameraId})</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-[#A3A3A3]">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-[#4D8B67]' : 'bg-[#737373]'}`} />
                  {isProcessing ? (isPaused ? 'PAUSED' : 'STREAMING') : 'STOPPED'}
                </span>
                <span>•</span>
                <span>FPS: <strong className="text-white">{processingStatus?.fps || 0}</strong></span>
              </div>
            </div>

            {/* Video Canvas Container */}
            <div 
              id="live-video-player"
              className="relative aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-[#333333]"
            >
              {activeCameraId && (
                <img
                  src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/processing/stream/${activeCameraId}`}
                  alt="Real-time Computer Vision Traffic Feed"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex';
                    }
                  }}
                  onLoad={(e) => {
                    e.target.style.display = 'block';
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'none';
                    }
                  }}
                />
              )}

              {/* Fallback standby display */}
              <div className={`hidden flex-col items-center justify-center text-[#737373] gap-2 p-6 text-center ${!activeCameraId ? '!flex' : ''}`}>
                <Camera className="w-8 h-8 text-[#404040] animate-pulse" />
                <p className="text-xs font-mono text-[#A3A3A3]">Connecting to live video pipeline...</p>
                <p className="text-[11px] text-[#737373]">Ensure backend server is running and camera feed is selected.</p>
              </div>

              {/* Video Overlay Badges */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-2 pointer-events-none">
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium bg-black/85 text-white rounded border border-[#333333] backdrop-blur-sm">
                  YOLOv8 + SORT
                </span>
                {processingStatus?.frames_processed > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-medium bg-black/85 text-[#D4D4D4] rounded border border-[#333333] backdrop-blur-sm">
                    Frame #{processingStatus.frames_processed}
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Stream Status */}
            <div className="px-4 py-2.5 bg-[#1F1F1F] flex items-center justify-between text-xs text-[#A3A3A3] font-mono">
              <div className="flex items-center gap-3">
                <span>DENSITY: <strong className="text-white">{metrics.congestion_level || 'LOW'}</strong></span>
                <span>FLOW: <strong className="text-white">{metrics.estimated_flow_rate_vpm || 0} veh/min</strong></span>
              </div>
              <span>ROAD OCCUPANCY: <strong className="text-white">{Math.round((metrics.road_occupancy_ratio || 0) * 100)}%</strong></span>
            </div>

          </div>

          {/* Quick Metrics Bar Under Video */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#171717] p-3.5 rounded-lg border border-[#333333] text-center">
              <span className="text-[11px] text-[#A3A3A3] uppercase block font-medium">Cars</span>
              <span className="text-xl font-semibold text-white mt-1 block">{metrics.cars || 0}</span>
            </div>
            <div className="bg-[#171717] p-3.5 rounded-lg border border-[#333333] text-center">
              <span className="text-[11px] text-[#A3A3A3] uppercase block font-medium">Motorcycles</span>
              <span className="text-xl font-semibold text-white mt-1 block">{metrics.motorcycles || 0}</span>
            </div>
            <div className="bg-[#171717] p-3.5 rounded-lg border border-[#333333] text-center">
              <span className="text-[11px] text-[#A3A3A3] uppercase block font-medium">Buses</span>
              <span className="text-xl font-semibold text-white mt-1 block">{metrics.buses || 0}</span>
            </div>
            <div className="bg-[#171717] p-3.5 rounded-lg border border-[#333333] text-center">
              <span className="text-[11px] text-[#A3A3A3] uppercase block font-medium">Trucks</span>
              <span className="text-xl font-semibold text-white mt-1 block">{metrics.trucks || 0}</span>
            </div>
          </div>
        </div>

        {/* Monitoring Summary & Active Tracks (1 col) */}
        <div className="bg-[#171717] rounded-lg border border-[#333333] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#D4D4D4]" />
                Active Tracks
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#333333] bg-[#1F1F1F] text-[#D4D4D4]">
                SORT IoU
              </span>
            </div>
            <p className="text-xs text-[#A3A3A3] mb-3">
              Kinematic vectors and unique vehicle track IDs across consecutive frames
            </p>

            <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
              {trackedVehicles && trackedVehicles.length > 0 ? (
                trackedVehicles.map(t => (
                  <div
                    key={t.track_id}
                    className="p-2.5 rounded-md bg-[#1F1F1F] border border-[#262626] text-xs font-mono space-y-1 hover:border-[#404040] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">ID #{t.track_id}</span>
                      <span className="uppercase text-[10px] px-1.5 py-0.2 rounded bg-[#171717] text-white border border-[#333333]">
                        {t.class_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#A3A3A3] pt-0.5">
                      <span>Speed: <strong className="text-white">{t.speed} px/s</strong></span>
                      <span>Conf: {Math.round(t.confidence * 100)}%</span>
                    </div>
                    {t.stationary_duration > 1.0 && (
                      <div className="text-[10px] text-[#D6AD57] flex items-center justify-between pt-0.5">
                        <span>Stationary:</span>
                        <span>{t.stationary_duration}s</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-[#737373] font-mono text-xs">
                  <Cpu className="w-6 h-6 mx-auto text-[#404040] mb-2" />
                  Awaiting vehicle detections...
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#262626] text-[11px] text-[#A3A3A3] font-mono flex items-center justify-between">
            <span>Total Tracked: <strong className="text-white">{trackedVehicles.length}</strong></span>
            <span>Pipeline: <strong className="text-white">YOLOv8</strong></span>
          </div>
        </div>

      </div>

    </div>
  );
}
