export type LocalizedText = {
  default: string;
  en?: string;
  th?: string;
};

export type LocalizedNumber = {
  default: number;
  en?: number;
  th?: number;
};

export interface Attributes {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface OwnerAttributes extends Attributes {
  name: string;
  email: string;
  passwordHash: string;
  tier: "free" | "pro" | "business";
}

export interface RestaurantAttributes extends Attributes {
  ownerId: string;
  name: LocalizedText;
  logoUrl?: string;
  bannerImageUrl?: string;
  themeColor?: string;
  promptPay: string;
  qrCodeImageUrl?: string;
}

export interface TableAttributes extends Attributes {
  restaurantId: string;
  name: LocalizedText;
  qrCodeUrl?: string;
}

export interface CategoryAttributes extends Attributes {
  restaurantId: string;
  name: LocalizedText;
  imageUrl?: string;
}

export interface FoodAttributes extends Attributes {
  categoryId: string;
  name: LocalizedText;
  price: number;
  imageUrl?: string;
}

export interface OrderAttributes extends Attributes {
  tableId: string;
  sessionId?: string;
  status: "pending" | "in_progress" | "done";
}

export interface OrderItemAttributes extends Attributes {
  orderId: string;
  foodId: string;
  quantity: number;
  specialInstructions?: string;
}

export interface JwtPayload {
  id: string;
  email: string;
  tier: string;
}

export interface OrderRequest {
  tableId: string;
  sessionId: string;
  items: Array<{
    foodId: string;
    quantity: number;
    specialInstructions?: string;
  }>;
}
