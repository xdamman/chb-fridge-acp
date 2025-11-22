/**
 * Data Structures for Agentic Commerce Protocol
 * This file contains all the data structure definitions and helper functions
 */

import { components } from "./types/openapi";

// Type aliases from OpenAPI spec
export type Address = components["schemas"]["Address"];
export type Buyer = components["schemas"]["Buyer"];
export type LineItem = components["schemas"]["LineItem"];
export type Item = components["schemas"]["Item"];
export type FulfillmentOptionShipping =
  components["schemas"]["FulfillmentOptionShipping"];
export type Total = components["schemas"]["Total"];
export type PaymentProvider = components["schemas"]["PaymentProvider"];

// Checkout Status
export enum CheckoutStatus {
  NOT_READY_FOR_PAYMENT = "not_ready_for_payment",
  READY_FOR_PAYMENT = "ready_for_payment",
  COMPLETED = "completed",
  CANCELED = "canceled",
  IN_PROGRESS = "in_progress",
}

// Message Types
export enum MessageType {
  INFO = "info",
  ERROR = "error",
}

// Total Types
export enum TotalType {
  ITEMS_BASE_AMOUNT = "items_base_amount",
  ITEMS_DISCOUNT = "items_discount",
  SUBTOTAL = "subtotal",
  DISCOUNT = "discount",
  FULFILLMENT = "fulfillment",
  TAX = "tax",
  FEE = "fee",
  TOTAL = "total",
}

// Fulfillment Types
export enum FulfillmentType {
  SHIPPING = "shipping",
  DIGITAL = "digital",
}

// Link Types
export enum LinkType {
  TERMS_OF_USE = "terms_of_use",
  PRIVACY_POLICY = "privacy_policy",
  SELLER_SHOP_POLICIES = "seller_shop_policies",
}
type Tag = "wine" | "warm" | "beer" | "soft" | "almost beer" | "strong beer";

/**
 * Product interface for the catalog
 */
export interface Product {
  id: string;
  name: string;
  price: number; // price per unit in cents
  description: string;
  long_description: string;
  stock: number;
  image: string;
  origin: {
    city: string;
    country: string;
  };
  tag?: Tag;
}

/**
 * Sample product catalog (for demo purposes)
 */
