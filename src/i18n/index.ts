import enTranslations from "./en.json";
import thTranslations from "./th.json";

export type Locale = "en" | "th";

export interface ReceiptTranslations {
  restaurant: string;
  orderReceipt: string;
  menuQrCode: string;
  orderNumber: string;
  date: string;
  time: string;
  table: string;
  status: string;
  session: string;
  info: string;
  unknown: string;
  unknownItem: string;
  itemsOrdered: string;
  price: string;
  each: string;
  total: string;
  note: string;
  orderSummary: string;
  totalItems: string;
  thankYou: string;
  scanQrToPay: string;
  scanQrToMenu: string;
  andPlaceOrder: string;
  qrCodeGenerationFailed: string;
  url: string;
}

const translations: Record<Locale, { receipt: ReceiptTranslations }> = {
  en: enTranslations,
  th: thTranslations,
};

export function getTranslations(locale: Locale): ReceiptTranslations {
  return translations[locale]?.receipt || translations.en.receipt;
}

export function t(locale: Locale, key: keyof ReceiptTranslations): string {
  const translations = getTranslations(locale);
  return translations[key] || key;
}
