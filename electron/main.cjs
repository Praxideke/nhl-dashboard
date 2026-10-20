const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const http = require('node:http');
const { fork } = require('node:child_process');

let serverProcess = null;
let mainWindow = null;

function pingServer() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3001/', (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => { req.destroy(); resolve(false); });
  });
}

async function waitForServer(maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const ok = await pingServer();
    if (ok) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

function getResourcePaths() {
  if (app.isPackaged) {
    const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked');
    return {
      serverPath: path.join(unpacked, 'dist-server', 'server.mjs'),
      webDistPath: path.join(unpacked, 'apps', 'web', 'dist'),
    };
  }
  return {
    serverPath: path.join(__dirname, '..', 'dist-server', 'server.mjs'),
    webDistPath: path.join(__dirname, '..', 'apps', 'web', 'dist'),
  };
}

function startServer() {
  const { serverPath, webDistPath } = getResourcePaths();

  console.log('Starting server from:', serverPath);
  console.log('Web dist path:', webDistPath);

  serverProcess = fork(serverPath, [], {
    env: { ...process.env, NODE_ENV: 'production', WEB_DIST_PATH: webDistPath },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    execArgv: [],
  });

  serverProcess.stdout?.on('data', (data) => console.log('[server]', data.toString().trim()));
  serverProcess.stderr?.on('data', (data) => console.error('[server error]', data.toString().trim()));
  serverProcess.on('error', (e) => console.error('[server process error]', e));
  serverProcess.on('exit', (code) => console.log('[server exit]', code));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'NHL Stats',
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#0f1115',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.loadURL('http://localhost:3001');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Диагностика — если загрузка не удалась, показать окно с ошибкой
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[load failed]', errorCode, errorDescription, validatedURL);
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  });

  // Fallback — если ready-to-show не сработал за 5 сек, показать окно
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.warn('ready-to-show did not fire, forcing show');
      mainWindow.show();
    }
  }, 5000);

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  try {
    startServer();
    const ok = await waitForServer();
    if (!ok) console.error('Server did not respond within 15s');
    createWindow();
  } catch (e) {
    console.error('Failed to start:', e);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});
