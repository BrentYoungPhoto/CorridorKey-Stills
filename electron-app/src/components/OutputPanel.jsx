import React from "react";
import { useAppStore } from "../stores/appStore.js";
import { downloadBase64Image } from "../services/imageUtils.js";

export default function OutputPanel() {
  const result = useAppStore((s) => s.result);

  if (!result) return null;

  const handleExport = (type) => {
    const map = {
      alpha: { data: result.alpha, name: "alpha.png" },
      foreground: { data: result.foreground, name: "foreground.png" },
      composite: { data: result.composite, name: "composite.png" },
      processed: { data: result.processed, name: "processed_rgba.png" },
    };
    const item = map[type];
    if (item) {
      downloadBase64Image(item.data, item.name);
    }
  };

  return (
    <div className="output-panel">
      <button className="btn btn-sm" onClick={() => handleExport("alpha")}>
        Save Alpha
      </button>
      <button className="btn btn-sm" onClick={() => handleExport("foreground")}>
        Save FG
      </button>
      <button className="btn btn-sm" onClick={() => handleExport("composite")}>
        Save Comp
      </button>
      <button className="btn btn-sm" onClick={() => handleExport("processed")}>
        Save RGBA
      </button>
    </div>
  );
}
