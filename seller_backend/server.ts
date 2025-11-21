/**
 * Agentic Commerce Protocol - Simple Seller Backend
 * TypeScript implementation with OpenAPI validation
 */

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import path from 'path';
import { components } from './types/openapi';
import {
  CheckoutStatus,
  MessageType,
  PRODUCT_CATALOG,
  createBuyer,
  createAddress,
  createLineItem,
  getFulfillmentOptions,
  calculateTotals,
  createPaymentProvider,
  generateId,
} from './datastructures';

const app = express();
const PORT = 3000;

// Type aliases from OpenAPI spec
type CheckoutSession = components['schemas']['CheckoutSession'];
type Item = components['schemas']['Item'];
type ErrorResponse = components['schemas']['Error'];

// Middleware
app.use(express.json());

// OpenAPI Validator Middleware
// Use path that works in both dev (ts-node) and production (compiled to dist/)
const apiSpecPath = __dirname.includes('/dist')
  ? path.join(__dirname, '..', 'openapi.agentic_checkout.yaml')
  : path.join(__dirname, 'openapi.agentic_checkout.yaml');

app.use(
  OpenApiValidator.middleware({
    apiSpec: apiSpecPath,
    validateRequests: true,
    validateResponses: false, // Set to true in development for strict validation
    validateSecurity: false, // We'll handle auth separately for demo purposes
    ignorePaths: /\/products|\//, // Allow internal endpoints not in ACP spec
  })
);

// In-memory storage for checkouts (for demo purposes)
interface CheckoutStore {
  [key: string]: CheckoutSession;
}
const checkouts: CheckoutStore = {};

/**
 * Middleware to check if checkout exists
 */
function checkoutExists(req: Request, res: Response, next: NextFunction) {
  const { checkout_session_id } = req.params;
  const checkout = checkouts[checkout_session_id];

  if (!checkout) {
    return res.status(404).json({
      type: 'invalid_request',
      code: 'not_found',
      message: `Checkout session ${checkout_session_id} not found`,
    } as ErrorResponse);
  }

  // Attach checkout to request for use in handler
  (req as any).checkout = checkout;
  next();
}

/**
 * Middleware to check if checkout can be modified
 */
function checkoutModifiable(req: Request, res: Response, next: NextFunction) {
  const checkout = (req as any).checkout as CheckoutSession;

  if (checkout.status === CheckoutStatus.COMPLETED) {
    return res.status(400).json({
      type: 'invalid_request',
      code: 'checkout_completed',
      message: 'Cannot modify a completed checkout',
    } as ErrorResponse);
  }

  if (checkout.status === CheckoutStatus.CANCELED) {
    return res.status(400).json({
      type: 'invalid_request',
      code: 'checkout_canceled',
      message: 'Cannot modify a canceled checkout',
    } as ErrorResponse);
  }

  next();
}

/**
 * POST /checkout_sessions
 * Create a new Checkout Session
 */
