/**
 * Agentic Commerce Protocol - Simple Seller Backend
 * 
 * This file implements a TypeScript Express server that handles checkout sessions
 * according to the Agentic Commerce Protocol specification. It provides endpoints
 * for creating, retrieving, updating, completing, and canceling checkout sessions.
 * 
 * Responsibilities:
 * - Validates requests using OpenAPI specification
 * - Manages checkout session lifecycle (create, read, update, complete, cancel)
 * - Integrates with Stripe payment processing (with mock SPT support for demos)
 * - Maintains in-memory checkout storage for demo purposes
 */

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
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

// ============================================================================
// CONSTANTS
// ============================================================================

const PORT = 3000;
const DEFAULT_CURRENCY = 'usd';
const DEFAULT_FULFILLMENT_OPTION_ID = 'shipping_standard';
const TERMS_URL = 'https://example.com/terms';
const PRIVACY_URL = 'https://example.com/privacy';
const MOCK_STRIPE_SPT_URL = process.env.MOCK_STRIPE_SPT_URL || 'http://localhost:8001';
const STRIPE_API_URL = 'https://api.stripe.com/v1/payment_intents';

// ============================================================================
// INTERFACES
// ============================================================================

interface CheckoutStore {
  [key: string]: CheckoutSession;
}

interface RequestWithCheckout extends Request {
  checkout: CheckoutSession;
}

interface PaymentData {
  token: string;
}

interface CompleteCheckoutRequest {
  payment_data?: PaymentData;
  buyer?: components['schemas']['Buyer'];
}

interface CreateCheckoutRequest {
  items: Item[];
  buyer?: components['schemas']['Buyer'];
  fulfillment_address?: components['schemas']['Address'];
}

interface UpdateCheckoutRequest {
  items?: Item[];
  buyer?: components['schemas']['Buyer'];
  fulfillment_address?: components['schemas']['Address'];
  fulfillment_option_id?: string;
}

interface StripePaymentIntentResponse {
  id?: string;
  error?: {
    message: string;
  };
}

interface MockSptResponse {
  payment_method: string;
  error?: {
    message: string;
  };
}

interface OrderDetails {
  id: string;
  checkout_session_id: string;
  permalink_url: string;
}

interface CheckoutSessionWithOrder extends CheckoutSession {
  order: OrderDetails;
}

// Type aliases from OpenAPI spec
type CheckoutSession = components['schemas']['CheckoutSession'];
type Item = components['schemas']['Item'];
type ErrorResponse = components['schemas']['Error'];

// ============================================================================
// MAIN ENTRYPOINT
// ============================================================================

const app = express();

// Middleware
app.use(express.json());

// OpenAPI Validator Middleware
// Use path that works in both dev (ts-node) and production (compiled to dist/)
const apiSpecPath = __dirname.includes('/dist')
  ? path.join(__dirname, '..', 'openapi.agentic_checkout.yaml')
  : path.join(__dirname, 'openapi.agentic_checkout.yaml');

// Load OpenAPI spec for Swagger UI
const openApiSpec = YAML.load(apiSpecPath);

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ACP Seller Backend API Documentation'
}));

app.use(
  OpenApiValidator.middleware({
    apiSpec: apiSpecPath,
    validateRequests: true,
    validateResponses: false,
    validateSecurity: false,
    ignorePaths: /\/products|\/api-docs|\//,
  })
);

// In-memory storage for checkouts (for demo purposes)
const checkouts: CheckoutStore = {};

// ============================================================================
// MAIN ENDPOINTS
// ============================================================================

/**
 * GET /
 * Root endpoint - redirects to API documentation
 */
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/api-docs');
});

/**
 * POST /checkout_sessions
 * Create a new Checkout Session
 * 
 * @param req - Express request containing items, buyer, and fulfillment_address
 * @param res - Express response
 * @returns Created CheckoutSession object
 */
