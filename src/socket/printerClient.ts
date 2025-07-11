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

    // Periodic status check every 5 seconds to ensure consistency
    setInterval(() => {
      if (this.restaurantId && this.socket?.connected) {
        this.checkPrinterStatus();
      }
    }, 5000);
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

      // If printer becomes available and we don't have a socket connection, try to reconnect
      if (available && (!this.socket || !this.socket.connected)) {
        console.log(
          "🖨️ Printer available but socket disconnected, attempting to reconnect..."
        );
        this.connect();
        // Note: joinPrinter will be called automatically in the connect() method
        // when the socket connects, so we don't need to call it here
      }

      // If printer becomes unavailable, emit error status to ensure backend knows
      if (!available && this.restaurantId && this.socket) {
        console.log("🖨️ Emitting printer error status due to unavailability");
        this.socket.emit("printerError", {
          restaurantId: this.restaurantId,
          error: "Printer disconnected",
        });
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
        // Emit printer status after joining with a delay to ensure room is joined
        setTimeout(() => {
          // Force a status check to ensure we have the latest status
          this.checkPrinterStatus();
        }, 1000);
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

    // Listen for forced status check requests
    this.socket.on("forcePrinterStatusCheck", async () => {
      console.log("🖨️ Forced printer status check requested");
      try {
        const available = await this.printerService.forceStatusCheck();
        this.printerAvailable = available;
        this.emitPrinterStatus();
      } catch (error) {
        console.error("🖨️ Error during forced status check:", error);
        this.printerAvailable = false;
        this.emitPrinterStatus();
      }
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
