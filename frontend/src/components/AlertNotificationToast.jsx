import React from 'react';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';

export default function AlertNotificationToast({ alert, onDismiss, onViewDetails }) {
  if (!alert) return null;

  const isCritical = alert.severity === 'CRITICAL' || alert.severity === 'HIGH';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#171717] border border-[#333333] rounded-lg p-4 shadow-modal animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-start justify-between gap-3">
        
        {/* Small restrained indicator */}
        <div className="p-2 rounded-md bg-[#1F1F1F] border border-[#333333] shrink-0 text-white">
          <AlertTriangle className="w-4 h-4 text-white" />
        </div>

        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-medium rounded border ${
              isCritical ? 'bg-[#2E1414] text-[#DE7171] border-[#5B2323]' : 'bg-[#281F0E] text-[#D6AD57] border-[#57431B]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-[#DC4545]' : 'bg-[#C49A42]'}`} />
              {alert.severity || 'ALERT'}
            </span>
            <span className="text-[11px] font-mono text-[#A3A3A3]">
              {alert.camera_id}
            </span>
          </div>

          <h4 className="text-xs font-semibold text-white">
            {alert.event_type ? alert.event_type.replace(/_/g, ' ') : 'Potential Traffic Anomaly'}
          </h4>
          <p className="text-[11px] text-[#A3A3A3] line-clamp-2 leading-tight">
            {alert.description || 'Abrupt deceleration or obstacle detected by tracker.'}
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="text-[#A3A3A3] hover:text-white p-1 rounded transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>

      </div>

      <div className="mt-3 pt-2.5 border-t border-[#262626] flex items-center justify-between text-[11px] font-mono">
        <span className="text-[#A3A3A3]">
          Conf: {Math.round((alert.confidence || 0.8) * 100)}%
        </span>
        <button
          onClick={onViewDetails}
          className="text-white hover:underline flex items-center gap-0.5 font-medium"
        >
          Inspect Incident <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
