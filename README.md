# Agentic Commerce Protocol (ACP) Implementation
Complete implementation of the Agentic Commerce Protocol with seller backend and chat backend.

## Architecture

```
Chat Frontend (HTML/JS) → Chat Backend (Python/Flask) → Seller Backend (Node.js/Express)
Port: 8000                     Port: 5000                    Port: 3000
```

## Quick Start

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
- `GET /products` - List products
- `POST /checkouts` - Create checkout
- `GET /checkouts/:id` - Retrieve checkout
- `PUT /checkouts/:id` - Update checkout
- `POST /checkouts/:id/complete` - Complete checkout
- `POST /checkouts/:id/cancel` - Cancel checkout

### Chat Backend (Port 5000)
- `GET /products` - List products
- `POST /checkout/create` - Create checkout
- `GET /checkout/:id` - Retrieve checkout
- `PUT /checkout/:id/update` - Update checkout
- `POST /checkout/:id/complete` - Complete checkout
- `POST /checkout/:id/cancel` - Cancel checkout

## Documentation

- **Seller Backend**: `seller_backend/README.md`
- **Chat Backend**: `chat_backend/README.md`
- **Chat Frontend**: `chat_frontend/README.md`


## Disclaimer
- Not Production Ready: This code is not designed, tested, or intended for use in production environments. It may contain known bugs, security vulnerabilities, or performance issues.

- No Guarantees: We make no warranties, express or implied, regarding the stability, reliability, or completeness of the code. Use it at your own risk.

- Experimental Nature: Features and APIs are subject to change without notice. This project should not be relied upon for long-term development.