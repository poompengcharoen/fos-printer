import PrinterSocketClient from "./socket/printerClient";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import { createServer } from "http";
import dotenv from "dotenv";
import express from "express";
import { setSocketInstance } from "./socket/socketInstance";

// Load environment variables from custom path or default to .env.local
const envPath = process.env.ENV_FILE_PATH || ".env.local";
dotenv.config({ path: envPath });

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*", // adjust to your frontend origin in production
  },
});

// Set the socket instance for use in other modules
setSocketInstance(io);

// Initialize printer client
const printerClient = new PrinterSocketClient();
printerClient.connect();

// Join printer room for the restaurant (replace with actual restaurant ID)
const restaurantId = process.env.RESTAURANT_ID;
if (restaurantId) {
  printerClient.joinPrinter(restaurantId);
  console.log("🖨️ Printer joined restaurant:", restaurantId);
} else {
  console.warn("⚠️ No RESTAURANT_ID provided in environment variables");
}

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("🖨️ Printer service is running!");
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  console.log(`\n🖨️ Received ${signal}. Starting graceful shutdown...`);

  // Disconnect printer client
  printerClient.disconnect();

  // Close socket.io server
  io.close(() => {
    console.log("🖨️ Socket.io server closed");
  });

  // Close HTTP server
  server.close(() => {
    console.log("🖨️ HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error(
      "🖨️ Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10000);
};

// Listen for shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
