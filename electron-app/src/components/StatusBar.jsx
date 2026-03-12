import React, { useEffect } from "react";
import { useAppStore } from "../stores/appStore.js";

export default function StatusBar() {
  const backendStatus = useAppStore((s) => s.backendStatus);
  const gpuInfo = useAppStore((s) => s.gpuInfo);
  const isProcessing = useAppStore((s) => s.isProcessing);
  const processingTime = useAppStore((s) => s.processingTime);
  const fetchHealth = useAppStore((s) => s.fetchHealth);

  useEffect(() => {
    // Poll health every 10 seconds
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <div className="status-bar">
      <span className={`status-dot status-${backendStatus}`} />
      <span className="status-label">
        {backendStatus === "ready"
          ? "Connected"
          : backendStatus === "connecting"
            ? "Connecting..."
            : "Disconnected"}
      </span>

      {gpuInfo?.name && (
        <span className="gpu-info">
          {gpuInfo.name}
          {gpuInfo.vram_total_gb && ` (${gpuInfo.vram_total_gb} GB)`}
        </span>
      )}

      {isProcessing && <span className="processing-indicator">Processing...</span>}

      {processingTime && !isProcessing && (
        <span className="timing">{(processingTime / 1000).toFixed(2)}s</span>
      )}
    </div>
  );
}
