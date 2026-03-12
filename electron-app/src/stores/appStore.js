import { create } from "zustand";

export const useAppStore = create((set, get) => ({
  // Backend connection
  backendUrl: null,
  backendStatus: "connecting", // "connecting" | "ready" | "error"

  // Image state
  sourceImage: null, // { file: File, dataUrl: string, width, height }
  maskImage: null, // optional alpha hint

  // Processing results (base64 PNG strings)
  result: null, // { alpha, foreground, composite, processed, width, height }

  // Parameters
  params: {
    input_is_linear: false,
    despill_strength: 1.0,
    auto_despeckle: true,
    despeckle_size: 400,
    refiner_scale: 1.0,
  },

  // View mode
  viewMode: "composite", // "composite" | "alpha" | "foreground" | "original"

  // Processing state
  isProcessing: false,
  processingTime: null,

  // GPU info
  gpuInfo: null, // { name, vram_total_gb, vram_free_gb }

  // Actions
  setBackendStatus: (status) => set({ backendStatus: status }),

  initBackend: async () => {
    if (!window.corridorKey) return;
    const url = await window.corridorKey.getBackendUrl();
    set({ backendUrl: url });
  },

  setSourceImage: (image) => set({ sourceImage: image, result: null }),
  setMaskImage: (mask) => set({ maskImage: mask }),
  setResult: (result) => set({ result }),
  setViewMode: (mode) => set({ viewMode: mode }),

  updateParam: (key, value) =>
    set((state) => ({
      params: { ...state.params, [key]: value },
    })),

  setProcessing: (isProcessing, time = null) =>
    set({ isProcessing, processingTime: time }),

  setGpuInfo: (info) => set({ gpuInfo: info }),

  // Run preview (debounced in component)
  runPreview: async () => {
    const { backendUrl, sourceImage, maskImage, params } = get();
    if (!backendUrl || !sourceImage) return;

    set({ isProcessing: true });

    try {
      const formData = new FormData();
      formData.append("image", sourceImage.file);
      if (maskImage) {
        formData.append("mask", maskImage.file);
      }
      Object.entries(params).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      const response = await fetch(`${backendUrl}/api/v1/preview`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Preview failed: ${response.statusText}`);
      }

      const result = await response.json();
      set({
        result,
        isProcessing: false,
        processingTime: result.processing_time_ms,
      });
    } catch (err) {
      console.error("Preview failed:", err);
      set({ isProcessing: false });
    }
  },

  // Run full-resolution keying
  runFullKey: async () => {
    const { backendUrl, sourceImage, maskImage, params } = get();
    if (!backendUrl || !sourceImage) return;

    set({ isProcessing: true });

    try {
      const formData = new FormData();
      formData.append("image", sourceImage.file);
      if (maskImage) {
        formData.append("mask", maskImage.file);
      }
      Object.entries(params).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      const response = await fetch(`${backendUrl}/api/v1/key`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Keying failed: ${response.statusText}`);
      }

      const result = await response.json();
      set({
        result,
        isProcessing: false,
        processingTime: result.processing_time_ms,
      });
    } catch (err) {
      console.error("Full key failed:", err);
      set({ isProcessing: false });
    }
  },

  // Fetch GPU info from health endpoint
  fetchHealth: async () => {
    const { backendUrl } = get();
    if (!backendUrl) return;

    try {
      const response = await fetch(`${backendUrl}/api/v1/health`);
      const data = await response.json();
      set({
        backendStatus: "ready",
        gpuInfo: {
          name: data.gpu_name,
          vram_total_gb: data.vram_total_gb,
          vram_free_gb: data.vram_free_gb,
        },
      });
    } catch {
      set({ backendStatus: "error" });
    }
  },
}));