app.post('/checkout_sessions', (req: Request, res: Response) => {
  try {
    const { items, buyer, fulfillment_address } = req.body as CreateCheckoutRequest;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items array is required and must not be empty');
    }

    const checkout = createCheckoutSession(items, buyer, fulfillment_address);
    checkouts[checkout.id] = checkout;

    res.status(201).json(checkout);
  } catch (error) {
    handleError(res, error, 'creating checkout');
  }
});

/**
 * GET /checkout_sessions/:checkout_session_id
 * Retrieve a Checkout Session
 * 
 * @param req - Express request with checkout_session_id parameter
 * @param res - Express response
 * @returns CheckoutSession object
 */
app.get(
  '/checkout_sessions/:checkout_session_id',
  checkoutExists,
  (req: Request, res: Response) => {
    const requestWithCheckout = req as RequestWithCheckout;
    const checkout = requestWithCheckout.checkout;
    res.json(checkout);
  }
);

/**
 * POST /checkout_sessions/:checkout_session_id
 * Update a Checkout Session
 * 
 * @param req - Express request with checkout_session_id and update data
 * @param res - Express response
 * @returns Updated CheckoutSession object
 */
app.post(
  '/checkout_sessions/:checkout_session_id',
  checkoutExists,
  checkoutModifiable,
  (req: Request, res: Response) => {
    try {
      const requestWithCheckout = req as RequestWithCheckout;
      const checkout = requestWithCheckout.checkout;
      const { checkout_session_id } = req.params;
      const updateData = req.body as UpdateCheckoutRequest;

      updateCheckoutSession(checkout, updateData);
      checkouts[checkout_session_id] = checkout;

      res.json(checkout);
    } catch (error) {
      handleError(res, error, 'updating checkout');
    }
  }
);

/**
 * POST /checkout_sessions/:checkout_session_id/complete
 * Complete a Checkout Session
 * 
 * @param req - Express request with checkout_session_id and payment_data
 * @param res - Express response
 * @returns CheckoutSessionWithOrder object
 */
app.post(
  '/checkout_sessions/:checkout_session_id/complete',
  checkoutExists,
  checkoutModifiable,
  async (req: Request, res: Response) => {
    try {
      const requestWithCheckout = req as RequestWithCheckout;
      const checkout = requestWithCheckout.checkout;
      const { checkout_session_id } = req.params;
      const { payment_data, buyer } = req.body as CompleteCheckoutRequest;

      if (!payment_data) {
        throw new Error('Payment data is required');
      }

      if (buyer) {
        checkout.buyer = createBuyer(buyer);
      }

      await processPayment(checkout, payment_data);
      
      checkout.status = CheckoutStatus.COMPLETED;
      addMessage(checkout, MessageType.INFO, 'Payment processed successfully. Order confirmed!');
      delete checkout.payment_provider;

      checkouts[checkout_session_id] = checkout;

      const response = createCheckoutSessionWithOrder(checkout, checkout_session_id);
      res.json(response);
    } catch (error) {
      handleError(res, error, 'completing checkout');
    }
  }
);

/**
 * POST /checkout_sessions/:checkout_session_id/cancel
 * Cancel a Checkout Session
 * 
 * @param req - Express request with checkout_session_id
 * @param res - Express response
 * @returns Canceled CheckoutSession object
 */
app.post(
  '/checkout_sessions/:checkout_session_id/cancel',
  checkoutExists,
  (req: Request, res: Response) => {
    try {
      const requestWithCheckout = req as RequestWithCheckout;
      const checkout = requestWithCheckout.checkout;
      const { checkout_session_id } = req.params;

      validateCheckoutCanBeCanceled(checkout);
      cancelCheckoutSession(checkout);
      checkouts[checkout_session_id] = checkout;

      res.json(checkout);
    } catch (error) {
      handleError(res, error, 'canceling checkout');
    }
  }
);

/**
 * GET /products
 * List products (internal endpoint, not part of ACP spec)
 * 
 * @param req - Express request
 * @param res - Express response
 * @returns Object containing products array
 */
