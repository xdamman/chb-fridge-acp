# Stripe Agentic Commerce Documentation

## Agentic Commerce (Private Preview)

Learn how to enable secure commerce between buyers, AI agents and businesses.

### Private Preview

If you're interested in using agentic commerce to sell your products through AI agents, including Instant Checkout in ChatGPT, or to manage transactions between buyers and businesses, [join the waitlist](https://go.stripe.global/agentic-commerce-contact-sales).

Agentic commerce refers to the use of AI agents to autonomously discover, evaluate, and complete transactions on behalf of buyers within digital interfaces:

| Audience | Description |
|----------|-------------|
| **For businesses** | Use the [Agentic Commerce Protocol (ACP)](/agentic-commerce/protocol) specification to configure your checkout flow for agentic commerce, allowing any compatible agent to initiate the checkout flow securely. |
| **For AI platforms** | Use ACP to let buyers transact directly with businesses in your application. Use the [SharedPaymentToken](/agentic-commerce/concepts/shared-payment-tokens) object to securely pass payment credentials and risk signals to businesses, without exposing the underlying credentials. SPTs are scoped and time-constrained to a transaction for greater security. |

## Get Started

- [Build your checkout flow for agentic commerce](/agentic-commerce/testing) - Learn how to test end-to-end with Shared Payment Tokens.
- [Integrate the Agentic Commerce Protocol](/agentic-commerce/protocol) - Learn about the Agentic Commerce Protocol and how you can make your checkout ready for agents to transact with.
- [Process payment credentials from an agent](/agentic-commerce/concepts/shared-payment-tokens) - Learn about Shared Payment Tokens and how they enable secure transactions between buyers and sellers.

---

## Build Your Checkout Flow for Agentic Commerce (Private Preview)

Learn about the concepts that enable agentic commerce.

An agent manages transactions between a seller and buyers within an AI interface. It maintains existing relationships with customers, such as their preferences, [payment methods](/api/payment_methods) they use for subscriptions, and customer details. This information enables the agent to make purchase recommendations directly within the AI interface, which can help improve conversion rates and more high-intent purchases.

## Overview

Within the AI interface, agents help buyers and sellers interact to discover products and execute a transaction. Agents issue a [shared payment token](/agentic-commerce/concepts/shared-payment-tokens) (SPT) to manage payment methods.

### Sellers

Sellers are either individual businesses or platforms made up of multiple sellers and typically provide e-commerce goods, subscriptions, digital content or API functions. As a seller, you can use the agent as your sales channel to offer your products.

### AI Agents

Agents are applications that use LLMs which can discover and recommend products for purchase. For example, an AI agent can display products through a user interface in response to a user prompt. Buyers typically have an account or subscription with the AI agent.

The AI agent creates a `Customer` object for each buyer, and stores their payment information so you can reuse it for future purchases.

### Shared Payment Token

Agents issue an SPT with the API, which is a scoped grant of a payment method. A seller can use SPTs directly in [PaymentIntents](/payments/payment-intents) flows, and outside of Stripe through virtualisation.

As a seller, SPTs are uniquely granted to your seller account, which ensures they're used for your transactions. To provide security and control over your payment process, SPTs contain usage limits and expiry windows. Additionally, they never contain real PANs or other raw credentials.

Learn more about how to create and use [shared payment tokens](/agentic-commerce/concepts/shared-payment-tokens).

## Transaction Process

The following diagram shows the transaction process between AI agents and buyers, and how you register and process payment methods.

**Transaction Flow:**

1. **Buyer → Agent**: Submits `PaymentMethod`
2. **Agent → Stripe**: Issues `SharedPaymentToken`
3. **Agent → Seller**: Sends `SharedPaymentToken` and `amount`
4. **Seller → Stripe**: Creates `PaymentIntent` with `SharedPaymentToken`
5. **Stripe**: Processes transaction

---

## Process Payment Credentials from an Agent (Private Preview)

Learn how to create and use a SharedPaymentToken.

