# ACP Seller Backend

OpenAPI-driven TypeScript implementation of the Agentic Commerce Protocol (ACP) seller backend.

## Quick Start

### Install Dependencies
```bash
npm install
```

### Build
```bash
npm run build
```

### Development Mode (with hot reload)
```bash
npm run dev
```

Server runs on `http://localhost:3000`

## API Endpoints

### ACP Protocol (OpenAPI validated)
- `POST /checkout_sessions` - Create checkout
- `GET /checkout_sessions/:id` - Retrieve checkout
- `POST /checkout_sessions/:id` - Update checkout
- `POST /checkout_sessions/:id/complete` - Complete checkout
- `POST /checkout_sessions/:id/cancel` - Cancel checkout

### Internal (not in ACP spec)
- `GET /products` - List products

## Project Structure

```
seller_backend/
├── openapi.agentic_checkout.yaml  # API specification (source of truth)
├── server.ts                      # Express server with OpenAPI validation
├── datastructures.ts              # Business logic & helpers
├── types/
│   └── openapi.d.ts              # Auto-generated from OpenAPI spec
├── dist/                         # Compiled JavaScript (after build)
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies & scripts
```

## Environment Variables

Create a `.env` file:
```
SELLER_API_KEY=your_stripe_secret_key
```