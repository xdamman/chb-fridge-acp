"use strict";
/**
 * Agentic Commerce Protocol - Simple Seller Backend
 * TypeScript implementation with OpenAPI validation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const OpenApiValidator = __importStar(require("express-openapi-validator"));
const path_1 = __importDefault(require("path"));
const datastructures_1 = require("./datastructures");
const app = (0, express_1.default)();
const PORT = 3000;
// Middleware
app.use(express_1.default.json());
// OpenAPI Validator Middleware
// Use path that works in both dev (ts-node) and production (compiled to dist/)
const apiSpecPath = __dirname.includes('/dist')
    ? path_1.default.join(__dirname, '..', 'openapi.agentic_checkout.yaml')
    : path_1.default.join(__dirname, 'openapi.agentic_checkout.yaml');
app.use(OpenApiValidator.middleware({
    apiSpec: apiSpecPath,
    validateRequests: true,
    validateResponses: false, // Set to true in development for strict validation
    validateSecurity: false, // We'll handle auth separately for demo purposes
    ignorePaths: /\/products|\//, // Allow internal endpoints not in ACP spec
}));
const checkouts = {};
/**
 * Middleware to check if checkout exists
 */
function checkoutExists(req, res, next) {
    const { checkout_session_id } = req.params;
    const checkout = checkouts[checkout_session_id];
    if (!checkout) {
        return res.status(404).json({
            type: 'invalid_request',
            code: 'not_found',
            message: `Checkout session ${checkout_session_id} not found`,
        });
    }
    // Attach checkout to request for use in handler
    req.checkout = checkout;
    next();
}
/**
 * Middleware to check if checkout can be modified
 */
function checkoutModifiable(req, res, next) {
    const checkout = req.checkout;
    if (checkout.status === datastructures_1.CheckoutStatus.COMPLETED) {
        return res.status(400).json({
            type: 'invalid_request',
            code: 'checkout_completed',
            message: 'Cannot modify a completed checkout',
        });
    }
    if (checkout.status === datastructures_1.CheckoutStatus.CANCELED) {
        return res.status(400).json({
            type: 'invalid_request',
            code: 'checkout_canceled',
            message: 'Cannot modify a canceled checkout',
        });
    }
    next();
}
/**
 * POST /checkout_sessions
 * Create a new Checkout Session
 */
app.post('/checkout_sessions', (req, res) => {
    try {
        const { items, buyer, fulfillment_address } = req.body;
        // Create checkout
        const checkoutId = (0, datastructures_1.generateId)('checkout');
        const lineItems = items.map((item) => {
            const product = datastructures_1.PRODUCT_CATALOG[item.id];
            return (0, datastructures_1.createLineItem)(item, product);
        });
        const fulfillmentOptions = (0, datastructures_1.getFulfillmentOptions)();
        const fulfillmentOptionId = fulfillment_address ? 'shipping_standard' : null;
        const selectedFulfillment = fulfillmentOptions.find((opt) => opt.id === fulfillmentOptionId);
        const checkout = {
            id: checkoutId,
            buyer: buyer ? (0, datastructures_1.createBuyer)(buyer) : undefined,
            payment_provider: (0, datastructures_1.createPaymentProvider)(),
            status: fulfillment_address
                ? datastructures_1.CheckoutStatus.READY_FOR_PAYMENT
                : datastructures_1.CheckoutStatus.NOT_READY_FOR_PAYMENT,
            currency: 'usd',
            line_items: lineItems,
            fulfillment_address: fulfillment_address
                ? (0, datastructures_1.createAddress)(fulfillment_address)
                : undefined,
            fulfillment_options: fulfillmentOptions,
            fulfillment_option_id: fulfillmentOptionId || undefined,
            totals: (0, datastructures_1.calculateTotals)(lineItems, selectedFulfillment || null),
            messages: [],
            links: [
                {
                    type: 'terms_of_use',
                    url: 'https://example.com/terms',
                },
                {
                    type: 'privacy_policy',
                    url: 'https://example.com/privacy',
                },
            ],
        };
        checkouts[checkoutId] = checkout;
        res.status(201).json(checkout);
    }
    catch (error) {
        console.error('Error creating checkout:', error);
        res.status(500).json({
            type: 'processing_error',
            code: 'internal_error',
            message: 'An error occurred while creating the checkout',
        });
    }
});
/**
 * GET /checkout_sessions/:checkout_session_id
 * Retrieve a Checkout Session
 */