To receive payments facilitated by an application or AI agent, you need a secure mechanism to handle payment details collected by the agent and sent to you, the seller.

A shared payment token (SPT) is a limited reference to a payment method that's stored in the agent's Stripe account. It has usage limits and expiration windows, and never reveals PANs or other raw credentials. An agent creates an SPT, then shares it with you to use in payment intent flows and outside of Stripe through virtualization.

### Create a SharedPaymentToken

To create a `SharedPaymentToken` object, the agent first [collects payment details](/payments/accept-a-payment-deferred?type=setup) from the buyer.

When creating an SPT, the agent issues a scoped grant of a [PaymentMethod](/api/payment_methods) for your use as the seller. The agent can set options such as the currency, maximum amount and expiration window.

```bash
curl https://api.stripe.com/v1/shared_payment/issued_tokens \
  -u "{{YOUR_STRIPE_SECRET_KEY}}:" \
  -d payment_method={{PAYMENT_METHOD_ID}} \
  -d "usage_limits[currency]=usd" \
  -d "usage_limits[max_amount]=10000" \
  -d "usage_limits[expires_at]=time_in_future" \
  -d "seller_details[network_id]={{NETWORK_ID}}" \
  -d "seller_details[external_id]={{EXTERNAL_ID}}"
```

#### Usage limits

The `usage_limits` parameter specifies the maximum amount and expiration window. The agent sets the maximum amount to match the total amount of the transaction.

#### Seller details

The `seller_details` parameter sets the scope of the SPT to you or another seller.

- `network_id:` The seller's Network ID.
- `external_id:` An optional identifier that links the SPT to a specific seller, cart/basket or other identifier. For example, an agent interacting with a Connect platform might use the `external_id` to scope the SPT to a connected account.

#### Payment method

The `payment_method` parameter specifies the payment method selected by the customer to use for the purchase.

### Use a shared payment token

After you receive the SPT from the agent, you can use it to create a PaymentIntent and complete the payment.

```bash
curl https://api.stripe.com/v1/payment_intents \
  -u "{{YOUR_STRIPE_SECRET_KEY}}:" \
  -d amount=10000 \
  -d currency=usd \
  -d shared_payment_granted_token=spt_123
```

When you confirm a PaymentIntent this way, the `payment_method` field automatically populates with a new payment method that's reproduced from the one originally used by the buyer to create the SPT. The replication process only transfers non-sensitive data, such as card and billing details, and excludes business-specific information such as metadata, customer data, previous addresses, and CVC check results.

All subsequent events, such as refunds and reporting, operate as if you directly provided the PaymentMethod.

You can retrieve details about the SPT that the agent grants you. You can view limited information about the underlying payment method (for example, card brand or the last 4 digits). The SPTs also include details on usage limits, and might also include risk details.

```bash
curl https://api.stripe.com/v1/shared_payment/granted_tokens/{id} \
  -u "{{YOUR_STRIPE_SECRET_KEY}}:"
```

#### Risk types

The following table provides risk details about the SPTs the agent granted you. Review this information to determine if you need to create a payment.

| Risk type | Description | Score type | Recommendation |
|-----------|-------------|------------|----------------|
| Fraudulent dispute | Likelihood that the credential results in a fraudulent dispute. | Integer | `block` or `continue` |
| Card testing | Likelihood that the credential is card testing. | Float | `block` or `continue` |
| Stolen card | Likelihood that the credential is a stolen card. | Integer | `block` or `continue` |
| Card issuer decline | Likelihood that the card issuer declines the transaction. | Float | `block` or `continue` |
| Bot | Likelihood that the credential is being used by a bot. | Float | `block` or `continue` |

#### Webhooks

When you use an SPT to process a payment, Stripe sends events to you and the agent.

| Event | Description | Use case |
|-------|-------------|----------|
| `shared_payment.issued_token.used` | The agent receives this event when you use the SPT. | Listen for this event to notify the buyer that the payment has been processed. |
| `shared_payment.granted_token.used` | You receive this event when the SPT has been used. | Listen for this event to confirm that the SPT has been used. |

