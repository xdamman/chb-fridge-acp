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

**Note**: Seller backend must be running first on `http://localhost:3000`

Server starts on `http://localhost:5000`

## API Endpoints

- `GET /products` - List products
- `POST /checkout/create` - Create checkout
- `GET /checkout/:id` - Get checkout
- `PUT /checkout/:id/update` - Update checkout
- `POST /checkout/:id/complete` - Complete checkout
- `POST /checkout/:id/cancel` - Cancel checkoute

## Configuration

Edit `.env`:
- `SELLER_BACKEND_URL` - Seller backend URL (default: http://localhost:3000)
- `CHAT_BACKEND_PORT` - Port (default: 5000)
- `DEBUG` - Debug mode (default: True)

## Project Structure

```
chat_backend/
├── server.py           # Flask server
├── acp_client.py       # ACP protocol client
├── config.py           # Configuration
└── requirements.txt    # Dependencies
```