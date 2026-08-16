const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const url = require("url");

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

// ── Electron OAuth Login (browser-based flow) ──
let authServer = null;
let authTimeout = null;
const AUTH_PORT_START = 3847;
const AUTH_PORT_MAX = AUTH_PORT_START + 10;

function startAuthServer(redirectBase) {
  return new Promise((resolve, reject) => {
    function tryPort(port) {
      if (port > AUTH_PORT_MAX) {
        reject(new Error("All ports 3847-3857 are occupied"));
        return;
      }

      const server = http.createServer((req, res) => {
        const parsed = url.parse(req.url, true);

        if (parsed.pathname === "/callback") {
          const code = parsed.query.code;
          const error = parsed.query.error;
          const hash = parsed.hash;

          console.log("[Auth] Callback received on port", port);

          // Send a friendly success page to the browser
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<!DOCTYPE html><html><head><title>Login Successful</title>
<style>body{font-family:system-ui;background:#0f0f14;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.box{text-align:center}.box h1{color:#8b5cf6;margin-bottom:8px}.box p{color:#9ca3af;font-size:14px}</style></head>
<body><div class="box"><h1>✓ Login Successful</h1><p>You can close this tab and return to CholoShikhi.</p></div></body></html>`);

          // Close the server immediately (single-use)
          server.close();
          if (authTimeout) { clearTimeout(authTimeout); authTimeout = null; }

          if (error) {
            console.error("[Auth] OAuth error:", error);
            mainWindow?.webContents.send("auth-data", { type: "error", data: error });
            return;
          }

          if (code) {
            // PKCE flow — Supabase auth code
            console.log("[Auth] Received PKCE code from browser");
            mainWindow?.webContents.send("auth-data", { type: "code", data: code });
          } else if (hash && hash.includes("access_token")) {
            // Implicit flow — tokens in hash
            console.log("[Auth] Received access token from browser");
            mainWindow?.webContents.send("auth-data", { type: "token", data: hash.substring(1) });
          } else {
            console.error("[Auth] Callback has no code or token");
            mainWindow?.webContents.send("auth-data", { type: "error", data: "No auth data in callback" });
          }
        } else {
          // Unknown path — 404
          res.writeHead(404);
          res.end("Not found");
        }
      });

      server.listen(port, "127.0.0.1", () => {
        console.log(`[Auth] Callback server listening on port ${port}`);
        resolve({ server, port });
      });

      server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.log(`[Auth] Port ${port} in use, trying ${port + 1}`);
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });
    }

    tryPort(AUTH_PORT_START);
  });
}

ipcMain.handle("electron-login", async (_event, authUrl) => {
  console.log("[Auth] Starting browser login flow");

  try {
    // Start local callback server
    const { server, port } = await startAuthServer();
    authServer = server;

    // Replace the redirect URI in the auth URL to point to our local server
    // The authUrl from Supabase has redirectTo=<origin>, we change it to localhost
    const localRedirect = `http://127.0.0.1:${port}/callback`;
    const modifiedUrl = new URL(authUrl);
    modifiedUrl.searchParams.set("redirect_to", localRedirect);
    const finalUrl = modifiedUrl.toString();

    console.log("[Auth] Opening browser with URL:", finalUrl.substring(0, 100) + "...");
    shell.openExternal(finalUrl);

    // Timeout after 2 minutes
    authTimeout = setTimeout(() => {
      if (authServer) {
        console.log("[Auth] Login timed out after 2 minutes");
        authServer.close();
        authServer = null;
      }
    }, 120000);

    return { success: true };
  } catch (err) {
    console.error("[Auth] Failed to start auth server:", err.message);
    return { success: false, reason: err.message };
  }
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