### Revoke a Shared Payment Token

The agent can revoke an SPT at any time. You can't create a payment with a revoked SPT.

```bash
curl https://api.stripe.com/v1/shared_payment/issued_tokens/{id}/revoke \
  -u "{{YOUR_STRIPE_SECRET_KEY}}:" \
  -X POST
```

---

## Testing (Private Preview)

Learn how to test the processing of shared payment tokens (SPTs).

After you create a granted `SharedPaymentToken` object using a PaymentMethod, you can test the functionality of SPTs in an agent by using the token to create a PaymentIntent.

### Create a Shared Payment Token

To grant your account an SPT using a PaymentMethod, you can collect payment details directly from the buyer or use a test PaymentMethod. The following code example demonstrates an agent issuing an SPT and sharing it with you.

```bash
curl https://api.stripe.com/v1/test_helpers/shared_payment/granted_tokens \
  -u "{{YOUR_STRIPE_SECRET_KEY}}" \
  -d payment_method=pm_card_visa \
  -d "usage_limits[currency]=usd" \
  -d "usage_limits[max_amount]=10000" \
  -d "usage_limits[expires_at]={{TIME_IN_FUTURE}}"
```

### Create and confirm a PaymentIntent

Next, create a PaymentIntent using the `SharedPaymentToken` object. The following code example demonstrates how you, as the seller, use the `SharedPaymentToken` object to create a payment.

```bash
curl https://api.stripe.com/v1/payment_intents \
  -u "{{YOUR_STRIPE_SECRET_KEY}}" \
  -d amount=10000 \
  -d currency=usd \
  -d confirm=true \
  -d "payment_method_types[]=card" \
  -d shared_payment_granted_token=spt_123
```

### Listen for webhook events

As the seller, you can listen for usage events related to the SPT to track its use during transactions. The following event notifies you when the SPT has been used.

```
shared_payment.granted_token.used
```

---

## Integrate the Agentic Commerce Protocol (Private Preview)

Learn how to integrate ACP with Stripe.

Agentic Commerce Protocol (ACP) is an open-source specification that enables commerce between compatible applications, such as ChatGPT, and sellers. You can implement it as a RESTful interface or MCP server.

You can use the Agentic Commerce Protocol to make your checkout accessible to applications for initiating and completing checkouts. Applications can securely share payment credentials, including the Stripe [SharedPaymentToken](/agentic-commerce/concepts/shared-payment-tokens) (SPT), for processing in your existing payment stack.

For example, in a typical checkout flow, the user interface, data model and payment processing are entirely the responsibility of the seller. The seller presents a checkout page, stores data about the basket and order, collects payment credentials and processes the payment.

In contrast, during an agentic checkout process, the AI agent is responsible for presenting the checkout interface and collecting payment credentials, while the seller is responsible for their existing data model and payment processing.

