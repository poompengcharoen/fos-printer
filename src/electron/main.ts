import * as path from "path";

import { BrowserWindow, IpcMainInvokeEvent, app, ipcMain } from "electron";

import { PrinterService } from "../services/printerService";
import PrinterSocketClient from "../socket/printerClient";

let mainWindow: BrowserWindow | null = null;
let printerClient: PrinterSocketClient | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.resolve(__dirname, "../assets/icon.png"),
    title: "Food Order System | Printer",
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  // Open DevTools in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

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

// IPC handlers for communication with renderer process
ipcMain.handle(
  "start-printer",
  async (
    event: IpcMainInvokeEvent,
    restaurantId: string,
    backendUrl: string
  ) => {
    try {
      // Set environment variables directly
      process.env.RESTAURANT_ID = restaurantId;
      process.env.BACKEND_URL = backendUrl.replace(/\/$/, "");

      // Create printer client and connect
      printerClient = new PrinterSocketClient();

      // Override console.log to send output to renderer
      const originalLog = console.log;
      const originalError = console.error;

      console.log = (...args: any[]) => {
        const output = args.join(" ");
        originalLog(...args);
        if (mainWindow) {
          mainWindow.webContents.send("printer-output", output + "\n");
        }
      };

      console.error = (...args: any[]) => {
        const output = args.join(" ");
        originalError(...args);
        if (mainWindow) {
          mainWindow.webContents.send("printer-error", output + "\n");
        }
      };

      // Connect to backend
      printerClient.connect();

      return { success: true, message: "Printer started successfully" };
    } catch (error) {
      console.error("Error starting printer:", error);
      return { success: false, message: `Error starting printer: ${error}` };
    }
  }
);

ipcMain.handle("stop-printer", async (event: IpcMainInvokeEvent) => {
  try {
    if (printerClient) {
      printerClient.disconnect();
      printerClient = null;
      return { success: true, message: "Printer stopped successfully" };
    }
    return { success: true, message: "No printer process running" };
  } catch (error) {
    console.error("Error stopping printer:", error);
    return { success: false, message: `Error stopping printer: ${error}` };
  }
});

ipcMain.handle(
  "check-printer-connection",
  async (event: IpcMainInvokeEvent) => {
    try {
      const printerService = new PrinterService();
      const available = await printerService.isPrinterAvailable();
      return {
        success: true,
        connected: available,
        message: available
          ? "Printer is connected and ready"
          : "Printer not detected or unavailable",
      };
    } catch (error) {
      console.error("Error checking printer connection:", error);
      return {
        success: false,
        connected: false,
        message: `Error checking printer: ${error}`,
      };
    }
  }
);