app.get('/checkout_sessions/:checkout_session_id', checkoutExists, (req, res) => {
    const checkout = req.checkout;
    res.json(checkout);
});
/**
 * POST /checkout_sessions/:checkout_session_id
 * Update a Checkout Session
 */
app.post('/checkout_sessions/:checkout_session_id', checkoutExists, checkoutModifiable, (req, res) => {
    try {
        const { checkout_session_id } = req.params;
        const { items, buyer, fulfillment_address, fulfillment_option_id } = req.body;
        const checkout = req.checkout;
        // Update items if provided
        if (items) {
            checkout.line_items = items.map((item) => {
                const product = datastructures_1.PRODUCT_CATALOG[item.id];
                return (0, datastructures_1.createLineItem)(item, product);
            });
        }
        // Update buyer if provided
        if (buyer) {
            checkout.buyer = (0, datastructures_1.createBuyer)(buyer);
        }
        // Update fulfillment address if provided
        if (fulfillment_address) {
            checkout.fulfillment_address = (0, datastructures_1.createAddress)(fulfillment_address);
            // Auto-select default fulfillment option if none is set
            if (!checkout.fulfillment_option_id &&
                checkout.fulfillment_options.length > 0) {
                checkout.fulfillment_option_id = checkout.fulfillment_options[0].id;
            }
        }
        // Update fulfillment option if provided
        if (fulfillment_option_id) {
            const option = checkout.fulfillment_options.find((opt) => opt.id === fulfillment_option_id);
            if (!option) {
                return res.status(400).json({
                    type: 'invalid_request',
                    code: 'invalid_fulfillment_option',
                    message: `Fulfillment option ${fulfillment_option_id} not found`,
                });
            }
            checkout.fulfillment_option_id = fulfillment_option_id;
        }
        // Recalculate totals
        const selectedFulfillment = checkout.fulfillment_options.find((opt) => opt.id === checkout.fulfillment_option_id && opt.type === 'shipping');
        checkout.totals = (0, datastructures_1.calculateTotals)(checkout.line_items, selectedFulfillment && selectedFulfillment.type === 'shipping' ? selectedFulfillment : null);
        // Update status
        if (checkout.fulfillment_address && checkout.fulfillment_option_id) {
            checkout.status = datastructures_1.CheckoutStatus.READY_FOR_PAYMENT;
        }
        else {
            checkout.status = datastructures_1.CheckoutStatus.NOT_READY_FOR_PAYMENT;
        }
        checkouts[checkout_session_id] = checkout;
        res.json(checkout);
    }
    catch (error) {
        console.error('Error updating checkout:', error);
        res.status(500).json({
            type: 'processing_error',
            code: 'internal_error',
            message: 'An error occurred while updating the checkout',
        });
    }
});
/**
 * POST /checkout_sessions/:checkout_session_id/complete
 * Complete a Checkout Session
 */
