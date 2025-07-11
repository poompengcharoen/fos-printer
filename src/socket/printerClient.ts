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
  private restaurantId: string | null = null;
  private printerAvailable: boolean = false;

  constructor() {
    this.backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
    this.printerService = new PrinterService();

    // Set up printer status monitoring
    this.setupPrinterMonitoring();

    // Initial availability check
    this.checkPrinterAvailability();
  }

  private setupPrinterMonitoring(): void {
    // Register callback for printer status changes
    this.printerService.onStatusChange((available: boolean) => {
      console.log(
        `🖨️ Printer status changed to: ${
          available ? "Available" : "Not available"
        }`
      );
      this.printerAvailable = available;

      // Automatically emit status to backend when it changes
      if (this.restaurantId && this.socket) {
        this.emitPrinterStatus();
      }
    });
  }

  private async checkPrinterAvailability() {
    try {
      this.printerAvailable = await this.printerService.isPrinterAvailable();
      console.log(
        "🖨️ Printer availability check:",
        this.printerAvailable ? "Available" : "Not available"
      );

      // Emit printer status if we have a restaurant ID and socket connection
      if (this.restaurantId && this.socket) {
        this.emitPrinterStatus();
      }
    } catch (error) {
      console.log("🖨️ Printer availability check failed:", error);
      this.printerAvailable = false;
    }
  }

  private emitPrinterStatus() {
    if (this.socket && this.restaurantId) {
      this.socket.emit("printerStatus", {
        restaurantId: this.restaurantId,
        available: this.printerAvailable,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async checkPrinterStatus(): Promise<boolean> {
    try {
      this.printerAvailable = await this.printerService.isPrinterAvailable();
      console.log(
        "🖨️ Printer status check:",
        this.printerAvailable ? "Available" : "Not available"
      );
      this.emitPrinterStatus();
      return this.printerAvailable;
    } catch (error) {
      console.log("🖨️ Printer status check failed:", error);
      this.printerAvailable = false;
      this.emitPrinterStatus();
      return false;
    }
  }

  connect() {
    console.log("🖨️ Connecting to backend at:", this.backendUrl);

    this.socket = io(this.backendUrl);

    this.socket.on("connect", () => {
      console.log("🖨️ Printer connected to backend:", this.socket?.id);

      // Join printer room for the restaurant if restaurantId is set
      if (this.restaurantId) {
        this.joinPrinter(this.restaurantId);
        // Emit printer status after joining
        setTimeout(() => this.emitPrinterStatus(), 1000);
      }
    });

    this.socket.on("disconnect", () => {
      console.log("🖨️ Printer disconnected from backend");
    });

    this.socket.on("connect_error", (error: Error) => {
      console.error("🖨️ Connection error:", error);
      // Emit printer unavailable status if we have a restaurant ID
      if (this.restaurantId && this.socket) {
        this.socket.emit("printerError", {
          restaurantId: this.restaurantId,
          error: "Connection failed",
        });
      }
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

        // Check if printer is available before attempting to print
        if (!this.printerAvailable) {
          console.error("🖨️ Cannot print order: Printer not available");
          if (this.socket && this.restaurantId) {
            this.socket.emit("printerError", {
              restaurantId: this.restaurantId,
              error: "Printer not available",
              orderId: order.id,
            });
          }
          return;
        }

        this.printerService.printOrder(order, restaurant).catch((error) => {
          console.error("🖨️ Error printing order:", error);
          // Emit printer error status
          if (this.socket && this.restaurantId) {
            this.socket.emit("printerError", {
              restaurantId: this.restaurantId,
              error: "Print failed",
              orderId: order.id,
              details: error.message,
            });
          }
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

      // Check if printer is available before attempting to print
      if (!this.printerAvailable) {
        console.error("🖨️ Cannot print QR code: Printer not available");
        if (this.socket && this.restaurantId) {
          this.socket.emit("printerError", {
            restaurantId: this.restaurantId,
            error: "Printer not available",
            url: data.url,
          });
        }
        return;
      }

      this.printerService.printQRCode(data).catch((error) => {
        console.error("🖨️ Error printing QR code:", error);
        // Emit printer error status
        if (this.socket && this.restaurantId) {
          this.socket.emit("printerError", {
            restaurantId: this.restaurantId,
            error: "QR print failed",
            url: data.url,
            details: error.message,
          });
        }
      });
    });

    // Listen for printer status check requests
    this.socket.on("checkPrinterStatus", async () => {
      console.log("🖨️ Printer status check requested");
      await this.checkPrinterStatus();
    });

    return this.socket;
  }

  joinPrinter(restaurantId: string) {
    this.restaurantId = restaurantId;
    if (this.socket) {
      this.socket.emit("joinPrinter", restaurantId);
      console.log("🖨️ Joined printer room for restaurant:", restaurantId);
      // Emit printer status after joining
      setTimeout(() => this.emitPrinterStatus(), 1000);
    }
  }

  joinRestaurant(restaurantId: string) {
    this.restaurantId = restaurantId;
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

    // Clean up printer service
    if (this.printerService) {
      this.printerService.destroy();
    }
  }
}

export default PrinterSocketClient;