export const PRODUCT_CATALOG: Record<string, Product> = {
  item_001: {
    id: "item_001",
    name: "Glass of wine",
    price: 500, // price per unit in cents
    description: "Red or white",
    long_description:
      "A glass of wine, whether red or white, offers a delightful experience. Red wines are typically made from dark-colored grape varieties and are known for their rich flavors and tannins. White wines, produced from green or yellowish grapes, are appreciated for their crispness and aromatic qualities. Both types have been integral to various cultures, with origins tracing back to ancient civilizations.",
    stock: 100,
    image:
      "https://engine.pay.brussels/storage/v1/object/public/uploads/2/1/1761406798104-IMG_0533.webp",
    origin: {
      city: "Various",
      country: "Multiple",
    },
    tags: ["soft"],
  },
  item_002: {
    id: "item_002",
    name: "Tea / coffee",
    price: 200,
    description: "No description",
    long_description:
      "Tea and coffee are two of the most popular hot beverages worldwide. Tea, originating from China, has a history dating back thousands of years and comes in various types like green, black, and oolong. Coffee, believed to have been first cultivated in Ethiopia, is renowned for its stimulating effects and diverse preparation methods. Both beverages have played significant roles in social rituals and daily routines across cultures.",
    stock: 100,
    image: "",
    origin: {
      city: "Various",
      country: "Multiple",
    },
    tags: ["soft", "Alcohol-free"],
  },
  item_003: {
    id: "item_003",
    name: "APIC Session IPA",
    price: 400,
    description: "Beer crafted in Belgium. Made by apes. 5%",
    long_description:
      "APIC Session IPA is a refreshing Belgian craft beer with a playful twist - it's made by apes! This session IPA features a moderate 5% alcohol content, making it perfect for extended enjoyment. With its balanced hop profile and crisp finish, it offers the characteristic bitterness of an IPA while remaining light and drinkable. A unique beer that combines Belgian brewing tradition with modern IPA techniques.",
    stock: 100,
    image: "",
    origin: {
      city: "Brussels",
      country: "Belgium",
    },
    tags: ["beer", "local"],
  },
  item_004: {
    id: "item_004",
    name: "Soft drink",
    price: 300,
    description: "Fritz Lemonade (rhubarb, lemon, orange)",
    long_description:
      "Fritz Lemonade is a premium soft drink featuring a unique blend of rhubarb, lemon, and orange flavors. This refreshing beverage offers a perfect balance of tartness and sweetness, with the distinctive tang of rhubarb complemented by the citrus notes of lemon and orange. Made with natural ingredients, it's a sophisticated alternative to traditional soft drinks, perfect for quenching your thirst on any occasion.",
    stock: 100,
    image:
      "https://engine.pay.brussels/storage/v1/object/public/uploads/soft.png",
    origin: {
      city: "Hamburg",
      country: "Germany",
    },
    tags: ["soft", "Alcohol-free"],
  },
  item_005: {
    id: "item_005",
    name: "Trotinette",
    price: 350,
    description: "Alcohol-free beer",
    long_description:
      "Trotinette is an alcohol-free beer brewed by Brasserie de la Senne in Brussels, Belgium. This refreshing beverage offers all the flavor and character of a traditional Belgian beer without the alcohol content. With its light body and crisp finish, Trotinette is perfect for those who want to enjoy the taste of craft beer while staying alcohol-free. It maintains the brewing traditions of Belgium while offering a modern, health-conscious option.",
    stock: 100,
    image:
      "https://engine.pay.brussels/storage/v1/object/public/uploads/fridge/trotinette.jpg",
    origin: {
      city: "Brussels",
      country: "Belgium",
    },
    tags: ["beer", "Alcohol-free", "local"],
  },
  item_006: {
    id: "item_006",
    name: "Grisette Blonde",
    price: 400,
    description: "Light & Fresh 5,5%",
    long_description:
      "Grisette Blonde is a light and refreshing Belgian ale brewed by Brasserie de la Senne in Brussels. This blonde beer features a moderate 5.5% alcohol content and is characterized by its light body, crisp finish, and fresh, clean flavors. Perfect for warm weather or as a session beer, Grisette Blonde embodies the Belgian tradition of creating approachable yet flavorful beers that can be enjoyed throughout the day.",
    stock: 100,
    image:
      "https://engine.pay.brussels/storage/v1/object/public/uploads/fridge/grisette-blonde-medaillon.png",
    origin: {
      city: "Brussels",
      country: "Belgium",
    },
    tags: ["beer", "local"],
  },
  item_007: {
    id: "item_007",
    name: "Grisette Blanche",
    price: 400,
    description: "Fresh & Citrus 5,5%",
    long_description:
      "Grisette Blanche is a Belgian white ale brewed by Brasserie de la Senne in Brussels. This refreshing beer features a 5.5% alcohol content and is known for its fresh, citrusy character. With notes of orange peel, coriander, and other spices typical of Belgian white beers, it offers a bright and zesty flavor profile. The light, hazy appearance and smooth mouthfeel make it an ideal choice for those seeking a flavorful yet easy-drinking beer.",
    stock: 100,
    image:
      "https://engine.pay.brussels/storage/v1/object/public/uploads/fridge/grisette-blanche-medaillon.png",
    origin: {
      city: "Brussels",
      country: "Belgium",
    },
    tags: ["beer", "local"],
  },
  item_008: {
    id: "item_008",
    name: "Zinnebir",
    price: 400,
    description: "Malty Pale ale 5,8%",
    long_description:
      "Zinnebir is a Belgian pale ale brewed by Brasserie de la Senne in Brussels. Named after the Zenne River that flows through the city, this beer features a 5.8% alcohol content and showcases a malty character balanced with hop bitterness. The beer offers a rich, complex flavor profile with notes of caramel and biscuit from the malt, complemented by floral and earthy hop aromas. Zinnebir represents the brewery's commitment to creating beers that reflect the character of Brussels.",
    stock: 100,
    image:
      "https://engine.pay.brussels/storage/v1/object/public/uploads/fridge/zinnebir.png",
    origin: {
      city: "Brussels",
      country: "Belgium",
    },
    tags: ["beer", "local"],
  },
  item_009: {
    id: "item_009",
    name: "Taras Boulba",
    price: 400,
    description: "Extra hoppy 4,5%",
    long_description:
      "Taras Boulba is a hoppy Belgian ale brewed by Brasserie de la Senne in Brussels, Belgium. Named after Nikolai Gogol's novella, this beer features a light body and assertive hop character with a 4.5% alcohol content. Known for its refreshing bitterness balanced by subtle malt flavors, Taras Boulba offers complex yeast flavors and perfect hop balance. The name and label art reflect a humorous take on cultural differences, making it both a flavorful and culturally interesting beer.",
    stock: 100,
    image:
      "https://engine.pay.brussels/storage/v1/object/public/uploads/fridge/tarasboulba.png",
    origin: {
      city: "Brussels",
      country: "Belgium",
    },
    tags: ["beer", "local"],
  },
  item_010: {
    id: "item_010",
    name: "Jambe de Bois",
    price: 450,
    description: "Hoppy Belgian triple - 8%",
    long_description:
      "Jambe de Bois is a generously hopped Belgian Tripel brewed by Brasserie de la Senne in Brussels, Belgium. This strong ale features an 8% alcohol content and boasts a complex flavor profile with notes of pear and ripe banana from fermentation, complemented by floral and spicy hop aromas. Despite its higher alcohol content, it remains dangerously easy to drink with its well-balanced character. The golden color and rich malt backbone make it a testament to Belgium's rich brewing tradition.",
    stock: 100,
    image:
      "https://engine.pay.brussels/storage/v1/object/public/uploads/fridge/jambedebois.png",
    origin: {
      city: "Brussels",
      country: "Belgium",
    },
    tags: ["beer", "local"],
  },
  item_011: {
    id: "item_011",
    name: "Mug",
    price: 500,
    description: "Reusable mug",
    long_description:
      "A reusable mug is an eco-friendly alternative to disposable cups, designed for enjoying hot beverages like coffee and tea. Made from materials such as ceramic, stainless steel, or glass, these mugs help reduce waste and often come with insulating properties to keep drinks warm longer. They come in various sizes and designs, catering to personal preferences while promoting sustainability. Perfect for home, office, or on-the-go use.",
    stock: 100,
    image:
      "https://engine.pay.brussels/storage/v1/object/public/uploads/mug.png",
    origin: {
      city: "Various",
      country: "Multiple",
    },
    tags: ["soft"],
  },
};

