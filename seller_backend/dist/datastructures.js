"use strict";
/**
 * Data Structures for Agentic Commerce Protocol
 * This file contains all the data structure definitions and helper functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCT_CATALOG = exports.LinkType = exports.FulfillmentType = exports.TotalType = exports.MessageType = exports.CheckoutStatus = void 0;
exports.createBuyer = createBuyer;
exports.createAddress = createAddress;
exports.createLineItem = createLineItem;
exports.getFulfillmentOptions = getFulfillmentOptions;
exports.calculateTotals = calculateTotals;
exports.createPaymentProvider = createPaymentProvider;
exports.generateId = generateId;
// Checkout Status
var CheckoutStatus;
(function (CheckoutStatus) {
    CheckoutStatus["NOT_READY_FOR_PAYMENT"] = "not_ready_for_payment";
    CheckoutStatus["READY_FOR_PAYMENT"] = "ready_for_payment";
    CheckoutStatus["COMPLETED"] = "completed";
    CheckoutStatus["CANCELED"] = "canceled";
    CheckoutStatus["IN_PROGRESS"] = "in_progress";
})(CheckoutStatus || (exports.CheckoutStatus = CheckoutStatus = {}));
// Message Types
var MessageType;
(function (MessageType) {
    MessageType["INFO"] = "info";
    MessageType["ERROR"] = "error";
})(MessageType || (exports.MessageType = MessageType = {}));
// Total Types
var TotalType;
(function (TotalType) {
    TotalType["ITEMS_BASE_AMOUNT"] = "items_base_amount";
    TotalType["ITEMS_DISCOUNT"] = "items_discount";
    TotalType["SUBTOTAL"] = "subtotal";
    TotalType["DISCOUNT"] = "discount";
    TotalType["FULFILLMENT"] = "fulfillment";
    TotalType["TAX"] = "tax";
    TotalType["FEE"] = "fee";
    TotalType["TOTAL"] = "total";
})(TotalType || (exports.TotalType = TotalType = {}));
// Fulfillment Types
var FulfillmentType;
(function (FulfillmentType) {
    FulfillmentType["SHIPPING"] = "shipping";
    FulfillmentType["DIGITAL"] = "digital";
})(FulfillmentType || (exports.FulfillmentType = FulfillmentType = {}));
// Link Types
var LinkType;
(function (LinkType) {
    LinkType["TERMS_OF_USE"] = "terms_of_use";
    LinkType["PRIVACY_POLICY"] = "privacy_policy";
    LinkType["SELLER_SHOP_POLICIES"] = "seller_shop_policies";
})(LinkType || (exports.LinkType = LinkType = {}));
/**
 * Sample product catalog (for demo purposes)
 */
exports.PRODUCT_CATALOG = {
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
function createBuyer(data = {}) {
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
function createAddress(data = {}) {
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
function createLineItem(item, product) {
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
function getFulfillmentOptions() {
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
function calculateTotals(lineItems, fulfillmentOption) {
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
function createPaymentProvider() {
    return {
        provider: 'stripe',
        supported_payment_methods: ['card']
    };
}
/**
 * Generate a unique ID
 */
function generateId(prefix = 'checkout') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
