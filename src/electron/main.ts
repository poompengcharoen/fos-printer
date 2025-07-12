import * as fs from "fs";
import * as path from "path";

import { BrowserWindow, IpcMainInvokeEvent, app, ipcMain } from "electron";

import { PrinterService } from "../services/printerService";
import { spawn } from "child_process";

let mainWindow: BrowserWindow | null = null;
let printerProcess: any = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "../assets/icon.png"),
    title: "Food Order Printer",
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
      // Create .env.local file with the provided configuration
      const envContent = `RESTAURANT_ID=${restaurantId}\nBACKEND_URL=${backendUrl.replace(
        /\/$/,
        ""
      )}\n`;
      const envPath = path.join(process.cwd(), ".env.local");

      fs.writeFileSync(envPath, envContent);

      // Start the printer process
      const printerScript = path.join(__dirname, "../app.js");

      printerProcess = spawn("node", [printerScript], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: process.cwd(),
      });

      printerProcess.stdout.on("data", (data: Buffer) => {
        const output = data.toString();
        console.log("Printer output:", output);

        // Send output to renderer
        if (mainWindow) {
          mainWindow.webContents.send("printer-output", output);
        }
      });

      printerProcess.stderr.on("data", (data: Buffer) => {
        const error = data.toString();
        console.error("Printer error:", error);

        // Send error to renderer
        if (mainWindow) {
          mainWindow.webContents.send("printer-error", error);
        }
      });

      printerProcess.on("close", (code: number) => {
        console.log("Printer process closed with code:", code);

        if (mainWindow) {
          mainWindow.webContents.send("printer-closed", code);
        }
      });

      return { success: true, message: "Printer started successfully" };
    } catch (error) {
      console.error("Error starting printer:", error);
      return { success: false, message: `Error starting printer: ${error}` };
    }
  }
);

ipcMain.handle("stop-printer", async (event: IpcMainInvokeEvent) => {
  try {
    if (printerProcess) {
      printerProcess.kill();
      printerProcess = null;
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
