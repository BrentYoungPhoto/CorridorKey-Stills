import React, { useCallback, useRef } from "react";
import { useAppStore } from "../stores/appStore.js";

export default function ParameterPanel() {
  const params = useAppStore((s) => s.params);
  const updateParam = useAppStore((s) => s.updateParam);
  const runPreview = useAppStore((s) => s.runPreview);
  const runFullKey = useAppStore((s) => s.runFullKey);
  const isProcessing = useAppStore((s) => s.isProcessing);
  const sourceImage = useAppStore((s) => s.sourceImage);
  const debounceRef = useRef(null);

  const handleChange = useCallback(
    (key, value) => {
      updateParam(key, value);
      // Debounced preview on parameter change
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runPreview(), 300);
    },
    [updateParam, runPreview]
  );

  return (
    <div className="parameter-panel">
      <h2>Parameters</h2>

      <div className="param-group">
        <label>
          Despill Strength
          <span className="param-value">{params.despill_strength.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={params.despill_strength}
          onChange={(e) =>
            handleChange("despill_strength", parseFloat(e.target.value))
          }
        />
      </div>

      <div className="param-group">
        <label>
          <input
            type="checkbox"
            checked={params.auto_despeckle}
            onChange={(e) => handleChange("auto_despeckle", e.target.checked)}
          />
          Auto Despeckle
        </label>
      </div>

      {params.auto_despeckle && (
        <div className="param-group">
          <label>
            Despeckle Size
            <span className="param-value">{params.despeckle_size}</span>
          </label>
          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={params.despeckle_size}
            onChange={(e) =>
              handleChange("despeckle_size", parseInt(e.target.value))
            }
          />
        </div>
      )}

      <div className="param-group">
        <label>
          Refiner Scale
          <span className="param-value">{params.refiner_scale.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="3"
          step="0.1"
          value={params.refiner_scale}
          onChange={(e) =>
            handleChange("refiner_scale", parseFloat(e.target.value))
          }
        />
      </div>

      <div className="param-group">
        <label>
          <input
            type="checkbox"
            checked={params.input_is_linear}
            onChange={(e) => handleChange("input_is_linear", e.target.checked)}
          />
          Input is Linear (EXR)
        </label>
      </div>

      <div className="param-actions">
        <button
          className="btn btn-preview"
          onClick={runPreview}
          disabled={isProcessing || !sourceImage}
        >
          {isProcessing ? "Processing..." : "Preview"}
        </button>
        <button
          className="btn btn-export"
          onClick={runFullKey}
          disabled={isProcessing || !sourceImage}
        >
          Full Resolution
        </button>
      </div>
    </div>
  );
}
