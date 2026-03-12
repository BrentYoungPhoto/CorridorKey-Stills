/**
 * HTTP client for communicating with the CorridorKey Python backend.
 */

export class BackendClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async health() {
    const res = await fetch(`${this.baseUrl}/api/v1/health`);
    return res.json();
  }

  async settings() {
    const res = await fetch(`${this.baseUrl}/api/v1/settings`);
    return res.json();
  }

  /**
   * Run keying on an image.
   * @param {File} imageFile - Input image file
   * @param {File|null} maskFile - Optional alpha hint mask
   * @param {object} params - Inference parameters
   * @param {string} endpoint - "key" or "preview"
   * @param {AbortSignal} signal - Optional abort signal for cancellation
   */
  async processImage(imageFile, maskFile, params, endpoint = "preview", signal = null) {
    const formData = new FormData();
    formData.append("image", imageFile);
    if (maskFile) {
      formData.append("mask", maskFile);
    }
    Object.entries(params).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const res = await fetch(`${this.baseUrl}/api/v1/${endpoint}`, {
      method: "POST",
      body: formData,
      signal,
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Backend error (${res.status}): ${detail}`);
    }

    return res.json();
  }
}
