import {
  FoodAttributes,
  LocalizedText,
  OrderAttributes,
  OrderItemAttributes,
  RestaurantAttributes,
  TableAttributes,
} from "../types";
import { Image, Printer } from "@node-escpos/core";

import QRCode from "qrcode";
import USB from "@node-escpos/usb-adapter";
import generatePayload from "promptpay-qr";

const locale = (process.env.LOCALE || "en") as keyof LocalizedText;
const currency = process.env.CURRENCY || "THB";

// Extended interfaces for the complete order data from backend
export interface OrderWithRelations extends OrderAttributes {
  table?: TableAttributes;
  orderItems?: Array<
    OrderItemAttributes & {
      food?: FoodAttributes;
    }
  >;
}

// Interface for QR code printing data
export interface QRCodePrintData {
  url: string;
  title?: string;
  subtitle?: string;
  restaurant?: RestaurantAttributes;
  table?: TableAttributes;
  sessionId?: string;
}

// Callback type for printer status changes
export type PrinterStatusCallback = (available: boolean) => void;

export class PrinterService {
  private device: USB | null = null;
  private isInitialized = false;
  private statusCallbacks: PrinterStatusCallback[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastKnownStatus: boolean = false;
  private testDevice: USB | null = null;
  private isPrinting = false; // Flag to prevent monitoring during printing

  constructor() {
    // Don't initialize USB device immediately - do it lazily when needed
    console.log(
      "🖨️ PrinterService initialized (USB device will be initialized when needed)"
    );

    // Start monitoring for USB device changes
    this.startDeviceMonitoring();
  }

  // Add callback for printer status changes
  onStatusChange(callback: PrinterStatusCallback): void {
    this.statusCallbacks.push(callback);
  }

  // Remove callback for printer status changes
  removeStatusCallback(callback: PrinterStatusCallback): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  private startDeviceMonitoring(): void {
    // Prevent multiple monitoring intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Check for device changes every 2 seconds to reduce interference
    this.monitoringInterval = setInterval(async () => {
      // Skip monitoring if currently printing
      if (this.isPrinting) {
        return;
      }

      try {
        const currentStatus = await this.checkDeviceAvailability();

        // Only notify if status has changed
        if (currentStatus !== this.lastKnownStatus) {
          console.log(
            `🖨️ Printer status changed: ${
              this.lastKnownStatus ? "Available" : "Not available"
            } → ${currentStatus ? "Available" : "Not available"}`
          );

          this.lastKnownStatus = currentStatus;
          this.isInitialized = false; // Reset initialization flag
          this.device = null; // Reset device reference

          // Notify all callbacks
          this.statusCallbacks.forEach((callback) => {
            try {
              callback(currentStatus);
            } catch (error) {
              console.error("🖨️ Error in status callback:", error);
            }
          });
        }
      } catch (error) {
        console.error("🖨️ Error during device monitoring:", error);
        // If there's an error, assume device is not available
        if (this.lastKnownStatus !== false) {
          this.lastKnownStatus = false;
          this.isInitialized = false;
          this.device = null;

          // Notify all callbacks
          this.statusCallbacks.forEach((callback) => {
            try {
              callback(false);
            } catch (callbackError) {
              console.error("🖨️ Error in status callback:", callbackError);
            }
          });
        }
      }
    }, 2000); // Increased to 2 seconds

    console.log("🖨️ USB device monitoring started");
  }

  private async checkDeviceAvailability(): Promise<boolean> {
    try {
      // Clean up previous test device if it exists
      if (this.testDevice) {
        try {
          // Remove all listeners to prevent memory leaks
          this.testDevice.removeAllListeners();
          // Close the device connection
          this.testDevice.close();
        } catch (error) {
          console.log("🖨️ Error cleaning up test device:", error);
        }
        this.testDevice = null;
      }

      // Try to create a new USB instance to check if device is available
      this.testDevice = new USB();

      // Set max listeners to prevent warnings
      (this.testDevice as any).setMaxListeners?.(20);

      // Test if we can actually open the device with a timeout
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log("🖨️ USB device check timeout");
          resolve(false);
        }, 2000); // Reduced timeout to 2 seconds

        this.testDevice!.open((err: Error | null) => {
          clearTimeout(timeout);
          if (err) {
            console.log("🖨️ USB device not available:", err.message);
            resolve(false);
          } else {
            // Close the test connection immediately
            try {
              this.testDevice!.close();
            } catch (closeError) {
              console.log("🖨️ Error closing test device:", closeError);
            }
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.log("🖨️ Error checking device availability:", error);
      return false;
    }
  }

  private async initializeDevice(): Promise<USB> {
    if (this.device && this.isInitialized) {
      return this.device;
    }

    try {
      console.log("🖨️ Initializing USB printer device...");
      this.device = new USB();

      // Set max listeners to prevent warnings
      (this.device as any).setMaxListeners?.(20);

      this.isInitialized = true;
      console.log("🖨️ USB printer device initialized successfully");
      return this.device;
    } catch (error) {
      console.error("🖨️ Failed to initialize USB printer device:", error);
      throw new Error(
        "No USB printer found. Please connect a printer and try again."
      );
    }
  }

  async isPrinterAvailable(): Promise<boolean> {
    try {
      await this.initializeDevice();
      return true;
    } catch (error) {
      console.log("🖨️ Printer not available:", error);
      // If initialization fails, ensure we update the last known status
      if (this.lastKnownStatus !== false) {
        this.lastKnownStatus = false;
        this.isInitialized = false;
        this.device = null;
      }
      return false;
    }
  }

  // Force a status check and notify callbacks
  async forceStatusCheck(): Promise<boolean> {
    try {
      const currentStatus = await this.checkDeviceAvailability();

      // Always notify callbacks on forced check
      if (currentStatus !== this.lastKnownStatus) {
        console.log(
          `🖨️ Forced status check: ${
            this.lastKnownStatus ? "Available" : "Not available"
          } → ${currentStatus ? "Available" : "Not available"}`
        );

        this.lastKnownStatus = currentStatus;
        this.isInitialized = false;
        this.device = null;

        // Notify all callbacks
        this.statusCallbacks.forEach((callback) => {
          try {
            callback(currentStatus);
          } catch (error) {
            console.error("🖨️ Error in status callback:", error);
          }
        });
      }

      return currentStatus;
    } catch (error) {
      console.error("🖨️ Error during forced status check:", error);
      return false;
    }
  }

  // Cleanup method to stop monitoring
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log("🖨️ USB device monitoring stopped");
    }

    // Clear callbacks
    this.statusCallbacks = [];

    // Clean up test device
    if (this.testDevice) {
      try {
        this.testDevice.removeAllListeners();
        this.testDevice.close();
      } catch (error) {
        console.log("🖨️ Error cleaning up test device in destroy:", error);
      }
      this.testDevice = null;
    }

    // Reset device
    this.device = null;
    this.isInitialized = false;
  }

