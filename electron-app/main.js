/**
 * Electron main process — spawns the Python backend, manages window lifecycle.
 */
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow = null;
let backendProcess = null;
const BACKEND_PORT = 8741;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

// Determine Python backend executable path
function getBackendPath() {
  if (app.isPackaged) {
    // PyInstaller bundle in extraResources
    const ext = process.platform === "win32" ? ".exe" : "";
    return path.join(process.resourcesPath, "backend", `corridorkey-server${ext}`);
  }
  // Development: run Python directly
  return null;
}

// Spawn the Python backend server
function startBackend() {
  const backendPath = getBackendPath();

  if (backendPath) {
    // Packaged: run the PyInstaller binary
    console.log(`Starting backend: ${backendPath}`);
    backendProcess = spawn(backendPath, ["--port", String(BACKEND_PORT)], {
      stdio: ["ignore", "pipe", "pipe"],
    });
  } else {
    // Development: run via Python module
    console.log("Starting backend in dev mode: python -m server.run");
    const projectRoot = path.dirname(__dirname);
    backendProcess = spawn(
      "python",
      ["-m", "server.run", "--port", String(BACKEND_PORT)],
      {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  }

  backendProcess.stdout.on("data", (data) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr.on("data", (data) => {
    console.error(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.on("close", (code) => {
    console.log(`Backend process exited with code ${code}`);
    backendProcess = null;
  });
}

// Poll backend health until ready
async function waitForBackend(maxRetries = 30, intervalMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/health`);
      if (response.ok) {
        console.log("Backend is ready");
        return true;
      }
    } catch {
      // Not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  console.error("Backend failed to start within timeout");
  return false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#1a1a2e",
    title: "CorridorKey Stills",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the renderer (Vite dev server or built files)
  if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC handlers
ipcMain.handle("get-backend-url", () => BACKEND_URL);

ipcMain.handle("open-file-dialog", async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      {
        name: "Images",
        extensions: ["png", "jpg", "jpeg", "tiff", "tif", "exr", "bmp"],
      },
    ],
    ...options,
  });
  return result.filePaths;
});

ipcMain.handle("save-file-dialog", async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: "PNG", extensions: ["png"] },
      { name: "TIFF", extensions: ["tiff", "tif"] },
      { name: "EXR", extensions: ["exr"] },
    ],
    ...options,
  });
  return result.filePath;
});

// App lifecycle
app.whenReady().then(async () => {
  startBackend();
  createWindow();

  // Wait for backend in the background; notify renderer when ready
  const ready = await waitForBackend();
  if (mainWindow) {
    mainWindow.webContents.send("backend-status", ready ? "ready" : "error");
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("will-quit", () => {
  // Gracefully shut down the backend
  if (backendProcess) {
    console.log("Shutting down backend...");
    backendProcess.kill("SIGTERM");
    // Force kill after 5 seconds
    setTimeout(() => {
      if (backendProcess) {
        backendProcess.kill("SIGKILL");
      }
    }, 5000);
  }
});
