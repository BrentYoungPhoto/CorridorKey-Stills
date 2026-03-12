import React, { useCallback } from "react";
import { useAppStore } from "../stores/appStore.js";
import { fileToDataUrl, getImageDimensions } from "../services/imageUtils.js";

export default function ImageDropzone() {
  const setSourceImage = useAppStore((s) => s.setSourceImage);
  const backendStatus = useAppStore((s) => s.backendStatus);

  const handleFile = useCallback(
    async (file) => {
      if (!file || !file.type.startsWith("image/")) return;
      const [dataUrl, dims] = await Promise.all([
        fileToDataUrl(file),
        getImageDimensions(file),
      ]);
      setSourceImage({ file, dataUrl, ...dims });
    },
    [setSourceImage]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e) => e.preventDefault();

  const onClickOpen = async () => {
    if (window.corridorKey) {
      const paths = await window.corridorKey.openFileDialog();
      if (paths && paths.length > 0) {
        const response = await fetch(`file://${paths[0]}`);
        const blob = await response.blob();
        const file = new File([blob], paths[0].split("/").pop(), {
          type: blob.type,
        });
        handleFile(file);
      }
    }
  };

  const statusText =
    backendStatus === "connecting"
      ? "Connecting to backend..."
      : backendStatus === "error"
        ? "Backend connection failed"
        : "Backend ready";

  return (
    <div className="dropzone" onDrop={onDrop} onDragOver={onDragOver}>
      <div className="dropzone-content">
        <div className="dropzone-icon">&#128444;</div>
        <p className="dropzone-text">
          Drop an image here or{" "}
          <button className="link-button" onClick={onClickOpen}>
            browse
          </button>
        </p>
        <p className="dropzone-hint">PNG, TIFF, JPEG, EXR</p>
        <p className={`status-text status-${backendStatus}`}>{statusText}</p>
      </div>
    </div>
  );
}