  async printOrder(
    order: OrderWithRelations,
    restaurant: RestaurantAttributes
  ): Promise<void> {
    this.isPrinting = true;
    try {
      console.log("🖨️ Printing order:", order);
      console.log("🖨️ Restaurant data:", restaurant);

      const device = await this.initializeDevice();

      return new Promise((resolve, reject) => {
        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          this.isPrinting = false;
          reject(new Error("Printing operation timed out"));
        }, 30000); // 30 second timeout

        device.open(async (err: Error | null) => {
          if (err) {
            console.error("🖨️ Error opening printer:", err);
            clearTimeout(timeout);
            this.isPrinting = false;
            reject(err);
            return;
          }

          try {
            const encoding = "CP874";
            const options = { encoding };
            let printer = new Printer(device, options);

            // Load and print logo
            await this.printLogo(printer, restaurant);

            // Print header
            this.printHeader(printer, restaurant);

            // Print order details
            this.printOrderDetails(printer, order);

            // Print items
            this.printOrderItems(printer, order);

            // Print summary
            this.printOrderSummary(printer, order);

            // Print barcode and QR
            await this.printBarcodeAndQR(printer, order, restaurant);

            // Print footer
            this.printFooter(printer);

            printer.cut().close();
            clearTimeout(timeout);
            this.isPrinting = false;
            resolve();
          } catch (error) {
            console.error("🖨️ Error during printing:", error);
            clearTimeout(timeout);
            this.isPrinting = false;
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error("🖨️ Error initializing printer:", error);
      this.isPrinting = false;
      throw error;
    }
  }

  async printQRCode(data: QRCodePrintData): Promise<void> {
    this.isPrinting = true;
    try {
      console.log("🖨️ Printing QR code for URL:", data.url);

      const device = await this.initializeDevice();

      return new Promise((resolve, reject) => {
        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          this.isPrinting = false;
          reject(new Error("QR code printing operation timed out"));
        }, 30000); // 30 second timeout

        device.open(async (err: Error | null) => {
          if (err) {
            console.error("🖨️ Error opening printer:", err);
            clearTimeout(timeout);
            this.isPrinting = false;
            reject(err);
            return;
          }

          try {
            const encoding = "CP874";
            const options = { encoding };
            let printer = new Printer(device, options);

            // Print header with restaurant info if available
            if (data.restaurant) {
              await this.printLogo(printer, data.restaurant);
              this.printQRHeader(printer, data.restaurant, data.title);
            } else {
              this.printSimpleHeader(printer, data.title);
            }

            // Print QR code details
            this.printQRDetails(printer, data);

            // Generate and print QR code
            await this.printQRCodeImage(printer, data.url);

            // Print footer
            this.printQRFooter(printer, data);

            printer.cut().close();
            clearTimeout(timeout);
            this.isPrinting = false;
            resolve();
          } catch (error) {
            console.error("🖨️ Error during QR code printing:", error);
            clearTimeout(timeout);
            this.isPrinting = false;
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error("🖨️ Error initializing QR code printer:", error);
      this.isPrinting = false;
      throw error;
    }
  }

  private async printLogo(
    printer: any,
    restaurant: RestaurantAttributes
  ): Promise<void> {
    if (restaurant.logoUrl) {
      try {
        const image = await Image.load(restaurant.logoUrl);
        console.log("🖨️ Logo loaded successfully from:", restaurant.logoUrl);
        printer.align("ct");
        await printer.image(image, "d24");
        printer.align("lt");
        printer.text(""); // Add space after logo
      } catch (imageError) {
        console.log(
          "🖨️ Could not load logo image from URL, continuing without it:",
          imageError
        );
      }
    }
  }

  private printHeader(printer: any, restaurant: RestaurantAttributes): void {
    // Restaurant header
    printer
      .font("a")
      .align("ct")
      .style("bu")
      .size(1, 1)
      .text(restaurant.name?.[locale] || "RESTAURANT")
      .style("normal")
      .size(0, 0)
      .text("");

    // Order header
    printer
      .style("bu")
      .size(1, 1)
      .text("ORDER RECEIPT")
      .style("normal")
      .size(0, 0)
      .text("");
  }

  private printQRHeader(
    printer: any,
    restaurant: RestaurantAttributes,
    title?: string
  ): void {
    // Restaurant header
    printer
      .font("a")
      .align("ct")
      .style("bu")
      .size(1, 1)
      .text(restaurant.name?.[locale] || "RESTAURANT")
      .style("normal")
      .size(0, 0)
      .text("");

    // QR code header
    printer
      .style("bu")
      .size(1, 1)
      .text(title || "MENU QR CODE")
      .style("normal")
      .size(0, 0)
      .text("");
  }

  private printSimpleHeader(printer: any, title?: string): void {
    printer
      .font("a")
      .align("ct")
      .style("bu")
      .size(1, 1)
      .text(title || "MENU QR CODE")
      .style("normal")
      .size(0, 0)
      .text("");
  }

  private printQRDetails(printer: any, data: QRCodePrintData): void {
    printer
      .align("lt")
      .text("Date: " + new Date().toLocaleDateString())
      .text("Time: " + new Date().toLocaleTimeString());

    if (data.table) {
      printer.text("Table: " + (data.table.name?.[locale] || "Unknown"));
    }

    if (data.sessionId) {
      printer.text("Session: " + data.sessionId.slice(-8));
    }

    if (data.subtitle) {
      printer.text("Info: " + data.subtitle);
    }

    printer.text("");

    // Separator
    printer.align("ct").drawLine(".").align("lt").text("");
  }

  private async printQRCodeImage(printer: any, url: string): Promise<void> {
    try {
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      // Convert data URL to image and print
      const image = await Image.load(qrCodeDataUrl);
      console.log("🖨️ QR code generated successfully for URL:", url);

      printer.align("ct");
      await printer.image(image, "d24");
      printer.text(""); // Add space after QR code
    } catch (qrError) {
      console.error("🖨️ Error generating QR code:", qrError);
      printer
        .align("ct")
        .text("QR Code generation failed")
        .text("URL: " + url)
        .text("");
    }
  }

  private printQRFooter(printer: any, data: QRCodePrintData): void {
    printer
      .align("ct")
      .style("normal")
      .size(0, 0)
      .text("Scan QR code to access menu")
      .text("and place your order")
      .drawLine(".")
      .text("");
  }

  private printOrderDetails(printer: any, order: OrderWithRelations): void {
    printer
      .align("lt")
      .text("Order #: " + order.id.toString().slice(-8).padStart(6, "0"))
      .text("Date: " + new Date(order.createdAt).toLocaleDateString())
      .text("Time: " + new Date(order.createdAt).toLocaleTimeString())
      .text("Table: " + (order.table?.name?.[locale] || "Unknown"))
      .text("Status: " + order.status.toUpperCase())
      .text("");

    // Separator
    printer.align("ct").drawLine(".").align("lt").text("");
  }

  private printOrderItems(printer: any, order: OrderWithRelations): void {
    // Items header
    printer.style("bu").text("ITEMS ORDERED").style("normal").text("");

    // Print order items with better formatting
    order.orderItems?.forEach((item, index) => {
      const itemNumber = (index + 1).toString().padStart(2, "0");
      const quantity = item.quantity.toString().padStart(2, " ");
      const itemName = item.food?.name?.[locale] || "Unknown Item";
      const price = item.food?.price || 0;
      const totalPrice = price * item.quantity;

      printer
        .text(`${itemNumber}. ${quantity}x ${itemName}`)
        .text(`    Price: ${currency}${price.toLocaleString()} each`)
        .text(`    Total: ${currency}${totalPrice.toLocaleString()}`);

      if (item.specialInstructions) {
        printer
          .style("I")
          .text(`    Note: ${item.specialInstructions}`)
          .style("NORMAL");
      }
      printer.text("");
    });

    // Separator
    printer.align("ct").drawLine(".").align("lt").text("");
  }

  private printOrderSummary(printer: any, order: OrderWithRelations): void {
    const totalItems =
      order.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const subtotal =
      order.orderItems?.reduce((sum, item) => {
        const price = item.food?.price || 0;
        return sum + price * item.quantity;
      }, 0) || 0;

    printer.style("bu").text("ORDER SUMMARY").style("normal").text("");

    const encoding = "CP874";

    // Summary table
    printer.tableCustom(
      [
        { text: "Total Items", align: "LEFT", width: 0.6, style: "NORMAL" },
        {
          text: totalItems.toString(),
          align: "RIGHT",
          width: 0.4,
          style: "NORMAL",
        },
      ],
      { size: [1, 1], encoding }
    );

    printer.tableCustom(
      [
        { text: "Total", align: "LEFT", width: 0.6, style: "NORMAL" },
        {
          text: `${currency}${subtotal.toLocaleString()}`,
          align: "RIGHT",
          width: 0.4,
          style: "NORMAL",
        },
      ],
      { size: [1, 1], encoding }
    );

    printer.text("");
  }

  private async printBarcodeAndQR(
    printer: any,
    order: OrderWithRelations,
    restaurant: RestaurantAttributes
  ): Promise<void> {
    try {
      // Barcode and QR code section
      printer.align("ct").drawLine(".").text("");

      // Add barcode for order ID
      try {
        printer.barcode(order.id.toString(), "CODE128", {
          width: 50,
          height: 50,
        });
      } catch (barcodeError) {
        console.log(
          "🖨️ Could not print barcode, continuing without it:",
          barcodeError
        );
      }

      let qrImage;
      if (
        restaurant.qrCodeImageUrl &&
        !restaurant.qrCodeImageUrl.toLowerCase().endsWith(".svg")
      ) {
        try {
          qrImage = await Image.load(restaurant.qrCodeImageUrl);
          console.log(
            "🖨️ Payment QR code loaded successfully from:",
            restaurant.qrCodeImageUrl
          );
        } catch (qrError) {
          console.log(
            "🖨️ Could not load payment QR code, continuing without it:",
            qrError
          );
          qrImage = undefined;
        }
      }

      if (qrImage) {
        try {
          await printer.image(qrImage, "d24");
          printer.text("");
        } catch (imageError) {
          console.log(
            "🖨️ Could not print QR image, continuing without it:",
            imageError
          );
        }
      } else if (restaurant.promptPay) {
        try {
          const payload = generatePayload(restaurant.promptPay, {
            amount:
              order.orderItems?.reduce((sum, item) => {
                const price = item.food?.price || 0;
                return sum + price * item.quantity;
              }, 0) || 0,
          });
          await printer.qrimage(payload);
        } catch (promptPayError) {
          console.log(
            "🖨️ Could not generate PromptPay QR, continuing without it:",
            promptPayError
          );
        }
      }
    } catch (error) {
      console.error("🖨️ Error in printBarcodeAndQR:", error);
      // Continue with printing even if barcode/QR fails
    }
  }

  private printFooter(printer: any): void {
    printer
      .align("ct")
      .style("normal")
      .size(0, 0)
      .text("Thank you for your order!")
      .text("Scan QR code to make payment")
      .drawLine(".")
      .text("");
  }
}