app.get('/products', (_req: Request, res: Response) => {
  try {
    const productsArray = Object.values(PRODUCT_CATALOG);
    res.json({ products: productsArray });
  } catch (error) {
    handleError(res, error, 'retrieving product catalog');
  }
});

// Start server (only if not being imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\nACP Seller Backend Server is running!`);
    console.log(`Port: ${PORT}`);
    console.log(`Base URL: http://localhost:${PORT}`);
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Middleware to check if checkout exists
 * 
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
function checkoutExists(req: Request, res: Response, next: NextFunction): void {
  const { checkout_session_id } = req.params;
  const checkout = checkouts[checkout_session_id];

  if (!checkout) {
    res.status(404).json({
      type: 'invalid_request',
      code: 'not_found',
      message: `Checkout session ${checkout_session_id} not found`,
    } as ErrorResponse);
    return;
  }

  (req as RequestWithCheckout).checkout = checkout;
  next();
}

/**
 * Middleware to check if checkout can be modified
 * 
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
function checkoutModifiable(req: Request, res: Response, next: NextFunction): void {
  const requestWithCheckout = req as RequestWithCheckout;
  const checkout = requestWithCheckout.checkout;

  if (checkout.status === CheckoutStatus.COMPLETED) {
    res.status(400).json({
      type: 'invalid_request',
      code: 'checkout_completed',
      message: 'Cannot modify a completed checkout',
    } as ErrorResponse);
    return;
  }

  if (checkout.status === CheckoutStatus.CANCELED) {
    res.status(400).json({
      type: 'invalid_request',
      code: 'checkout_canceled',
      message: 'Cannot modify a canceled checkout',
    } as ErrorResponse);
    return;
  }

  next();
}

/**
 * Create a new checkout session
 * 
 * @param items - Array of items to include in checkout
 * @param buyer - Optional buyer information
 * @param fulfillment_address - Optional fulfillment address
 * @returns Created CheckoutSession object
 */
function createCheckoutSession(
  items: Item[],
  buyer?: components['schemas']['Buyer'],
  fulfillment_address?: components['schemas']['Address']
): CheckoutSession {
  const checkoutId = generateId('checkout');
  const lineItems = items.map((item: Item) => {
    const product = PRODUCT_CATALOG[item.id];
    if (!product) {
      throw new Error(`Product ${item.id} not found in catalog`);
    }
    return createLineItem(item, product);
  });

  const fulfillmentOptions = getFulfillmentOptions();
  const fulfillmentOptionId = fulfillment_address ? DEFAULT_FULFILLMENT_OPTION_ID : null;
  const selectedFulfillment = fulfillmentOptions.find(
    (opt) => opt.id === fulfillmentOptionId
  ) || null;

  const checkout: CheckoutSession = {
    id: checkoutId,
    buyer: buyer ? createBuyer(buyer) : undefined,
    payment_provider: createPaymentProvider(),
    status: fulfillment_address
      ? CheckoutStatus.READY_FOR_PAYMENT
      : CheckoutStatus.NOT_READY_FOR_PAYMENT,
    currency: DEFAULT_CURRENCY,
    line_items: lineItems,
    fulfillment_address: fulfillment_address
      ? createAddress(fulfillment_address)
      : undefined,
    fulfillment_options: fulfillmentOptions,
    fulfillment_option_id: fulfillmentOptionId || undefined,
    totals: calculateTotals(lineItems, selectedFulfillment),
    messages: [],
    links: [
      {
        type: 'terms_of_use',
        url: TERMS_URL,
      },
      {
        type: 'privacy_policy',
        url: PRIVACY_URL,
      },
    ],
  };

  return checkout;
}

/**
 * Update an existing checkout session
 * 
 * @param checkout - Checkout session to update
 * @param updateData - Data to update the checkout with
 */
