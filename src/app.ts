import PrinterSocketClient from "./socket/printerClient";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import { createServer } from "http";
import dotenv from "dotenv";
import express from "express";
import { setSocketInstance } from "./socket/socketInstance";

// Load .env.local
dotenv.config({ path: ".env.local" });

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

// Join a specific restaurant room (replace with actual restaurant ID)
printerClient.joinRestaurant(process.env.RESTAURANT_ID as string);

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("🖨️ Printer service is running!");
});

export default app;
