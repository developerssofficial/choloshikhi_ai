const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

// ── Squirrel.Windows installer events ──
if (require("electron-squirrel-startup")) app.quit();

// ── Suppress GPU cache errors on Windows ──
app.commandLine.appendSwitch("disable-gpu-cache");
app.commandLine.appendSwitch("disable-gpu-compositing");

// ── Config ──
const WEB_URL = "https://choloshikhiai.vercel.app/chat";
const DEV_URL = "http://localhost:3000/chat";
const PRELOAD_PATH = path.join(__dirname, "preload.js");
const SPLASH_PATH = path.join(__dirname, "splash.html");
const isDev = process.argv.includes("--dev");

// ── Window state persistence ──
const stateFile = path.join(app.getPath("userData"), "window-state.json");

function loadWindowState() {
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
    if (state.width < 800) state.width = 1200;
    if (state.height < 500) state.height = 800;
    return state;
  } catch {
    return { width: 1200, height: 800, x: undefined, y: undefined, maximized: false };
  }
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const bounds = win.getBounds();
    fs.writeFileSync(stateFile, JSON.stringify({
      width: bounds.width, height: bounds.height,
      x: bounds.x, y: bounds.y, maximized: win.isMaximized(),
    }));
  } catch {}
}

// ── Splash Screen ──
function createSplash() {
  const splash = new BrowserWindow({
    width: 380, height: 320,
    frame: false, resizable: false,
    skipTaskbar: true, alwaysOnTop: true,
    backgroundColor: "#0f0f14",
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splash.loadFile(SPLASH_PATH);
  return splash;
}

// ── Main Window (fully frameless) ──
function createMainWindow() {
  const state = loadWindowState();

  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    backgroundColor: "#0f0f14",
    show: false,
    icon: path.join(__dirname, "..", "assets", "icon.png"),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      cache: true,
    },
  });

  if (state.maximized) win.maximize();

  let splashRef = createSplash();
  win.loadURL(isDev ? DEV_URL : WEB_URL);

  win.webContents.on("dom-ready", () => {
    setTimeout(() => {
      if (splashRef && !splashRef.isDestroyed()) { splashRef.close(); splashRef = null; }
      if (!win.isDestroyed()) { win.show(); win.focus(); }
    }, 400);
  });

  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error(`Load failed: ${code} ${desc}`);
    if (splashRef && !splashRef.isDestroyed()) { splashRef.close(); splashRef = null; }
    if (!win.isDestroyed()) win.show();
  });

  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("Renderer crashed:", details.reason);
    if (splashRef && !splashRef.isDestroyed()) { splashRef.close(); splashRef = null; }
    setTimeout(() => { if (!win.isDestroyed()) win.reload(); }, 1000);
  });

  // Forward maximize/restore state to renderer
  win.on("maximize", () => win.webContents.send("window-maximize-change", true));
  win.on("unmaximize", () => win.webContents.send("window-maximize-change", false));

  win.on("close", () => saveWindowState(win));

  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith("http")) shell.openExternal(targetUrl);
    return { action: "deny" };
  });

  const ua = win.webContents.getUserAgent();
  win.webContents.setUserAgent(ua + " CholoShikhiDesktop/1.0");

  return win;
}

// ══════════════════════════════════════════════════════════════
// IPC Handlers
// ══════════════════════════════════════════════════════════════

let mainWindow = null;

ipcMain.on("window-minimize", () => mainWindow?.minimize());
ipcMain.on("window-maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on("window-close", () => mainWindow?.close());
ipcMain.handle("window-is-maximized", () => mainWindow?.isMaximized() ?? false);

// ── Electron OAuth Login (popup flow) ──
ipcMain.handle("electron-login", async (_event, authUrl) => {
  return new Promise((resolve) => {
    const popup = new BrowserWindow({
      width: 500, height: 620,
      show: true, frame: true,
      title: "CholoShikhi — Login",
      backgroundColor: "#0f0f14",
      parent: mainWindow, modal: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });

    popup.loadURL(authUrl);
    let resolved = false;

    function handleNavigate(navUrl) {
      if (resolved) return;
      try {
        const base = isDev ? DEV_URL.replace("/chat", "") : WEB_URL.replace("/chat", "");
        if (navUrl.startsWith(base)) {
          const urlObj = new URL(navUrl);
          if (urlObj.hash?.includes("access_token")) {
            resolved = true;
            mainWindow?.webContents.send("auth-callback", urlObj.hash.substring(1));
            popup.close();
            resolve({ success: true });
          }
        }
      } catch {}
    }

    popup.webContents.on("will-navigate", (_e, u) => handleNavigate(u));
    popup.webContents.on("did-navigate", (_e, u) => handleNavigate(u));
    popup.webContents.on("did-navigate-in-page", (_e, u) => handleNavigate(u));
    popup.on("closed", () => { if (!resolved) resolve({ success: false, reason: "popup_closed" }); });
    setTimeout(() => {
      if (!resolved && !popup.isDestroyed()) { resolved = true; popup.close(); resolve({ success: false, reason: "timeout" }); }
    }, 120000);
  });
});

ipcMain.handle("electron-logout", async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    await mainWindow.webContents.session.clearStorageData({ storages: ["cookies", "localstorage"] });
  }
  return { success: true };
});

// ══════════════════════════════════════════════════════════════
// App Lifecycle
// ══════════════════════════════════════════════════════════════

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => { mainWindow = createMainWindow(); });
  app.on("window-all-closed", () => { app.quit(); });
}