To learn more, see [the ACP website](https://agenticcommerce.dev).

### Lifecycle

This section outlines the steps involved in the checkout process, from the buyer's initial intent to order to payment confirmation by the seller.

1. The buyer expresses their intent to order, and the agent initiates checkout with the seller with a `CreateCheckoutRequest`.
2. The seller processes the request and generates a cart, and responds with the current checkout state.
3. The agent renders UI (a checkout interface, text and so on) to relay the current state (for example, total) and options (for example, shipping) to the buyer.
4. After the buyer makes selections, the agent and seller communicate with each other using `UpdateCheckoutRequest`.
5. After the buyer expresses intent to pay, the agent provisions a `SharedPaymentToken`, set to the amount and seller, and shares a `CompleteCheckoutRequest` with the seller.
6. The seller creates a `PaymentIntent` and sends confirmation to the agent.

**Lifecycle Diagram:**

The checkout process follows this sequence:

- **Agent** → **Seller**: Create Checkout
- **Seller**: Generate basket, etc.
- **Seller** → **Agent**: Responds
- **Agent**: Renders UI
- **Agent** → **Seller**: Updates Checkout
- **Seller**: Update basket, etc.
- **Seller** → **Agent**: Responds
- **Agent**: Provision SharedPaymentToken
- **Agent** → **Stripe**: Create SharedPaymentToken
- **Stripe** → **Agent**: Returns token
- **Agent** → **Seller**: Complete Checkout (with SPT)
- **Seller** → **Stripe**: Create PaymentIntent
- **Seller** → **Agent**: Confirmation

---

## Build the Agentic Commerce Protocol Checkout Endpoints (Private Preview)

Learn about the Agentic Commerce Protocol specification.

You can use the Agentic Commerce Protocol (ACP) to enable AI agents to manage commerce transactions between buyers and sellers. This specification defines the methods and data structures for creating, updating and completing checkout flows.

You can find examples for REST integrations below.

### Create a Checkout Session

You can create a new Checkout Session with buyer details, line items and shipping information.

#### Request

Specify the parameters required for your request.

| Parameter | Type | Description |
|-----------|------|-------------|
| **items** | `array` | Array of items you can purchase. **Required** |
| **buyer** | `hash` (optional) | Information about the buyer. |
| **fulfilment_address** | `hash` (optional) | Address where the order will ship. |

**Example Request:**

```json
POST /checkouts
{
  "items": [
    {
      "id": "item_123",
      "quantity": 2
    }
  ],
  "buyer": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890"
  },
  "fulfillment_address": {
    "name": "John Doe",
    "line_one": "123 Main St",
    "line_two": "Apt 4B",
    "city": "San Francisco",
    "state": "CA",
    "country": "US",
    "postal_code": "94105"
  }
}
```

#### Response

The response returns the current state of the checkout from the seller.

| Parameter | Type | Description |
|-----------|------|-------------|
| **id** | `string` | Unique identifier for the Checkout Session. **Required** |
| **buyer** | `hash` (optional) | Information about the buyer. |
| **payment_provider** | `hash` (optional) | Payment provider configuration and supported payment methods. |
| **status** | `string` | Current status of the checkout process. **Required**<br>Possible values: `not_ready_for_payment` \| `ready_for_payment` \| `completed` \| `canceled` \| `in_progress` |
| **currency** | `string` | Three-letter ISO currency code, in lowercase. **Required** |
| **line_items** | `array` | Array of line items in the checkout process. **Required** |
| **fulfilment_address** | `hash` (optional) | Address where the order will ship. |
| **fulfilment_options** | `array` | Available shipping and fulfilment options. **Required** |
| **fulfilment_option_id** | `string` (optional) | ID of the currently selected fulfilment option. |
| **totals** | `array` | Overview of charges and discounts. **Required** |
| **messages** | `array` | Array of messages or notifications related to the checkout process. **Required** |
| **links** | `array` | Array of links related to the checkout process. **Required** |

**Example response:**

```json
{
  "id": "checkout_abc123",
  "buyer": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890"
  },
  "payment_provider": {
    "provider": "stripe",
    "supported_payment_methods": ["card"]
  },
  "status": "ready_for_payment",
  "currency": "usd",
  "line_items": [
    {
      "id": "item_123",
      "item": {
        "id": "item_123",
        "quantity": 2
      },
      "base_amount": 2000,
      "discount": 0,
      "total": 2000,
      "subtotal": 2000,
      "tax": 0
    }
  ],
  "fulfillment_address": {
    "name": "John Doe",
    "line_one": "123 Main St",
    "line_two": "Apt 4B",
    "city": "San Francisco",
    "state": "CA",
    "country": "US",
    "postal_code": "94105"
  },
  "fulfillment_options": [
    {
      "id": "standard",
      "name": "Standard Shipping",
      "amount": 500
    }
  ],
  "totals": [
    {
      "label": "Subtotal",
      "amount": 2000
    },
    {
      "label": "Shipping",
      "amount": 500
    },
    {
      "label": "Total",
      "amount": 2500
    }
  ],
  "messages": [],
  "links": []
}
```
