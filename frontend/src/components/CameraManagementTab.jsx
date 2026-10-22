import React, { useState } from 'react';
import { 
  Plus, Trash2, Upload, Video, 
  Play, Square, X, Camera
} from 'lucide-react';

export default function CameraManagementTab({
  cameras = [],
  onAddCamera,
  onDeleteCamera,
  onStartProcessing,
  onStopProcessing
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCamName, setNewCamName] = useState('');
  const [newCamSourceType, setNewCamSourceType] = useState('DEMO_SYNTHETIC');
  const [newCamSourcePath, setNewCamSourcePath] = useState('demo_synthetic');
  const [newCamLocation, setNewCamLocation] = useState('Corridor North');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage('Uploading video to backend storage...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/videos/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setNewCamSourcePath(data.file_path);
        setNewCamSourceType('VIDEO_FILE');
        if (!newCamName) setNewCamName(file.name.replace(/\.[^/.]+$/, ""));
        setUploadMessage(`Uploaded: ${data.filename} (${data.size_mb} MB)`);
      } else {
        setUploadMessage(`Error: ${data.detail || 'Upload failed'}`);
      }
    } catch (err) {
      setUploadMessage(`Connection error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newCamName || !newCamSourcePath) return;

    await onAddCamera({
      name: newCamName,
      source_type: newCamSourceType,
      source_path: newCamSourcePath,
      location: newCamLocation,
      fps: 30.0,
      resolution: '1280x720'
    });

    setShowAddModal(false);
    setNewCamName('');
    setNewCamSourcePath('demo_synthetic');
    setUploadMessage('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="bg-[#171717] p-4 rounded-lg border border-[#333333] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Camera Surveillance Sources
          </h3>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            Configure CCTV streams, RTSP feeds, uploaded traffic videos, and webcam inputs
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#E5E5E5] text-black text-xs font-medium rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Camera Feed
        </button>
      </div>

      {/* Camera Grid */}
      {cameras.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cameras.map((cam) => {
            const isProcessing = cam.status === 'PROCESSING';

            return (
              <div
                key={cam.id}
                className="bg-[#171717] rounded-lg border border-[#333333] p-5 flex flex-col justify-between hover:border-[#404040] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-[#1F1F1F] border border-[#333333] flex items-center justify-center text-white">
                        <Video className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{cam.name}</h4>
                        <span className="text-[11px] font-mono text-[#A3A3A3]">{cam.id}</span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] font-mono font-medium rounded border ${
                      isProcessing 
                        ? 'bg-[#14231A] text-[#6BB388] border-[#2A4C37]' 
                        : 'bg-[#1F1F1F] text-[#A3A3A3] border-[#333333]'
                    }`}>
                      {cam.status}
                    </span>
                  </div>

                  {/* Attributes */}
                  <div className="mt-4 p-3 bg-[#1F1F1F] rounded-md border border-[#262626] space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#A3A3A3]">Location:</span>
                      <span className="font-medium text-white">{cam.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A3A3A3]">Source Type:</span>
                      <span className="font-mono text-white">{cam.source_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A3A3A3]">Resolution:</span>
                      <span className="font-mono text-white">{cam.resolution} @ {cam.fps} FPS</span>
                    </div>
                    <div className="pt-1.5 border-t border-[#262626] text-[11px] font-mono text-[#737373] truncate">
                      Path: {cam.source_path}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-[#262626] flex items-center justify-between">
                  <button
                    onClick={() => onDeleteCamera(cam.id)}
                    className="p-1.5 text-[#A3A3A3] hover:text-[#DE7171] rounded transition-colors"
                    title="Remove Camera"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    {!isProcessing ? (
                      <button
                        onClick={() => onStartProcessing(cam.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-[#E5E5E5] text-black text-xs font-medium rounded-md transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Start Pipeline
                      </button>
                    ) : (
                      <button
                        onClick={() => onStopProcessing(cam.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#2A1313] text-[#DE7171] border border-[#5B2323] text-xs font-medium rounded-md transition-colors"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        Stop Pipeline
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#171717] rounded-lg border border-[#333333] p-12 text-center">
          <Camera className="w-8 h-8 mx-auto text-[#404040] mb-2" />
          <h4 className="text-sm font-semibold text-white">No cameras configured</h4>
          <p className="text-xs text-[#A3A3A3] mt-1 max-w-sm mx-auto">
            Connect a video feed source or upload a traffic test clip to begin real-time vehicle monitoring.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-3.5 py-1.5 bg-white hover:bg-[#E5E5E5] text-black text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Camera Feed
          </button>
        </div>
      )}

      {/* Add Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171717] border border-[#333333] rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-modal relative animate-in fade-in zoom-in-95 duration-150">
            
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 text-[#A3A3A3] hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#A3A3A3]">
                Source Configuration
              </span>
              <h3 className="text-base font-semibold text-white mt-0.5">
                Configure New Camera Feed
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              
              <div>
                <label className="block text-white font-medium mb-1">Camera Name</label>
                <input
                  type="text"
                  required
                  value={newCamName}
                  onChange={(e) => setNewCamName(e.target.value)}
                  placeholder="e.g. North Expressway Sector 12"
                  className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md px-3 py-2 text-white placeholder-[#737373] focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-1">Location Description</label>
                <input
                  type="text"
                  value={newCamLocation}
                  onChange={(e) => setNewCamLocation(e.target.value)}
                  placeholder="e.g. Highway Overpass KM 42"
                  className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md px-3 py-2 text-white placeholder-[#737373] focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-1">Source Type</label>
                <select
                  value={newCamSourceType}
                  onChange={(e) => {
                    setNewCamSourceType(e.target.value);
                    if (e.target.value === 'DEMO_SYNTHETIC') {
                      setNewCamSourcePath('demo_synthetic');
                    } else if (e.target.value === 'WEBCAM') {
                      setNewCamSourcePath('0');
                    }
                  }}
                  className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md px-3 py-2 text-white focus:outline-none focus:border-white transition-colors"
                >
                  <option value="DEMO_SYNTHETIC" className="bg-[#171717] text-white">Synthetic Highway Simulation (Demo Mode)</option>
                  <option value="VIDEO_FILE" className="bg-[#171717] text-white">Uploaded Video File</option>
                  <option value="WEBCAM" className="bg-[#171717] text-white">Local Webcam (Device Index 0)</option>
                  <option value="RTSP" className="bg-[#171717] text-white">RTSP Video Stream URL</option>
                </select>
              </div>

              {/* Upload video file field */}
              {newCamSourceType === 'VIDEO_FILE' && (
                <div className="p-3 bg-[#1F1F1F] rounded-md border border-[#333333] space-y-2">
                  <label className="block text-white font-medium flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#D4D4D4]" />
                    Upload Traffic Video File (MP4 / AVI / MKV)
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="text-xs text-[#A3A3A3] file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-[#404040] file:text-xs file:font-medium file:bg-[#171717] file:text-white hover:file:bg-[#262626] cursor-pointer"
                  />
                  {uploadMessage && (
                    <p className="text-[11px] text-white font-mono pt-1">{uploadMessage}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-white font-medium mb-1">Source Path / URL</label>
                <input
                  type="text"
                  required
                  value={newCamSourcePath}
                  onChange={(e) => setNewCamSourcePath(e.target.value)}
                  placeholder="e.g. demo_synthetic or rtsp://192.168.1.100/stream"
                  className="w-full bg-[#1F1F1F] border border-[#404040] rounded-md px-3 py-2 text-white placeholder-[#737373] font-mono focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#333333]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 bg-[#1F1F1F] hover:bg-[#262626] text-[#A3A3A3] hover:text-white border border-[#404040] text-xs font-medium rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-1.5 bg-white hover:bg-[#E5E5E5] text-black text-xs font-medium rounded-md transition-colors"
                >
                  Create Camera Feed
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
