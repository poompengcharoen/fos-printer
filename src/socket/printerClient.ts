import {
  OrderWithRelations,
  PrinterService,
  QRCodePrintData,
} from "../services/printerService";
import { Socket, io } from "socket.io-client";

import { RestaurantAttributes } from "../types";
import dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: ".env.local" });

class PrinterSocketClient {
  private socket: Socket | null = null;
  private backendUrl: string;
  private printerService: PrinterService;

  constructor() {
    this.backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
    this.printerService = new PrinterService();
  }

  connect() {
    console.log("🖨️ Connecting to backend at:", this.backendUrl);

    this.socket = io(this.backendUrl);

    this.socket.on("connect", () => {
      console.log("🖨️ Printer connected to backend:", this.socket?.id);
    });

    this.socket.on("disconnect", () => {
      console.log("🖨️ Printer disconnected from backend");
    });

    this.socket.on("connect_error", (error: Error) => {
      console.error("🖨️ Connection error:", error);
    });

    // Listen for print orders
    this.socket.on(
      "printOrder",
      ({
        order,
        restaurant,
      }: {
        order: OrderWithRelations;
        restaurant: RestaurantAttributes;
      }) => {
        console.log("🖨️ Restaurant:", restaurant);
        console.log("🖨️ NEW ORDER RECEIVED:", {
          orderId: order.id,
          tableName: order.table?.name,
          items: order.orderItems?.map((item) => ({
            name: item.food?.name,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions,
          })),
          status: order.status,
          createdAt: order.createdAt,
        });

        console.log("🖨️ Ready to print order:", order.id);

        this.printerService.printOrder(order, restaurant).catch((error) => {
          console.error("🖨️ Error printing order:", error);
        });
      }
    );

    // Listen for QR code printing
    this.socket.on("printQRCode", (data: QRCodePrintData) => {
      console.log("🖨️ QR CODE PRINT REQUEST RECEIVED:", {
        url: data.url,
        title: data.title,
        subtitle: data.subtitle,
        tableName: data.table?.name,
        sessionId: data.sessionId,
      });

      console.log("🖨️ Ready to print QR code for URL:", data.url);

      this.printerService.printQRCode(data).catch((error) => {
        console.error("🖨️ Error printing QR code:", error);
      });
    });

    return this.socket;
  }

  joinRestaurant(restaurantId: string) {
    if (this.socket) {
      this.socket.emit("joinRestaurant", restaurantId);
      console.log("🖨️ Joined restaurant room:", restaurantId);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default PrinterSocketClient;