function updateCheckoutSession(
  checkout: CheckoutSession,
  updateData: UpdateCheckoutRequest
): void {
  if (updateData.items) {
    checkout.line_items = updateData.items.map((item: Item) => {
      const product = PRODUCT_CATALOG[item.id];
      if (!product) {
        throw new Error(`Product ${item.id} not found in catalog`);
      }
      return createLineItem(item, product);
    });
  }

  if (updateData.buyer) {
    checkout.buyer = createBuyer(updateData.buyer);
  }

  if (updateData.fulfillment_address) {
    checkout.fulfillment_address = createAddress(updateData.fulfillment_address);
    if (!checkout.fulfillment_option_id && checkout.fulfillment_options.length > 0) {
      checkout.fulfillment_option_id = checkout.fulfillment_options[0].id;
    }
  }

  if (updateData.fulfillment_option_id) {
    validateFulfillmentOption(checkout, updateData.fulfillment_option_id);
    checkout.fulfillment_option_id = updateData.fulfillment_option_id;
  }

  recalculateCheckoutTotals(checkout);
  updateCheckoutStatus(checkout);
}

/**
 * Validate that a fulfillment option exists in the checkout
 * 
 * @param checkout - Checkout session
 * @param fulfillmentOptionId - Fulfillment option ID to validate
 * @throws Error if fulfillment option is not found
 */
function validateFulfillmentOption(
  checkout: CheckoutSession,
  fulfillmentOptionId: string
): void {
  const option = checkout.fulfillment_options.find(
    (opt) => opt.id === fulfillmentOptionId
  );
  if (!option) {
    throw new Error(`Fulfillment option ${fulfillmentOptionId} not found`);
  }
}

/**
 * Recalculate totals for a checkout session
 * 
 * @param checkout - Checkout session to recalculate totals for
 */
function recalculateCheckoutTotals(checkout: CheckoutSession): void {
  const selectedFulfillment = checkout.fulfillment_options.find(
    (opt) => opt.id === checkout.fulfillment_option_id && opt.type === 'shipping'
  );
  checkout.totals = calculateTotals(
    checkout.line_items,
    selectedFulfillment && selectedFulfillment.type === 'shipping' ? selectedFulfillment : null
  );
}

/**
 * Update checkout status based on fulfillment requirements
 * 
 * @param checkout - Checkout session to update status for
 */
function updateCheckoutStatus(checkout: CheckoutSession): void {
  if (checkout.fulfillment_address && checkout.fulfillment_option_id) {
    checkout.status = CheckoutStatus.READY_FOR_PAYMENT;
  } else {
    checkout.status = CheckoutStatus.NOT_READY_FOR_PAYMENT;
  }
}

/**
 * Process payment for a checkout session
 * 
 * @param checkout - Checkout session to process payment for
 * @param paymentData - Payment data containing token
 * @throws Error if payment processing fails
 */
async function processPayment(
  checkout: CheckoutSession,
  paymentData: PaymentData
): Promise<void> {
  const totalAmount = getTotalAmount(checkout);
  
  if (paymentData.token.startsWith('spt_')) {
    await processMockSptPayment(checkout, paymentData, totalAmount);
  } else {
    throw new Error('Only SPT tokens are supported in demo mode');
  }
}

/**
 * Get total amount from checkout totals
 * 
 * @param checkout - Checkout session
 * @returns Total amount in cents
 * @throws Error if total amount is not found
 */
function getTotalAmount(checkout: CheckoutSession): number {
  const totalAmount = checkout.totals.find((t) => t.type === 'total')?.amount;
  if (!totalAmount) {
    throw new Error('Total amount not found');
  }
  return totalAmount;
}

/**
 * Process payment using mock Stripe SPT server
 * 
 * @param checkout - Checkout session
 * @param paymentData - Payment data containing SPT token
 * @param totalAmount - Total amount to charge in cents
 * @throws Error if payment processing fails
 */