app.post('/checkout_sessions', (req: Request, res: Response) => {
  try {
    const { items, buyer, fulfillment_address } = req.body;

    // Create checkout
    const checkoutId = generateId('checkout');
    const lineItems = items.map((item: Item) => {
      const product = PRODUCT_CATALOG[item.id];
      return createLineItem(item, product);
    });

    const fulfillmentOptions = getFulfillmentOptions();
    const fulfillmentOptionId = fulfillment_address ? 'shipping_standard' : null;
    const selectedFulfillment = fulfillmentOptions.find(
      (opt) => opt.id === fulfillmentOptionId
    );

    const checkout: CheckoutSession = {
      id: checkoutId,
      buyer: buyer ? createBuyer(buyer) : undefined,
      payment_provider: createPaymentProvider(),
      status: fulfillment_address
        ? CheckoutStatus.READY_FOR_PAYMENT
        : CheckoutStatus.NOT_READY_FOR_PAYMENT,
      currency: 'usd',
      line_items: lineItems,
      fulfillment_address: fulfillment_address
        ? createAddress(fulfillment_address)
        : undefined,
      fulfillment_options: fulfillmentOptions,
      fulfillment_option_id: fulfillmentOptionId || undefined,
      totals: calculateTotals(lineItems, selectedFulfillment || null),
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
  } catch (error) {
    console.error('Error creating checkout:', error);
    res.status(500).json({
      type: 'processing_error',
      code: 'internal_error',
      message: 'An error occurred while creating the checkout',
    } as ErrorResponse);
  }
});

/**
 * GET /checkout_sessions/:checkout_session_id
 * Retrieve a Checkout Session
 */
app.get(
  '/checkout_sessions/:checkout_session_id',
  checkoutExists,
  (req: Request, res: Response) => {
    const checkout = (req as any).checkout as CheckoutSession;
    res.json(checkout);
  }
);

/**
 * POST /checkout_sessions/:checkout_session_id
 * Update a Checkout Session
 */
app.post(
  '/checkout_sessions/:checkout_session_id',
  checkoutExists,
  checkoutModifiable,
  (req: Request, res: Response) => {
    try {
      const { checkout_session_id } = req.params;
      const { items, buyer, fulfillment_address, fulfillment_option_id } =
        req.body;
      const checkout = (req as any).checkout as CheckoutSession;

      // Update items if provided
      if (items) {
        checkout.line_items = items.map((item: Item) => {
          const product = PRODUCT_CATALOG[item.id];
          return createLineItem(item, product);
        });
      }

      // Update buyer if provided
      if (buyer) {
        checkout.buyer = createBuyer(buyer);
      }

      // Update fulfillment address if provided
      if (fulfillment_address) {
        checkout.fulfillment_address = createAddress(fulfillment_address);
        // Auto-select default fulfillment option if none is set
        if (
          !checkout.fulfillment_option_id &&
          checkout.fulfillment_options.length > 0
        ) {
          checkout.fulfillment_option_id = checkout.fulfillment_options[0].id;
        }
      }

      // Update fulfillment option if provided
      if (fulfillment_option_id) {
        const option = checkout.fulfillment_options.find(
          (opt) => opt.id === fulfillment_option_id
        );
        if (!option) {
          return res.status(400).json({
            type: 'invalid_request',
            code: 'invalid_fulfillment_option',
            message: `Fulfillment option ${fulfillment_option_id} not found`,
          } as ErrorResponse);
        }
        checkout.fulfillment_option_id = fulfillment_option_id;
      }

      // Recalculate totals
      const selectedFulfillment = checkout.fulfillment_options.find(
        (opt) => opt.id === checkout.fulfillment_option_id && opt.type === 'shipping'
      );
      checkout.totals = calculateTotals(
        checkout.line_items,
        selectedFulfillment && selectedFulfillment.type === 'shipping' ? selectedFulfillment : null
      );

      // Update status
      if (checkout.fulfillment_address && checkout.fulfillment_option_id) {
        checkout.status = CheckoutStatus.READY_FOR_PAYMENT;
      } else {
        checkout.status = CheckoutStatus.NOT_READY_FOR_PAYMENT;
      }

      checkouts[checkout_session_id] = checkout;

      res.json(checkout);
    } catch (error) {
      console.error('Error updating checkout:', error);
      res.status(500).json({
        type: 'processing_error',
        code: 'internal_error',
        message: 'An error occurred while updating the checkout',
      } as ErrorResponse);
    }
  }
);

/**
 * POST /checkout_sessions/:checkout_session_id/complete
 * Complete a Checkout Session
 */
app.post(
  '/checkout_sessions/:checkout_session_id/complete',
  checkoutExists,
  checkoutModifiable,
  async (req: Request, res: Response) => {
    try {
      const { checkout_session_id } = req.params;
      const { payment_data, buyer } = req.body;
      const checkout = (req as any).checkout as CheckoutSession;

      if (!payment_data) {
        return res.status(400).json({
          type: 'invalid_request',
          code: 'missing_payment_data',
          message: 'Payment data is required',
        } as ErrorResponse);
      }

      // Update buyer if provided
      if (buyer) {
        checkout.buyer = createBuyer(buyer);
      }

      // Execute Stripe payment intent
      const totalAmount = checkout.totals.find((t) => t.type === 'total')?.amount;

      if (!totalAmount) {
        return res.status(400).json({
          type: 'invalid_request',
          code: 'invalid_total',
          message: 'Total amount not found',
        } as ErrorResponse);
      }

      console.log('Processing payment for amount:', totalAmount);

      const executePaymentIntentResponse = await fetch(
        'https://api.stripe.com/v1/payment_intents',
        {
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
        }
      );

      const data: any = await executePaymentIntentResponse.json();
      console.log('Payment response:', data);

      // Check if payment failed (no id means error)
      if (!data.id || data.error) {
        return res.status(400).json({
          type: 'invalid_request',
          code: 'payment_intent_execution_failed',
          message: data.error?.message || 'Payment intent execution failed',
        } as ErrorResponse);
      }

      // Payment processed successfully
      checkout.status = CheckoutStatus.COMPLETED;
      checkout.messages.push({
        type: MessageType.INFO,
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
          id: generateId('order'),
          checkout_session_id: checkout_session_id,
          permalink_url: `https://example.com/orders/${generateId('order')}`,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error completing checkout:', error);
      res.status(500).json({
        type: 'processing_error',
        code: 'internal_error',
        message: 'An error occurred while completing the checkout',
      } as ErrorResponse);
    }
  }
);

/**
 * POST /checkout_sessions/:checkout_session_id/cancel
 * Cancel a Checkout Session
 */
app.post(
  '/checkout_sessions/:checkout_session_id/cancel',
  checkoutExists,
  (req: Request, res: Response) => {
    try {
      const { checkout_session_id } = req.params;
      const checkout = (req as any).checkout as CheckoutSession;

      if (checkout.status === CheckoutStatus.COMPLETED) {
        return res.status(405).json({
          type: 'invalid_request',
          code: 'checkout_completed',
          message: 'Cannot cancel a completed checkout',
        } as ErrorResponse);
      }

      if (checkout.status === CheckoutStatus.CANCELED) {
        return res.status(400).json({
          type: 'invalid_request',
          code: 'checkout_already_canceled',
          message: 'Checkout is already canceled',
        } as ErrorResponse);
      }

      checkout.status = CheckoutStatus.CANCELED;
      checkout.messages.push({
        type: MessageType.INFO,
        content_type: 'plain',
        content: 'Checkout has been canceled',
      });

      checkouts[checkout_session_id] = checkout;

      res.json(checkout);
    } catch (error) {
      console.error('Error canceling checkout:', error);
      res.status(500).json({
        type: 'processing_error',
        code: 'internal_error',
        message: 'An error occurred while canceling the checkout',
      } as ErrorResponse);
    }
  }
);

/**
 * GET /products
 * List products (internal endpoint, not part of ACP spec)
 */
app.get('/products', (_req: Request, res: Response) => {
  try {
    const productsArray = Object.values(PRODUCT_CATALOG);
    res.json({ products: productsArray });
  } catch (error) {
    console.error('Error retrieving product catalog:', error);
    res.status(500).json({
      type: 'processing_error',
      code: 'internal_error',
      message: 'An error occurred while retrieving the product catalog',
    } as ErrorResponse);
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

export default app;