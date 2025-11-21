# Chat Backend - ACP Client

Python Flask server that bridges chat/AI agents and the seller backend using the Agentic Commerce Protocol.

## Quick Start

### Install & Run
```bash
cd chat_backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

**Note**: Seller backend and Mock SPT server must be running first.

Server starts on `http://localhost:9000`

## API Endpoints

### Checkout Operations
- `GET /products` - List products from seller
- `POST /checkout/create` - Create checkout session
- `GET /checkout/<checkout_id>` - Get checkout status
- `PUT /checkout/<checkout_id>/update` - Update checkout details
- `POST /checkout/<checkout_id>/complete` - Complete checkout with SPT
- `POST /checkout/<checkout_id>/cancel` - Cancel checkout

### Chat & Payment
- `POST /chat` - Process chat messages with LLM
- `POST /exchange_token` - Exchange payment token for SPT

## Configuration

Create `.env` from `.env.example`:
```bash
SELLER_BACKEND_URL=http://localhost:3000     # Seller backend URL
MOCK_STRIPE_SPT_URL=http://localhost:8001    # Mock SPT server URL
CHAT_BACKEND_PORT=9000                       # Port for chat backend
DEBUG=True                                   # Enable debug mode
FACILITATOR_API_KEY="sk_"                    # Not used (only for real Stripe SPT)
DAT1_API_KEY=                                # DAT1 API key for LLM (REQUIRED)
```

## Project Structure

```
chat_backend/
├── server.py           # Flask server
├── acp_client.py       # ACP protocol client
├── config.py           # Configuration
└── requirements.txt    # Dependencies
```