/**
 * Create a Buyer object
 */
export function createBuyer(data: Partial<Buyer> = {}): Buyer {
  return {
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    email: data.email || "",
    phone_number: data.phone_number,
  };
}

/**
 * Create an Address object
 */
export function createAddress(data: Partial<Address> = {}): Address {
  return {
    name: data.name || "",
    line_one: data.line_one || "",
    line_two: data.line_two,
    city: data.city || "",
    state: data.state || "",
    country: data.country || "",
    postal_code: data.postal_code || "",
  };
}

/**
 * Create a LineItem from an item request
 */
export function createLineItem(item: Item, product: Product): LineItem {
  const baseAmount = product.price * item.quantity;
  const discount = 0; // No discounts for demo
  const subtotal = baseAmount - discount;
  const tax = 0; // Simplified - no tax calculation
  const total = subtotal + tax;

  return {
    id: item.id,
    item: {
      id: item.id,
      quantity: item.quantity,
    },
    base_amount: baseAmount,
    discount: discount,
    subtotal: subtotal,
    tax: tax,
    total: total,
  };
}

/**
 * Get available fulfillment options
 */
export function getFulfillmentOptions(): FulfillmentOptionShipping[] {
  return [
    {
      type: FulfillmentType.SHIPPING,
      id: "free",
      title: "Take from Fridge",
      subtitle: "In a second",
      carrier: "Yourself",
      subtotal: "0", 
      tax: "0",
      total: "0",
    },
  ];
}

/**
 * Calculate totals for a checkout
 */
export function calculateTotals(
  lineItems: LineItem[],
  fulfillmentOption: FulfillmentOptionShipping | null
): Total[] {
  const itemsSubtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  const itemsTax = lineItems.reduce((sum, item) => sum + item.tax, 0);

  const fulfillmentAmount = fulfillmentOption
    ? parseInt(fulfillmentOption.total)
    : 0;
  const totalAmount = itemsSubtotal + fulfillmentAmount + itemsTax;

  return [
    {
      type: TotalType.SUBTOTAL,
      display_text: "Subtotal",
      amount: itemsSubtotal,
    },
    {
      type: TotalType.FULFILLMENT,
      display_text: "Shipping",
      amount: fulfillmentAmount,
    },
    {
      type: TotalType.TAX,
      display_text: "Tax",
      amount: itemsTax,
    },
    {
      type: TotalType.TOTAL,
      display_text: "Total",
      amount: totalAmount,
    },
  ];
}

/**
 * Create a payment provider object
 */
export function createPaymentProvider(): PaymentProvider {
  return {
    provider: "stripe",
    supported_payment_methods: ["card"],
  };
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = "checkout"): string {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 11)}`;
}