app.post('/checkout_sessions/:checkout_session_id/complete', checkoutExists, checkoutModifiable, async (req, res) => {
    try {
        const { checkout_session_id } = req.params;
        const { payment_data, buyer } = req.body;
        const checkout = req.checkout;
        if (!payment_data) {
            return res.status(400).json({
                type: 'invalid_request',
                code: 'missing_payment_data',
                message: 'Payment data is required',
            });
        }
        // Update buyer if provided
        if (buyer) {
            checkout.buyer = (0, datastructures_1.createBuyer)(buyer);
        }
        // Execute Stripe payment intent
        const totalAmount = checkout.totals.find((t) => t.type === 'total')?.amount;
        if (!totalAmount) {
            return res.status(400).json({
                type: 'invalid_request',
                code: 'invalid_total',
                message: 'Total amount not found',
            });
        }
        console.log('Processing payment for amount:', totalAmount);
        const executePaymentIntentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Bearer ${process.env.SELLER_API_KEY}`,
                'Stripe-Version': '2023-08-16;line_items_beta=v1',
            },
            body: new URLSearchParams({
                amount: totalAmount.toString(),
                currency: 'usd',
                confirm: 'true',
                shared_payment_granted_token: payment_data.token,
                'automatic_payment_methods[enabled]': 'true',
                'automatic_payment_methods[allow_redirects]': 'never',
            }).toString(),
        });
        const data = await executePaymentIntentResponse.json();
        console.log('Payment response:', data);
        // Check if payment failed (no id means error)
        if (!data.id || data.error) {
            return res.status(400).json({
                type: 'invalid_request',
                code: 'payment_intent_execution_failed',
                message: data.error?.message || 'Payment intent execution failed',
            });
        }
        // Payment processed successfully
        checkout.status = datastructures_1.CheckoutStatus.COMPLETED;
        checkout.messages.push({
            type: datastructures_1.MessageType.INFO,
            content_type: 'plain',
            content: 'Payment processed successfully. Order confirmed!',
        });
        // Remove payment provider from completed checkout
        delete checkout.payment_provider;
        checkouts[checkout_session_id] = checkout;
        // Return CheckoutSessionWithOrder (includes order details)
        const response = {
            ...checkout,
            order: {
                id: (0, datastructures_1.generateId)('order'),
                checkout_session_id: checkout_session_id,
                permalink_url: `https://example.com/orders/${(0, datastructures_1.generateId)('order')}`,
            },
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error completing checkout:', error);
        res.status(500).json({
            type: 'processing_error',
            code: 'internal_error',
            message: 'An error occurred while completing the checkout',
        });
    }
});
/**
 * POST /checkout_sessions/:checkout_session_id/cancel
 * Cancel a Checkout Session
 */
app.post('/checkout_sessions/:checkout_session_id/cancel', checkoutExists, (req, res) => {
    try {
        const { checkout_session_id } = req.params;
        const checkout = req.checkout;
        if (checkout.status === datastructures_1.CheckoutStatus.COMPLETED) {
            return res.status(405).json({
                type: 'invalid_request',
                code: 'checkout_completed',
                message: 'Cannot cancel a completed checkout',
            });
        }
        if (checkout.status === datastructures_1.CheckoutStatus.CANCELED) {
            return res.status(400).json({
                type: 'invalid_request',
                code: 'checkout_already_canceled',
                message: 'Checkout is already canceled',
            });
        }
        checkout.status = datastructures_1.CheckoutStatus.CANCELED;
        checkout.messages.push({
            type: datastructures_1.MessageType.INFO,
            content_type: 'plain',
            content: 'Checkout has been canceled',
        });
        checkouts[checkout_session_id] = checkout;
        res.json(checkout);
    }
    catch (error) {
        console.error('Error canceling checkout:', error);
        res.status(500).json({
            type: 'processing_error',
            code: 'internal_error',
            message: 'An error occurred while canceling the checkout',
        });
    }
});
/**
 * GET /products
 * List products (internal endpoint, not part of ACP spec)
 */
app.get('/products', (_req, res) => {
    try {
        const productsArray = Object.values(datastructures_1.PRODUCT_CATALOG);
        res.json({ products: productsArray });
    }
    catch (error) {
        console.error('Error retrieving product catalog:', error);
        res.status(500).json({
            type: 'processing_error',
            code: 'internal_error',
            message: 'An error occurred while retrieving the product catalog',
        });
    }
});
// Start server (only if not being imported for testing)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n✨ ACP Seller Backend Server is running!`);
        console.log(`📍 Port: ${PORT}`);
        console.log(`🔗 Base URL: http://localhost:${PORT}`);
        console.log(`\nAvailable endpoints:`);
        console.log(`  GET    /products                                - List products (internal)`);
        console.log(`  POST   /checkout_sessions                       - Create checkout`);
        console.log(`  GET    /checkout_sessions/:id                   - Get checkout`);
        console.log(`  POST   /checkout_sessions/:id                   - Update checkout`);
        console.log(`  POST   /checkout_sessions/:id/complete          - Complete checkout`);
        console.log(`  POST   /checkout_sessions/:id/cancel            - Cancel checkout`);
        console.log(`\n`);
    });
}
exports.default = app;
