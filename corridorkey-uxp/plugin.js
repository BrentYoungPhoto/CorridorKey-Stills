/**
 * CorridorKey UXP Plugin — Photoshop panel for neural green screen keying.
 *
 * Communicates with the CorridorKey FastAPI backend running on localhost.
 * The backend must be started separately (via the Electron app or manually).
 */

const { app, imaging } = require("photoshop");
const { batchPlay } = require("photoshop").action;

// --- State ---
let serverUrl = "http://127.0.0.1:8741";
let isConnected = false;

// --- DOM References ---
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const serverPort = document.getElementById("server-port");
const btnConnect = document.getElementById("btn-connect");
const btnKey = document.getElementById("btn-key");
const btnPreview = document.getElementById("btn-preview");
const previewImage = document.getElementById("preview-image");
const previewPlaceholder = document.getElementById("preview-placeholder");
const processingStatus = document.getElementById("processing-status");
const processingText = document.getElementById("processing-text");
const outputMode = document.getElementById("output-mode");

// Sliders
const despillSlider = document.getElementById("despill-strength");
const despillValue = document.getElementById("despill-value");
const despeckleCheck = document.getElementById("auto-despeckle");
const despeckleSizeRow = document.getElementById("despeckle-size-row");
const despeckleSizeSlider = document.getElementById("despeckle-size");
const despeckleSizeValue = document.getElementById("despeckle-value");
const refinerSlider = document.getElementById("refiner-scale");
const refinerValue = document.getElementById("refiner-value");
const linearCheck = document.getElementById("input-is-linear");

// --- Helpers ---

function getParams() {
  return {
    input_is_linear: linearCheck.checked,
    despill_strength: parseFloat(despillSlider.value),
    auto_despeckle: despeckleCheck.checked,
    despeckle_size: parseInt(despeckleSizeSlider.value),
    refiner_scale: parseFloat(refinerSlider.value),
  };
}

function setStatus(state, text) {
  statusDot.className = `dot ${state}`;
  statusText.textContent = text;
  isConnected = state === "connected";
  btnKey.disabled = !isConnected;
  btnPreview.disabled = !isConnected;
}

function showProcessing(text) {
  processingStatus.classList.remove("hidden");
  processingText.textContent = text;
}

function hideProcessing() {
  processingStatus.classList.add("hidden");
}

/**
 * Read the active layer's pixel data as a PNG blob.
 */
async function getActiveLayerPixels() {
  const doc = app.activeDocument;
  if (!doc) throw new Error("No active document");

  const layer = doc.activeLayers[0];
  if (!layer) throw new Error("No active layer");

  // Use imaging API to get pixel data (PS 25+)
  const pixelData = await imaging.getPixels({
    documentID: doc.id,
    layerID: layer.id,
    targetSize: { width: doc.width, height: doc.height },
  });

  // Convert to PNG via canvas-like approach
  const { imageData } = pixelData;
  const components = imageData.components;
  const width = imageData.width;
  const height = imageData.height;

  // Create a temporary canvas to encode as PNG
  // UXP doesn't have Canvas, so we'll send raw pixel data
  // and let the server handle it. For now, use base64.
  const blob = await pixelData.imageData.convertToBlob({ type: "image/png" });
  return blob;
}

/**
 * Apply keying results back to Photoshop.
 */
async function applyResults(result) {
  const mode = outputMode.value;

  await app.batchPlay(
    [
      // The specific batchPlay descriptors depend on the output mode.
      // This is a framework — each mode creates different PS operations.
    ],
    {}
  );

  if (mode === "layer-mask" || mode === "all") {
    await applyLayerMask(result.alpha);
  }
  if (mode === "new-layer" || mode === "all") {
    await createForegroundLayer(result.foreground);
  }
  if (mode === "alpha-channel" || mode === "all") {
    await createAlphaChannel(result.alpha);
  }
}

