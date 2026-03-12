import React, { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../stores/appStore.js";
import { fileToDataUrl } from "../services/imageUtils.js";
import ImageDropzone from "./ImageDropzone.jsx";

export default function PreviewCanvas() {
  const canvasRef = useRef(null);
  const sourceImage = useAppStore((s) => s.sourceImage);
  const result = useAppStore((s) => s.result);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const setSourceImage = useAppStore((s) => s.setSourceImage);
  const runPreview = useAppStore((s) => s.runPreview);

  // Draw the current view to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let imageSrc = null;

    if (viewMode === "original" && sourceImage) {
      imageSrc = sourceImage.dataUrl;
    } else if (result) {
      const map = {
        composite: result.composite,
        alpha: result.alpha,
        foreground: result.foreground,
      };
      const base64 = map[viewMode] || result.composite;
      imageSrc = `data:image/png;base64,${base64}`;
    } else if (sourceImage) {
      imageSrc = sourceImage.dataUrl;
    }

    if (!imageSrc) {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageSrc;
  }, [result, viewMode, sourceImage]);

  // Handle file drop on canvas
  const handleFile = useCallback(
    async (file) => {
      if (!file || !file.type.startsWith("image/")) return;
      const { getImageDimensions } = await import("../services/imageUtils.js");
      const [dataUrl, dims] = await Promise.all([
        fileToDataUrl(file),
        getImageDimensions(file),
      ]);
      setSourceImage({ file, dataUrl, ...dims });
      // Auto-preview after loading
      setTimeout(() => runPreview(), 100);
    },
    [setSourceImage, runPreview]
  );

  const onDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  if (!sourceImage) {
    return <ImageDropzone />;
  }

  return (
    <div className="preview-container">
      <div className="view-modes">
        {["composite", "alpha", "foreground", "original"].map((mode) => (
          <button
            key={mode}
            className={`view-mode-btn ${viewMode === mode ? "active" : ""}`}
            onClick={() => setViewMode(mode)}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>
      <div
        className="canvas-wrapper"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} className="preview-canvas" />
      </div>
    </div>
  );
}
