# Agentic Commerce Protocol (ACP) Implementation
Complete implementation of the Agentic Commerce Protocol with seller backend and chat backend.

> Note: because an important part of the ACP protocol (the Shared Payment Token) isn't yet publicly available, we added a `mock_stripe_spt` server to this example.

## Architecture

```
Chat Frontend (HTML/JS) → Chat Backend (Python/Flask) → Seller Backend (Node.js/Express)
Port: 8000                     Port: 9000                    Port: 3000
                                    ↓                             ↓↓
                          Mock Stripe SPT Server ←────────────────┘↓
                                Port: 8001                         ↓
                                                              Stripe API
                                                            (test mode)
```

**Flow:**
1. Chat Backend → Mock SPT Server (stores payment method)
2. Seller Backend → Mock SPT Server (retrieves payment method)
3. Seller Backend → Stripe API (processes payment in test mode)


## Environment Variables

Each service requires environment variables to be configured. Copy the `.env.example` file to `.env` in each directory and update the values as needed.

### Seller Backend
Create [seller_backend/.env](seller_backend/.env) from [seller_backend/.env.example](seller_backend/.env.example):
```bash
SELLER_API_KEY="sk_test_..."      # Stripe secret key
MOCK_STRIPE_SPT_URL="http://localhost:8001"  # Mock SPT server URL
```

### Chat Backend
Create [chat_backend/.env](chat_backend/.env) from [chat_backend/.env.example](chat_backend/.env.example):
```bash
SELLER_BACKEND_URL=http://localhost:3000     # Seller backend URL
MOCK_STRIPE_SPT_URL=http://localhost:8001    # Mock SPT server URL
CHAT_BACKEND_PORT=9000                       # Port for chat backend
DEBUG=True                                   # Enable debug mode
FACILITATOR_API_KEY="sk_"                    # Not used (only needed for real Stripe SPT, not mock)
DAT1_API_KEY=                                # DAT1 API key for LLM
```

### Mock Stripe SPT Server
Create [mock_stripe_spt/.env](mock_stripe_spt/.env) from [mock_stripe_spt/.env.example](mock_stripe_spt/.env.example):
```bash
MOCK_STRIPE_SPT_PORT=8001  # Port for mock SPT server
```

## Quick Start

### Start All Services at Once

**Using VS Code/Cursor Tasks**
1. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Tasks: Run Task"
3. Select "Start All Services"
4. This will start all 4 services in separate integrated terminal tabs

**Option 2: Using Shell Script (Opens 4 Terminal.app windows)**
```bash
./start-all.sh
```

This will execute the manual steps described below.

---

### Manual Start (Individual Services)

### 0. Mock Stripe SPT Server
```bash
cd mock_stripe_spt
pip install -r requirements.txt
python server.py
```

### 1. Seller Backend
```bash
cd seller_backend
npm install
npm start
```

### 2. Chat Backend
```bash
cd chat_backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

### 3. Chat Frontend
```bash
cd chat_frontend
python -m http.server 8000
```

## API Endpoints

### Seller Backend (Port 3000)
ACP-compliant checkout implementation:
- `GET /products` - List available products
- `POST /checkout_sessions` - Create new checkout session
- `GET /checkout_sessions/:checkout_session_id` - Retrieve checkout session
- `POST /checkout_sessions/:checkout_session_id` - Update checkout session
- `POST /checkout_sessions/:checkout_session_id/complete` - Complete checkout with payment
- `POST /checkout_sessions/:checkout_session_id/cancel` - Cancel checkout session

### Chat Backend (Port 9000)
Bridge between chat frontend and seller backend:
- `GET /products` - List products from seller
- `POST /checkout/create` - Create checkout session
- `GET /checkout/<checkout_id>` - Retrieve checkout status
- `PUT /checkout/<checkout_id>/update` - Update checkout details
- `POST /checkout/<checkout_id>/complete` - Complete checkout with SPT
- `POST /checkout/<checkout_id>/cancel` - Cancel checkout
- `POST /chat` - Process chat messages with LLM
- `POST /exchange_token` - Exchange payment token for SPT

### Mock Stripe SPT Server (Port 8001)
Simulates Stripe's Shared Payment Token API:
- `POST /v1/shared_payment/issued_tokens` - Create SPT (called by chat backend)
- `GET /v1/shared_payment/granted_tokens/<spt_id>` - Retrieve payment method (called by seller backend)
- `GET /health` - Health check endpoint

## Documentation

- **Seller Backend**: [seller_backend/README.md](seller_backend/README.md)
- **Chat Backend**: [chat_backend/README.md](chat_backend/README.md)
- **Chat Frontend**: [chat_frontend/README.md](chat_frontend/README.md)
- **Mock Stripe SPT Server**: [mock_stripe_spt/README.md](mock_stripe_spt/README.md)


## Disclaimer
- Not Production Ready: This code is not designed, tested, or intended for use in production environments. It may contain known bugs, security vulnerabilities, or performance issues.

- No Guarantees: We make no warranties, express or implied, regarding the stability, reliability, or completeness of the code. Use it at your own risk.

- Experimental Nature: Features and APIs are subject to change without notice. This project should not be relied upon for long-term development.