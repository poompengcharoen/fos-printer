import { Socket, io } from "socket.io-client";
import {
  PrinterService,
  type OrderWithRelations,
  type QRCodePrintData,
} from "../services/printerService";
import type { RestaurantAttributes } from "../types";

class PrinterSocketClient {
  private socket: Socket | null = null;
  private backendUrl: string;
  private printerService: PrinterService;
  private restaurantId: string | null = null;
  private statusInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
    this.printerService = new PrinterService();
  }

  connect() {
    console.log("🖨️ Connecting to backend at:", this.backendUrl);

    this.socket = io(this.backendUrl);

    this.socket.on("connect", () => {
      console.log("🖨️ Printer connected to backend:", this.socket?.id);

      // Join printer room for the restaurant if restaurantId is set
      if (this.restaurantId) {
        this.joinPrinter(this.restaurantId);
        // Start status broadcasting
        this.startStatusBroadcasting();
      }
    });

    this.socket.on("disconnect", () => {
      console.log("🖨️ Printer disconnected from backend");
      this.stopStatusBroadcasting();
    });

    this.socket.on("connect_error", (error: Error) => {
      console.error("🖨️ Connection error:", error);
    });

    // Listen for print orders
    this.socket.on(
      "printOrder",
      async ({
        order,
        restaurant,
      }: {
        order: OrderWithRelations;
        restaurant: RestaurantAttributes;
      }) => {
        console.log("🖨️ NEW ORDER RECEIVED:", {
          orderId: order.id,
          tableName: order.table?.name,
          items: order.orderItems?.map((item: any) => ({
            name: item.food?.name,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions,
          })),
          status: order.status,
          createdAt: order.createdAt,
        });

        try {
          await this.printerService.printOrder(order, restaurant);
          console.log("🖨️ Order printed successfully:", order.id);
        } catch (error) {
          console.error("🖨️ Error printing order:", error);
        }
      }
    );

    // Listen for QR code printing
    this.socket.on("printQRCode", async (data: QRCodePrintData) => {
      console.log("🖨️ QR CODE PRINT REQUEST RECEIVED:", {
        url: data.url,
        title: data.title,
        subtitle: data.subtitle,
        tableName: data.table?.name,
        sessionId: data.sessionId,
      });

      try {
        await this.printerService.printQRCode(data);
        console.log("🖨️ QR code printed successfully");
      } catch (error) {
        console.error("🖨️ Error printing QR code:", error);
      }
    });
  }

  joinPrinter(restaurantId: string) {
    this.restaurantId = restaurantId;
    if (this.socket) {
      this.socket.emit("joinPrinter", restaurantId);
      console.log("🖨️ Printer joined restaurant:", restaurantId);
    }
  }

  private startStatusBroadcasting() {
    // Stop any existing interval
    this.stopStatusBroadcasting();

    // Broadcast status every 5 seconds
    this.statusInterval = setInterval(async () => {
      if (this.socket && this.restaurantId) {
        try {
          const available = await this.printerService.isPrinterAvailable();
          console.log("🖨️ Printer status:", available);
          this.socket.emit("printerStatus", {
            restaurantId: this.restaurantId,
            available,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("🖨️ Error checking printer status:", error);
          // Emit unavailable status on error
          this.socket.emit("printerStatus", {
            restaurantId: this.restaurantId,
            available: false,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }, 5000); // Every 5 seconds

    console.log("🖨️ Started status broadcasting every 5 seconds");
  }

  private stopStatusBroadcasting() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
      console.log("🖨️ Stopped status broadcasting");
    }
  }

  disconnect() {
    this.stopStatusBroadcasting();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default PrinterSocketClient;
