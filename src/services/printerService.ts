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

export class PrinterService {
  private device: USB;

  constructor() {
    this.device = new USB();
  }

  async printOrder(
    order: OrderWithRelations,
    restaurant: RestaurantAttributes
  ): Promise<void> {
    try {
      console.log("🖨️ Printing order:", order);
      console.log("🖨️ Restaurant data:", restaurant);

      return new Promise((resolve, reject) => {
        this.device.open(async (err: Error | null) => {
          if (err) {
            console.error("🖨️ Error opening printer:", err);
            reject(err);
            return;
          }

          try {
            const encoding = "CP874";
            const options = { encoding };
            let printer = new Printer(this.device, options);

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
            resolve();
          } catch (error) {
            console.error("🖨️ Error during printing:", error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error("🖨️ Error initializing printer:", error);
      throw error;
    }
  }

  async printQRCode(data: QRCodePrintData): Promise<void> {
    try {
      console.log("🖨️ Printing QR code for URL:", data.url);

      return new Promise((resolve, reject) => {
        this.device.open(async (err: Error | null) => {
          if (err) {
            console.error("🖨️ Error opening printer:", err);
            reject(err);
            return;
          }

          try {
            const encoding = "CP874";
            const options = { encoding };
            let printer = new Printer(this.device, options);

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
            resolve();
          } catch (error) {
            console.error("🖨️ Error during QR code printing:", error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error("🖨️ Error initializing QR code printer:", error);
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
        await printer.image(image, "d24");
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
    // Barcode and QR code section
    printer.align("ct").drawLine(".").text("");

    // Add barcode for order ID
    printer.barcode(order.id.toString(), "CODE128", {
      width: 50,
      height: 50,
    });

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
      await printer.image(qrImage, "d24");
      printer.text("");
    } else if (restaurant.promptPay) {
      const payload = generatePayload(restaurant.promptPay, {
        amount:
          order.orderItems?.reduce((sum, item) => {
            const price = item.food?.price || 0;
            return sum + price * item.quantity;
          }, 0) || 0,
      });
      await printer.qrimage(payload);
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
