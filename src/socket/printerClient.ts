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

  private async retryPrintOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.log(`🖨️ Print attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`🖨️ Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Reset device state before retry
          this.printerService.resetDevice();
        }
      }
    }

    throw lastError!;
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
          await this.retryPrintOperation(() =>
            this.printerService.printOrder(order, restaurant)
          );
          console.log("🖨️ Order printed successfully:", order.id);
        } catch (error) {
          console.error("🖨️ Error printing order after retries:", error);
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
        await this.retryPrintOperation(() =>
          this.printerService.printQRCode(data)
        );
        console.log("🖨️ QR code printed successfully");
      } catch (error) {
        console.error("🖨️ Error printing QR code after retries:", error);
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

          // If printer becomes available after being unavailable, reset device state
          if (available) {
            console.log(
              "🖨️ Printer is available, ensuring device state is reset"
            );
            this.printerService.resetDevice();
          }

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
