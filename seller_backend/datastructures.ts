/**
 * Data Structures for Agentic Commerce Protocol
 * This file contains all the data structure definitions and helper functions
 */

import { components } from './types/openapi';

// Type aliases from OpenAPI spec
export type Address = components['schemas']['Address'];
export type Buyer = components['schemas']['Buyer'];
export type LineItem = components['schemas']['LineItem'];
export type Item = components['schemas']['Item'];
export type FulfillmentOptionShipping = components['schemas']['FulfillmentOptionShipping'];
export type Total = components['schemas']['Total'];
export type PaymentProvider = components['schemas']['PaymentProvider'];

// Checkout Status
export enum CheckoutStatus {
  NOT_READY_FOR_PAYMENT = 'not_ready_for_payment',
  READY_FOR_PAYMENT = 'ready_for_payment',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
  IN_PROGRESS = 'in_progress'
}

// Message Types
export enum MessageType {
  INFO = 'info',
  ERROR = 'error'
}

// Total Types
export enum TotalType {
  ITEMS_BASE_AMOUNT = 'items_base_amount',
  ITEMS_DISCOUNT = 'items_discount',
  SUBTOTAL = 'subtotal',
  DISCOUNT = 'discount',
  FULFILLMENT = 'fulfillment',
  TAX = 'tax',
  FEE = 'fee',
  TOTAL = 'total'
}

// Fulfillment Types
export enum FulfillmentType {
  SHIPPING = 'shipping',
  DIGITAL = 'digital'
}

// Link Types
export enum LinkType {
  TERMS_OF_USE = 'terms_of_use',
  PRIVACY_POLICY = 'privacy_policy',
  SELLER_SHOP_POLICIES = 'seller_shop_policies'
}

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
}

/**
 * Sample product catalog (for demo purposes)
 */
export const PRODUCT_CATALOG: Record<string, Product> = {
  'item_123': {
    id: 'item_123',
    name: 'The Origins of Efficiency - Brian Potter',
    price: 4000, // price per unit in cents
    description: 'Stripe Press Book',
    stock: 100,
    image: "https://images-us.bookshop.org/ingram/9781953953520.jpg"
  },
  'item_456': {
    id: 'item_456',
    name: 'Scaling People: Tactics for Management and Company Building - Claire Hughes Johnson',
    price: 3500,
    description: 'Stripe Press Book',
    stock: 50,
    image: "https://images-us.bookshop.org/ingram/9781953953216.jpg"
  },
  'item_789': {
    id: 'item_789',
    name: 'Pieces of the Action - Vannevar Bush & Ben Reinhardt',
    price: 2400,
    description: 'Stripe Press Book',
    stock: 25,
    image: "https://images-us.bookshop.org/ingram/9781953953209.jpg"
  }
};

/**
 * Create a Buyer object
 */
export function createBuyer(data: Partial<Buyer> = {}): Buyer {
  return {
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    email: data.email || '',
    phone_number: data.phone_number
  };
}

/**
 * Create an Address object
 */
export function createAddress(data: Partial<Address> = {}): Address {
  return {
    name: data.name || '',
    line_one: data.line_one || '',
    line_two: data.line_two,
    city: data.city || '',
    state: data.state || '',
    country: data.country || '',
    postal_code: data.postal_code || ''
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
      quantity: item.quantity
    },
    base_amount: baseAmount,
    discount: discount,
    subtotal: subtotal,
    tax: tax,
    total: total
  };
}

/**
 * Get available fulfillment options
 */
export function getFulfillmentOptions(): FulfillmentOptionShipping[] {
  return [
    {
      type: FulfillmentType.SHIPPING,
      id: 'shipping_standard',
      title: 'Standard Shipping',
      subtitle: '5-7 business days',
      carrier: 'USPS',
      subtotal: '300', // $3.00
      tax: '0',
      total: '300'
    },
    {
      type: FulfillmentType.SHIPPING,
      id: 'shipping_fast',
      title: 'Express Shipping',
      subtitle: '2-3 business days',
      carrier: 'FedEx',
      subtotal: '500', // $5.00
      tax: '0',
      total: '500'
    },
    {
      type: FulfillmentType.SHIPPING,
      id: 'shipping_overnight',
      title: 'Overnight Shipping',
      subtitle: 'Next business day',
      carrier: 'FedEx',
      subtotal: '800', // $8.00
      tax: '0',
      total: '800'
    }
  ];
}

/**
 * Calculate totals for a checkout
 */
export function calculateTotals(lineItems: LineItem[], fulfillmentOption: FulfillmentOptionShipping | null): Total[] {
  const itemsSubtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  const itemsTax = lineItems.reduce((sum, item) => sum + item.tax, 0);

  const fulfillmentAmount = fulfillmentOption ? parseInt(fulfillmentOption.total) : 0;
  const totalAmount = itemsSubtotal + fulfillmentAmount + itemsTax;

  return [
    {
      type: TotalType.SUBTOTAL,
      display_text: 'Subtotal',
      amount: itemsSubtotal
    },
    {
      type: TotalType.FULFILLMENT,
      display_text: 'Shipping',
      amount: fulfillmentAmount
    },
    {
      type: TotalType.TAX,
      display_text: 'Tax',
      amount: itemsTax
    },
    {
      type: TotalType.TOTAL,
      display_text: 'Total',
      amount: totalAmount
    }
  ];
}

/**
 * Create a payment provider object
 */
export function createPaymentProvider(): PaymentProvider {
  return {
    provider: 'stripe',
    supported_payment_methods: ['card']
  };
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = 'checkout'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