async function processMockSptPayment(
  checkout: CheckoutSession,
  paymentData: PaymentData,
  totalAmount: number
): Promise<void> {
  // Step 1: Retrieve payment method from mock SPT server
  const sptResponse = await fetch(
    `${MOCK_STRIPE_SPT_URL}/v1/shared_payment/granted_tokens/${paymentData.token}`
  );

  const sptData = await sptResponse.json() as MockSptResponse;

  if (!sptResponse.ok) {
    throw new Error(sptData.error?.message || 'Failed to retrieve payment token');
  }
  if (!sptData.payment_method) {
    throw new Error('Payment method not found in SPT response');
  }

  // Step 2: Create Stripe Payment Intent with the retrieved payment method
  const stripeResponse = await fetch(STRIPE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${process.env.SELLER_API_KEY}`,
    },
    body: new URLSearchParams({
      amount: totalAmount.toString(),
      currency: DEFAULT_CURRENCY,
      payment_method: sptData.payment_method,
      'payment_method_types[]': 'card',
      confirm: 'true',
    }).toString(),
  });

  const paymentIntent = await stripeResponse.json() as StripePaymentIntentResponse;

  if (!paymentIntent.id || paymentIntent.error) {
    throw new Error(paymentIntent.error?.message || 'Payment intent execution failed');
  }
}

/**
 * Create checkout session with order details
 * 
 * @param checkout - Checkout session
 * @param checkoutSessionId - Checkout session ID
 * @returns CheckoutSessionWithOrder object
 */
function createCheckoutSessionWithOrder(
  checkout: CheckoutSession,
  checkoutSessionId: string
): CheckoutSessionWithOrder {
  const orderId = generateId('order');
  return {
    ...checkout,
    order: {
      id: orderId,
      checkout_session_id: checkoutSessionId,
      permalink_url: `https://example.com/orders/${orderId}`,
    },
  };
}

/**
 * Validate that checkout can be canceled
 * 
 * @param checkout - Checkout session to validate
 * @throws Error if checkout cannot be canceled
 */
function validateCheckoutCanBeCanceled(checkout: CheckoutSession): void {
  if (checkout.status === CheckoutStatus.COMPLETED) {
    throw new Error('Cannot cancel a completed checkout');
  }

  if (checkout.status === CheckoutStatus.CANCELED) {
    throw new Error('Checkout is already canceled');
  }
}

/**
 * Cancel a checkout session
 * 
 * @param checkout - Checkout session to cancel
 */
function cancelCheckoutSession(checkout: CheckoutSession): void {
  checkout.status = CheckoutStatus.CANCELED;
  addMessage(checkout, MessageType.INFO, 'Checkout has been canceled');
}

/**
 * Add an info message to a checkout session
 * 
 * @param checkout - Checkout session
 * @param type - Message type (must be INFO)
 * @param content - Message content
 */
function addMessage(
  checkout: CheckoutSession,
  type: MessageType,
  content: string
): void {
  if (type !== MessageType.INFO) {
    throw new Error('Only INFO messages are supported by addMessage');
  }
  
  checkout.messages.push({
    type: 'info',
    content_type: 'plain',
    content: content,
  });
}

/**
 * Handle errors and send appropriate error response
 * 
 * @param res - Express response
 * @param error - Error object
 * @param context - Context string for error logging
 */
function handleError(res: Response, error: unknown, context: string): void {
  console.error(`Error ${context}:`, error);
  
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  const errorCode = getErrorCode(errorMessage);
  
  res.status(getErrorStatusCode(errorCode)).json({
    type: 'processing_error',
    code: errorCode,
    message: errorMessage,
  } as ErrorResponse);
}

/**
 * Get error code from error message
 * 
 * @param message - Error message
 * @returns Error code string
 */
function getErrorCode(message: string): string {
  if (message.includes('not found')) {
    return 'not_found';
  }
  if (message.includes('required')) {
    return 'missing_required_field';
  }
  if (message.includes('invalid')) {
    return 'invalid_request';
  }
  return 'internal_error';
}

/**
 * Get HTTP status code for error code
 * 
 * @param errorCode - Error code
 * @returns HTTP status code
 */
function getErrorStatusCode(errorCode: string): number {
  if (errorCode === 'not_found') {
    return 404;
  }
  if (errorCode === 'missing_required_field' || errorCode === 'invalid_request') {
    return 400;
  }
  return 500;
}
