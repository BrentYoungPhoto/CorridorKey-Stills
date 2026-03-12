import React, { useEffect } from "react";
import { useAppStore } from "./stores/appStore.js";
import ImageDropzone from "./components/ImageDropzone.jsx";
import ParameterPanel from "./components/ParameterPanel.jsx";
import PreviewCanvas from "./components/PreviewCanvas.jsx";
import StatusBar from "./components/StatusBar.jsx";
import OutputPanel from "./components/OutputPanel.jsx";

export default function App() {
  const backendStatus = useAppStore((s) => s.backendStatus);
  const setBackendStatus = useAppStore((s) => s.setBackendStatus);
  const initBackend = useAppStore((s) => s.initBackend);

  useEffect(() => {
    // Listen for backend status from main process
    if (window.corridorKey) {
      window.corridorKey.onBackendStatus((status) => {
        setBackendStatus(status);
      });
      initBackend();
    }
  }, []);

  return (
    <div className="app-container">
      <div className="toolbar">
        <h1 className="app-title">CorridorKey Stills</h1>
        <OutputPanel />
      </div>

      <div className="main-content">
        <div className="center-panel">
          {backendStatus === "ready" ? <PreviewCanvas /> : <ImageDropzone />}
        </div>
        <div className="right-panel">
          <ParameterPanel />
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
