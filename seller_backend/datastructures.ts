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
  stock: number;
  image: string;
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
    stock: 100,
    image: "",
  },
  item_002: {
    id: "item_002",
    name: "Tea / coffee",
    price: 200,
    description: "No description",
    stock: 100,
    image: "",
  },
  item_003: {
    id: "item_003",
    name: "APIC Session IPA",
    price: 400,
    description: "Beer crafted in Belgium. Made by apes. 5%",
    stock: 100,
    image: "",
  },
  item_004: {
    id: "item_004",
    name: "Soft drink",
    price: 300,
    description: "Fritz Lemonade (rhubarb, lemon, orange)",
    stock: 100,
    image: "",
  },
  item_005: {
    id: "item_005",
    name: "Trotinette",
    price: 350,
    description: "Alcohol-free beer",
    stock: 100,
    image: "",
  },
  item_006: {
    id: "item_006",
    name: "Grisette Blonde",
    price: 400,
    description: "Light & Fresh 5,5%",
    stock: 100,
    image: "",
  },
  item_007: {
    id: "item_007",
    name: "Grisette Blanche",
    price: 400,
    description: "Fresh & Citrus 5,5%",
    stock: 100,
    image: "",
  },
  item_008: {
    id: "item_008",
    name: "Zinnebir",
    price: 400,
    description: "Malty Pale ale 5,8%",
    stock: 100,
    image: "",
  },
  item_009: {
    id: "item_009",
    name: "Taras Boulba",
    price: 400,
    description: "Extra hoppy 4,5%",
    stock: 100,
    image: "",
  },
  item_010: {
    id: "item_010",
    name: "Jambe de Bois",
    price: 450,
    description: "Hoppy Belgian triple - 8%",
    stock: 100,
    image: "",
  },
  item_011: {
    id: "item_011",
    name: "Mug",
    price: 500,
    description: "Reusable mug",
    stock: 100,
    image: "",
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