/**
 * Apply the alpha matte as a layer mask on the active layer.
 */
async function applyLayerMask(alphaBase64) {
  // Create a temporary file, load as selection, apply as mask
  // This is a simplified framework — full implementation requires
  // batchPlay descriptors for creating masks from pixel data.
  console.log("Layer mask application: implementation requires batchPlay descriptors specific to PS version");
}

/**
 * Create a new layer with the despilled foreground.
 */
async function createForegroundLayer(fgBase64) {
  console.log("Foreground layer creation: implementation requires batchPlay pixel placement");
}

/**
 * Create an alpha channel in the Channels panel.
 */
async function createAlphaChannel(alphaBase64) {
  console.log("Alpha channel creation: implementation requires batchPlay channel descriptors");
}

// --- Backend Communication ---

async function checkConnection() {
  try {
    setStatus("connecting", "Connecting...");
    const response = await fetch(`${serverUrl}/api/v1/health`);
    if (response.ok) {
      const data = await response.json();
      const gpu = data.gpu_name ? ` (${data.gpu_name})` : "";
      setStatus("connected", `Connected${gpu}`);
      return true;
    }
  } catch (e) {
    // Connection failed
  }
  setStatus("disconnected", "Disconnected");
  return false;
}

async function sendToBackend(endpoint, imageBlob) {
  const params = getParams();
  const formData = new FormData();
  formData.append("image", imageBlob, "layer.png");

  Object.entries(params).forEach(([key, value]) => {
    formData.append(key, String(value));
  });

  const response = await fetch(`${serverUrl}/api/v1/${endpoint}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Server error: ${detail}`);
  }

  return response.json();
}

// --- Event Handlers ---

btnConnect.addEventListener("click", () => {
  serverUrl = `http://127.0.0.1:${serverPort.value}`;
  checkConnection();
});

btnPreview.addEventListener("click", async () => {
  try {
    showProcessing("Reading layer pixels...");
    const blob = await getActiveLayerPixels();
    showProcessing("Running preview...");
    const result = await sendToBackend("preview", blob);

    // Show preview in panel
    previewImage.src = `data:image/png;base64,${result.composite}`;
    previewImage.style.display = "block";
    previewPlaceholder.style.display = "none";

    showProcessing(`Done (${(result.processing_time_ms / 1000).toFixed(2)}s)`);
    setTimeout(hideProcessing, 3000);
  } catch (e) {
    showProcessing(`Error: ${e.message}`);
    setTimeout(hideProcessing, 5000);
  }
});

btnKey.addEventListener("click", async () => {
  try {
    showProcessing("Reading layer pixels...");
    const blob = await getActiveLayerPixels();
    showProcessing("Running full-resolution keying...");
    const result = await sendToBackend("key", blob);

    // Show result preview
    previewImage.src = `data:image/png;base64,${result.composite}`;
    previewImage.style.display = "block";
    previewPlaceholder.style.display = "none";

    // Apply to Photoshop
    showProcessing("Applying to document...");
    await applyResults(result);

    showProcessing(`Done (${(result.processing_time_ms / 1000).toFixed(2)}s)`);
    setTimeout(hideProcessing, 3000);
  } catch (e) {
    showProcessing(`Error: ${e.message}`);
    setTimeout(hideProcessing, 5000);
  }
});

// Slider live value updates
despillSlider.addEventListener("input", () => {
  despillValue.textContent = parseFloat(despillSlider.value).toFixed(2);
});

despeckleSizeSlider.addEventListener("input", () => {
  despeckleSizeValue.textContent = despeckleSizeSlider.value;
});

refinerSlider.addEventListener("input", () => {
  refinerValue.textContent = parseFloat(refinerSlider.value).toFixed(1);
});

despeckleCheck.addEventListener("change", () => {
  despeckleSizeRow.style.display = despeckleCheck.checked ? "flex" : "none";
});

// Auto-connect on panel open
checkConnection();
