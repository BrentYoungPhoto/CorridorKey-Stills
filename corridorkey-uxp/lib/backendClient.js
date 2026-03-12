/**
 * Backend HTTP client for the UXP plugin.
 * Wraps fetch calls to the CorridorKey FastAPI server.
 */

class CorridorKeyClient {
  constructor(baseUrl = "http://127.0.0.1:8741") {
    this.baseUrl = baseUrl;
  }

  setPort(port) {
    this.baseUrl = `http://127.0.0.1:${port}`;
  }

  async health() {
    const res = await fetch(`${this.baseUrl}/api/v1/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json();
  }

  async settings() {
    const res = await fetch(`${this.baseUrl}/api/v1/settings`);
    if (!res.ok) throw new Error(`Settings fetch failed: ${res.status}`);
    return res.json();
  }

  async key(imageBlob, maskBlob, params) {
    return this._process("key", imageBlob, maskBlob, params);
  }

  async preview(imageBlob, maskBlob, params) {
    return this._process("preview", imageBlob, maskBlob, params);
  }

  async _process(endpoint, imageBlob, maskBlob, params) {
    const formData = new FormData();
    formData.append("image", imageBlob, "input.png");

    if (maskBlob) {
      formData.append("mask", maskBlob, "mask.png");
    }

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const res = await fetch(`${this.baseUrl}/api/v1/${endpoint}`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Backend error (${res.status}): ${detail}`);
    }

    return res.json();
  }
}

module.exports = { CorridorKeyClient };
